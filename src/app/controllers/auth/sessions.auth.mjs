import { checkTokenCooldown, maskEmailCustom } from "../../../utils/functions/helpers.functions.mjs";
import { Users } from "../../models/users.models.mjs";
import jwt from "jsonwebtoken";

// ============================
// SESSIONS ENDPOINT (UUID-based)
// ============================
export const sessions = async (req, res) => {
  const { uuid } = req.params;
  
  try {
    let authToken, decoded, user;
    
    // First, try to get session token from cookies/headers (normal session flow)
    authToken = req.cookies.authToken || req.headers.authorization?.split(" ")[1];
    
    if (authToken) {
      try {
        decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        
        // Find user - could be by UUID from token or direct UUID
        let userUuid = decoded.uuid;
        
        // If the URL param doesn't match the token's UUID, check if URL param is the user's UUID
        if (userUuid !== uuid) {
          // Check if uuid parameter is actually the user's UUID (direct UUID access)
          const userByUuid = await Users.findOne({ uuid });
          if (userByUuid && userByUuid.uuid === userUuid) {
            // Valid: session token belongs to the user being accessed
          } else {
            return res.status(403).json({
              status: "failure",
              message: "Access denied, data mismatch",
            });
          }
        }
        
        user = await Users.findOne({ uuid: userUuid });
        if (!user) {
          return res.status(404).json({
            status: "failure",
            message: "User not found",
          });
        }
        
        // Check session age for session tokens (30 minutes)
        const sessionMaxAgeMs = 30 * 60 * 1000;
        const tokenIssuedAtMs = decoded.iat * 1000;
        const sessionAgeMs = Date.now() - tokenIssuedAtMs;
        
        if (sessionAgeMs > sessionMaxAgeMs) {
          return res.status(440).json({
            status: "failure",
            message: "Session expired",
          });
        }
        
      } catch (sessionError) {
        console.log("Session token error:", sessionError.message);
        authToken = null;
      }
    }
    
    // If no valid session token, check if the UUID parameter is actually a verification token
    if (!authToken) {
      try {
        // Try to verify the UUID parameter as a JWT token (when clicking email links)
        const tokenDecoded = jwt.verify(uuid, process.env.JWT_SECRET);
        
        if (tokenDecoded.uuid) {
          // Find user by the UUID from the token payload
          user = await Users.findOne({ uuid: tokenDecoded.uuid });
          if (!user) {
            return res.status(404).json({
              status: "failure",
              message: "User not found",
            });
          }
          
          // Verify this token is actually associated with the user
          const currentTime = Date.now();
          const isValidVerificationToken = user.verificationToken === uuid && 
            user.verificationExpires && 
            user.verificationExpires > currentTime;
            
          const isValidResetToken = user.passwordResetToken === uuid && 
            user.passwordResetExpires && 
            user.passwordResetExpires > currentTime;
          
          if (!isValidVerificationToken && !isValidResetToken) {
            return res.status(400).json({
              status: "failure",
              message: "Token is invalid or expired",
            });
          }
          
          // Create a new session for this verification/reset process
          const sessionToken = generateAuthToken({ uuid: user.uuid }, "30m");
          setAuthCookie(res, sessionToken, 30);
          
          decoded = tokenDecoded;
          decoded.iat = Math.floor(Date.now() / 1000);
          
        } else {
          throw new Error("Invalid token structure");
        }
        
      } catch (tokenError) {
        console.log("Token verification error:", tokenError.message);
        
        // Final attempt: check if uuid is a direct user UUID (for direct access)
        try {
          user = await Users.findOne({ uuid });
          if (!user) {
            return res.status(404).json({
              status: "failure",
              message: "User not found",
            });
          }
          
          // No valid session for direct UUID access
          return res.status(401).json({
            status: "failure",
            message: "Authentication required. Please log in or use the verification link from your email.",
          });
          
        } catch (directUuidError) {
          return res.status(401).json({
            status: "failure",
            message: "No valid session or verification token found",
          });
        }
      }
    }
    
    if (!user) {
      return res.status(404).json({
        status: "failure",
        message: "User not found",
      });
    }

    // Calculate cooldown based on the decoded token's issued time
    const remainingCooldown = checkTokenCooldown(decoded, 60);

    // Determine session type and validate active processes
    const currentTime = Date.now();
    const hasActiveVerification = user.verificationToken && 
      user.verificationExpires && 
      user.verificationExpires > currentTime && 
      !user.isVerified;

    const hasActivePasswordReset = user.passwordResetToken && 
      user.passwordResetExpires && 
      user.passwordResetExpires > currentTime &&
      user.isVerified;

    // If user is already verified and no active reset, return verified status
    if (user.isVerified && !hasActivePasswordReset) {
      return res.status(200).json({
        status: "verified",
        message: "Your account is already verified.",
        uuid: user.uuid,
        email: maskEmailCustom(user.email),
        isVerified: true
      });
    }

    let sessionType, sessionMessage, sessionData;

    if (hasActiveVerification) {
      sessionType = "verification";
      sessionMessage = `A verification email has been sent to ${user.email}. Please check your inbox.`;
      sessionData = {
        email: maskEmailCustom(user.email),
        tokenExpires: user.verificationExpires,
        isVerified: user.isVerified
      };
    } else if (hasActivePasswordReset) {
      sessionType = "reset";
      sessionMessage = `A password reset email has been sent to ${user.email}. Please check your inbox.`;
      sessionData = {
        email: maskEmailCustom(user.email),
        tokenExpires: user.passwordResetExpires,
        isVerified: user.isVerified
      };
    } else {
      return res.status(400).json({
        status: "failure",
        message: "No active verification or reset process found.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: sessionMessage,
      sessionType: sessionType,
      time: decoded.iat * 1000,
      cooldown: remainingCooldown,
      uuid: user.uuid,
      ...sessionData
    });

  } catch (error) {
    console.error("sessions error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: "failure",
        message: "Invalid token",
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: "failure",
        message: "Token expired",
      });
    }

    return res.status(500).json({
      status: "failure",
      message: "Server error",
    });
  }
};
// ============================
// CHECK VERIFICATION STATUS - FIXED
// ============================
export const checkVerificationStatus = async (req, res) => {
  const { uuid } = req.params;
  
  try {
    let user;
    let isTokenMode = false;
    
    // First, try to find user by UUID (session mode)
    user = await Users.findOne({ uuid }, "isVerified email firstName lastName verificationToken verificationExpires passwordResetToken passwordResetExpires");
    
    // If not found by UUID, check if the parameter might be a token
    if (!user) {
      try {
        const decoded = jwt.verify(uuid, process.env.JWT_SECRET);
        if (decoded.uuid) {
          user = await Users.findOne({ uuid: decoded.uuid }, "isVerified email firstName lastName verificationToken verificationExpires passwordResetToken passwordResetExpires");
          isTokenMode = true;
        }
      } catch (tokenError) {
        // Not a valid token, continue with UUID lookup failure
      }
    }

    if (!user) {
      return res.status(404).json({
        status: "failure",
        error: "User not found",
      });
    }

    const currentTime = Date.now();
    const hasActiveVerification = user.verificationToken && 
      user.verificationExpires && 
      user.verificationExpires > currentTime && 
      !user.isVerified;

    const hasActivePasswordReset = user.passwordResetToken && 
      user.passwordResetExpires && 
      user.passwordResetExpires > currentTime &&
      user.isVerified;

    let processType = null;
    if (hasActiveVerification) {
      processType = "verification";
    } else if (hasActivePasswordReset) {
      processType = "reset";
    }

    res.status(200).json({
      status: "success",
      isVerified: user.isVerified,
      processType: processType,
      mode: isTokenMode ? "token" : "session" // Help frontend understand the context
    });

  } catch (error) {
    console.error("checkVerificationStatus error:", error);
    res.status(500).json({
      status: "failure",
      error: "Server error",
    });
  }
};

// ============================
// NEW: TOKEN INFO ENDPOINT
// ============================
export const getTokenInfo = async (req, res) => {
  const { token } = req.params;
  
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.uuid) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid token format",
      });
    }

    // Find user by UUID from token
    const user = await Users.findOne({ uuid: decoded.uuid }, "isVerified email firstName lastName verificationToken verificationExpires passwordResetToken passwordResetExpires");
    
    if (!user) {
      return res.status(404).json({
        status: "failure",
        message: "User not found",
      });
    }

    const currentTime = Date.now();
    
    // Check if this token matches current verification token
    const isVerificationToken = user.verificationToken === token && 
      user.verificationExpires && 
      user.verificationExpires > currentTime;
      
    // Check if this token matches current reset token  
    const isResetToken = user.passwordResetToken === token && 
      user.passwordResetExpires && 
      user.passwordResetExpires > currentTime;

    if (!isVerificationToken && !isResetToken) {
      return res.status(400).json({
        status: "failure",
        message: "Token is invalid or expired",
      });
    }

    let tokenType = isVerificationToken ? "verification" : "reset";
    let tokenExpires = isVerificationToken ? user.verificationExpires : user.passwordResetExpires;

    res.status(200).json({
      status: "success",
      uuid: user.uuid,
      email: maskEmailCustom(user.email),
      tokenType: tokenType,
      tokenExpires: tokenExpires,
      isVerified: user.isVerified,
      isValid: true
    });

  } catch (error) {
    console.error("getTokenInfo error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        status: "failure",
        message: "Invalid token",
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        status: "failure",
        message: "Token expired",
      });
    }

    res.status(500).json({
      status: "failure",
      message: "Server error",
    });
  }
};

// ============================
// VERIFICATION ENDPOINT - Enhanced
// ============================
// export const verifyEmail = async (req, res) => {
//   const { token } = req.params;
  
//   try {
//     // Verify and decode the token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     if (!decoded.uuid) {
//       return res.status(400).json({
//         status: "failure",
//         error: "Invalid token format",
//       });
//     }

//     // Find user
//     const user = await Users.findOne({ uuid: decoded.uuid });
    
//     if (!user) {
//       return res.status(404).json({
//         status: "failure",
//         error: "User not found",
//       });
//     }

//     // Check if user is already verified
//     if (user.isVerified) {
//       return res.status(200).json({
//         status: "success",
//         message: "Email is already verified",
//         alreadyVerified: true
//       });
//     }

//     // Verify the token matches and isn't expired
//     if (user.verificationToken !== token) {
//       return res.status(400).json({
//         status: "failure",
//         error: "Invalid verification token",
//       });
//     }

//     if (user.verificationExpires < Date.now()) {
//       return res.status(400).json({
//         status: "failure",
//         error: "Verification token has expired",
//       });
//     }

//     // Update user verification status
//     await Users.findByIdAndUpdate(user._id, {
//       isVerified: true,
//       accountStatus: "active",
//       verificationToken: null,
//       verificationExpires: null,
//       verifiedAt: new Date()
//     });

//     return res.status(200).json({
//       status: "success",
//       message: "Email verified successfully",
//       uuid: user.uuid
//     });

//   } catch (error) {
//     console.error("Email verification error:", error);
    
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(400).json({
//         status: "failure",
//         error: "Invalid token",
//       });
//     }
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(400).json({
//         status: "failure",
//         error: "Token expired",
//       });
//     }

//     return res.status(500).json({
//       status: "failure",
//       error: "Server error",
//     });
//   }
// };