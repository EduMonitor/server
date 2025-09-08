import { verificationEmail } from "../../../resources/views/mail/verification.mail.mjs";
import { setAuthCookie, setRefreshCookie } from "../../../utils/functions/helpers.functions.mjs";
import { logger } from "../../config/logger.config.mjs";
import { sendEmail } from "../../mail/verification.mail.mjs";
import { generateAuthToken } from "../../middlewares/jwt.middleware.mjs";
import {passport} from "../../middlewares/passport.middlewares.mjs"
import { Users } from "../../models/users.models.mjs";

export const signin = async (req, res) => {
  try {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        console.error(`Login error: ${err.message}`);
        return res.status(500).json({ 
          message: "An unexpected server error occurred. Please try again later.",
          status: "error"
        });
      }

      if (!user) {
        console.warn(`Failed login attempt for: ${req.body.email || "unknown"} - ${info.message}`);
        return res.status(401).json({
          message: info.message || "Invalid email or password.",
          remainingAttempts: info.remainingAttempts,
          status: "failure"
        });
      }

      const currentTime = Date.now();

      // Handle unverified users
      if (!user.isVerified) {
        try {
          let verificationToken = user.verificationToken;
          let shouldSendEmail = false;

          // Check if we need to generate/regenerate verification token
          if (!verificationToken || !user.verificationExpires || user.verificationExpires < currentTime) {
            verificationToken = generateAuthToken({ uuid: user.uuid }, "10m");
            const verificationExpires = currentTime + (10 * 60 * 1000);
            
            await Users.updateOne(
              { _id: user._id },
              {
                $set: {
                  verificationToken,
                  verificationExpires
                }
              }
            );

            shouldSendEmail = true;
          }

          // Set session cookie for verification page
          const sessionToken = generateAuthToken({ uuid: user.uuid }, "30m");
          setAuthCookie(res, sessionToken, 30);

          // Send verification email if needed
          if (shouldSendEmail) {
            const url = `${process.env.FRONTEND_URL}/auth/verify-email/${verificationToken}`;
            const companyName = process.env.APP_NAME;
            const logoPath = `${process.env.SERVER_URL}/public/logo/logo.png`;
            const message = verificationEmail(url, companyName);
            
            const emailStatus = await sendEmail(
              user.email,
              "Verify your account",
              message,
              companyName,
              `${user.firstName} ${user.lastName}`,
              logoPath
            );

            if (!emailStatus.success) {
              console.error(`Failed to send verification email to ${user.email}: ${emailStatus.message}`);
            }
          }

          return res.status(200).json({
            message: `A verification email has been sent to ${user.email}. Please check your inbox.`,
            redirectUrl: `/auth/notifications/${user.uuid}`,
            status: "verification_required"
          });

        } catch (verificationError) {
          console.error(`Verification process error: ${verificationError.message}`);
          return res.status(500).json({
            message: "An unexpected server error occurred during verification. Please try again later.",
            status: "error"
          });
        }
      }

      // Handle verified user login
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error(`Login session error: ${loginErr.message}`);
          return res.status(500).json({ 
            message: "An unexpected server error occurred. Please try again later.",
            status: "error"
          });
        }

        try {
          // Generate JWT tokens
          const payload = { 
            uuid: user.uuid, 
            role: user.role,
            iat: Math.floor(currentTime / 1000)
          };
          
          const accessToken = generateAuthToken(payload, "1h");
          const refreshToken = generateAuthToken(payload, "7d");

          // Save refresh token and update last login
          await Users.updateOne(
            { _id: user._id },
            { 
              $set: { 
                refreshToken,
                lastLogin: new Date(currentTime),
                isOnline: true
              } 
            }
          );

          // Set refresh token cookie
          setRefreshCookie(res, refreshToken, 7);

          // Determine redirect URL based on role
         
          const redirectUrl = `/ai/dashboard` || "/dashboard";

          return res.status(200).json({
            data: { 
              role: user.role,
              uuid: user.uuid
            },
            accessToken,
            redirectUrl,
            message: "Login successful.",
            status: "success"
          });

        } catch (tokenError) {
          console.error(`Token generation error: ${tokenError.message}`);
          return res.status(500).json({
            message: "An unexpected server error occurred while generating tokens. Please try again later.",
            status: "error"
          });
        }
      });

    })(req, res);

  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    console.error(`Signin controller error: ${error.message}`);
    
    res.status(500).json({
      message: isProduction 
        ? "An unexpected server error occurred. Please try again later."
        : `Server error: ${error.message}`,
      status: "error",
    });
  }
};

export const sendWelcomeMessage = async (user, admin) => {
  try {
    // Check if there's an existing conversation between the user and the admin
    const existingConversation = await Message.findOne({
      $or: [
        { sender: admin.uuid, receiver: user.uuid },
        { sender: user.uuid, receiver: admin.uuid },
      ],
    });

    let welcomeMessage = "";

    // If no conversation exists, send a welcome message
    if (!existingConversation) {
      welcomeMessage = `Welcome ${user.firstName}! We're glad to have you here.`;
    } else {
      // If there's already a conversation, send a follow-up message
      welcomeMessage = `Welcome back, ${user.firstName}! Glad to see you again.`;
    }

    // Create and save the new message
    const newMessage = new Message({
      sender: admin.uuid, // Admin UUID
      receiver: user.uuid, // User UUID
      name: `${admin.firstName} ${admin.lastName}`, // Company Name (Adjust as needed)
      text: welcomeMessage,
    });

    await newMessage.save();
  } catch (error) {
    console.error("Error sending welcome message:", error);
  }
};
