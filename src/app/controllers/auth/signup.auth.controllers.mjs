import { genSalt, hash } from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { handleValidation } from "../../../utils/helpers/handleValidation.helpers.mjs";
import { validator } from "../../validators/auths.validators.mjs";
import { Users } from "../../models/users.models.mjs";
import { generateAuthToken } from "../../middlewares/jwt.middleware.mjs";
import { verificationEmail } from "../../../resources/views/mail/verification.mail.mjs";
import { sendEmail } from "../../mail/verification.mail.mjs";
import { setAuthCookie } from "../../../utils/functions/helpers.functions.mjs";


export const signUp = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  
  try {
    // Validation and existing user check
    const errors = handleValidation(validator, req.body);
    if (errors) {
      return res.status(400).json({
        errors,
        message: "Validation errors in fields",
        status: "failure"
      });
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        errors: { email: "This email is already in use." },
        message: "Email already exists",
        status: "failure"
      });
    }

    // Prepare user data
    const salt = await genSalt(12);
    const hashedPassword = await hash(password, salt);
    const uuid = uuidv4();
    
    // Generate tokens - consistent timing
    const verificationToken = generateAuthToken({ uuid }, "10m");
    const sessionToken = generateAuthToken({ uuid }, "30m");
    const verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const userData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verificationToken,
      verificationExpires,
      uuid,
      isVerified: false,
      accountStatus: "pending",
    };

    // Save user
    const newUser = await Users.create(userData);

    // Send verification email
    const companyName = process.env.APP_NAME;
    const logoPath = `${process.env.SERVER_URL}/public/logo/logo.png`;
    const url = `${process.env.FRONTEND_URL}/auth/verify-email/${verificationToken}`;
    const message = verificationEmail(url, companyName);

    const emailStatus = await sendEmail(
      email,
      "Email Address Verification",
      message,
      companyName,
      `${firstName} ${lastName}`,
      logoPath
    );

    if (!emailStatus.success) {
      console.log("Email send failed:", emailStatus.message);
      // Don't fail registration if email fails, user can resend
    }

    // Set session cookie for verification page
    setAuthCookie(res, sessionToken, 30);

    // Create admin notification
    try {
      const admin = await Users.findOne({ role: "admin" }, "uuid");
      if (admin) {
        await Notification.create({
          uuid: admin.uuid,
          relatedId: newUser._id,
          relatedModel: "Users",
          message: `${newUser.firstName} ${newUser.lastName} created an account.`,
          type: "account",
          read: false,
        });
      }
    } catch (notificationError) {
      console.log("Admin notification failed:", notificationError.message);
    }

    res.status(200).json({
      message: "Account created successfully. Please check your email for verification.",
      redirectUrl: `/auth/notifications/${newUser.uuid}`,
      status: "success"
    });

  } catch (error) {
    console.error("SignUp error:", error);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      message: isProduction ? "Server error" : `Server error: ${error.message}`,
      status: "error",
    });
  }
};

