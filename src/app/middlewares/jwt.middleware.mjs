import jwt from "jsonwebtoken";
import { logger } from "../config/logger.config.mjs";
import { Users } from "../models/users.models.mjs";

const generateAuthToken = (payload, expiresIn = "1h") => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    return token;
  } catch (error) {
    logger.error("Error generating auth token:", error);
    throw new Error("Token generation failed");
  }
};

const validateToken = async (req, res, next) => {
  let token =
    req.cookies.jwt ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  if (!token) {
    return res.status(401).json({ message: "Token missing or invalid" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Users.findOne({ uuid: decoded.uuid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Try to get admin UUID — optional
    const admin = await Users.findOne({ role: "admin" }, { uuid: 1 });
    // Sanitize user data
    req.user = {
      _id: user._id,
      uuid: user.uuid,
      email: user.email,
      googleId: user.googleId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      accountStatus: user.accountStatus,
      adminUUID: admin ? admin.uuid : null, // ✅ Optional admin UUID
    };
    next();
  } catch (error) {
    logger.error("Token validation error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token is invalid" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const hasPermission = roles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export { generateAuthToken, validateToken, authorizeRoles };
