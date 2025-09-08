import { resetEmail } from "../../../resources/views/mail/reset.mail.mjs";
import { verificationEmail } from "../../../resources/views/mail/verification.mail.mjs";
import { setAuthCookie } from "../../../utils/functions/helpers.functions.mjs";
import { handleValidation } from "../../../utils/helpers/handleValidation.helpers.mjs";
import { sendEmail } from "../../mail/verification.mail.mjs";
import { generateAuthToken } from "../../middlewares/jwt.middleware.mjs";
import { Users } from "../../models/users.models.mjs";
import { validatorForgot } from "../../validators/auths.validators.mjs";

export const forgotEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // Validation
    const errors = handleValidation(validatorForgot, req.body);
    if (errors) {
      return res.status(400).json({ 
        errors, 
        message: "Erreur de validation des champs.",
        status: "failure"
      });
    }

    // Find user
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: "Cet utilisateur n'est pas enregistré.",
        status: "failure"
      });
    }

    const currentTime = Date.now();
    
    // Check session-based cooldown
    const otpResendCooldown = 60000; // 1 minute
    req.session.otpCooldown = req.session.otpCooldown || {};
    const lastRequestTime = req.session.otpCooldown[user.uuid];

    if (lastRequestTime && currentTime < lastRequestTime + otpResendCooldown) {
      const timeLeft = Math.ceil((lastRequestTime + otpResendCooldown - currentTime) / 1000);
      return res.status(429).json({
        message: `Veuillez patienter ${timeLeft} secondes avant de redemander un lien.`,
        status: "failure",
        cooldown: timeLeft
      });
    }

    // Generate tokens
    const actionToken = generateAuthToken({ uuid: user.uuid }, "10m");
    const sessionToken = generateAuthToken({ uuid: user.uuid }, "30m");
    const tokenExpires = currentTime + 10 * 60 * 1000;

    // Determine email type and process
    const emailType = !user.isVerified ? 'verification' : 'reset';
    const companyName = process.env.APP_NAME;
    const logoPath = `${process.env.SERVER_URL}/public/logo/logo.png`;
    
    let emailMessage, emailSubject, successMessage, url;

    if (emailType === 'verification') {
      user.verificationToken = actionToken;
      user.verificationExpires = tokenExpires;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      url = `${process.env.FRONTEND_URL}/auth/verify-email/${actionToken}`;
      emailMessage = verificationEmail(url, companyName);
      emailSubject = "Vérification de votre adresse email";
      successMessage = `Un lien de vérification a été envoyé à l'adresse ${user.email}. Vérifiez aussi vos courriers indésirables.`;

    } else {
      user.passwordResetToken = actionToken;
      user.passwordResetExpires = tokenExpires;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;

      url = `${process.env.FRONTEND_URL}/auth/reset-password/${actionToken}`;
      emailMessage = resetEmail(url, companyName);
      emailSubject = "Réinitialisation de votre mot de passe";
      successMessage = `Un lien de réinitialisation a été envoyé à l'adresse ${user.email}. Vérifiez aussi vos courriers indésirables.`;
    }

    // Save user and send email
    await user.save();

    const emailStatus = await sendEmail(
      user.email,
      emailSubject,
      emailMessage,
      companyName,
      `${user.firstName} ${user.lastName}`,
      logoPath
    );

    if (!emailStatus.success) {
      return res.status(500).json({ 
        message: emailStatus.message, 
        status: "failure" 
      });
    }

    // Set session cookie and update cooldown
    setAuthCookie(res, sessionToken, 30);
    req.session.otpCooldown[user.uuid] = currentTime;

    return res.status(200).json({
      message: successMessage,
      redirectUrl: `/auth/notifications/${user.uuid}`,
      status: "success",
      emailType: emailType
    });

  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) console.error("forgotEmail error:", error);

    res.status(500).json({
      message: isProduction
        ? "Une erreur interne du serveur est survenue."
        : `Erreur serveur : ${error.message}`,
      status: "error",
    });
  }
};


