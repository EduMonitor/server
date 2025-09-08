
import jwt from "jsonwebtoken";
import { Users } from "../../models/users.models.mjs";
import { generateAuthToken } from "../../middlewares/jwt.middleware.mjs";
import { verificationEmail } from "../../../resources/views/mail/verification.mail.mjs";
import { resetEmail } from "../../../resources/views/mail/reset.mail.mjs";
import { sendEmail } from "../../mail/verification.mail.mjs";
import { checkTokenCooldown, setAuthCookie } from "../../../utils/functions/helpers.functions.mjs";

export const resendEmail = async (req, res) => {
  const { uuid } = req.params;
  const { type } = req.query; // Optional explicit type
  
  try {
    // Authentication check
    const authToken = req.cookies.authToken || req.headers.authorization?.split(" ")[1];
    if (!authToken) {
      return res.status(401).json({
        status: "failure",
        error: "Session non trouvée",
      });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    if (decoded.uuid !== uuid) {
      return res.status(403).json({
        status: "failure",
        error: "Accès non autorisé",
      });
    }

    // Find user
    const user = await Users.findOne({ uuid });
    if (!user) {
      return res.status(404).json({
        status: "failure",
        error: "Utilisateur introuvable",
      });
    }

    // Determine email type
    let emailType;
    if (type && (type === 'verification' || type === 'reset')) {
      emailType = type;
    } else {
      emailType = !user.isVerified ? 'verification' : 'reset';
    }

    // Validate email type for user state
    if (emailType === 'verification' && user.isVerified) {
      return res.status(400).json({
        status: "failure",
        error: "Le compte est déjà vérifié.",
      });
    }
    if (emailType === 'reset' && !user.isVerified) {
      return res.status(400).json({
        status: "failure",
        error: "Le compte doit être vérifié avant de pouvoir réinitialiser le mot de passe.",
      });
    }

    // Check cooldown
    const remainingCooldown = checkTokenCooldown(decoded, 60);
    if (remainingCooldown > 0) {
      return res.status(429).json({
        status: "failure",
        error: `Veuillez attendre ${Math.ceil(remainingCooldown)} secondes avant de renvoyer l'email`,
        cooldown: remainingCooldown,
      });
    }

    // Generate new tokens
    const newActionToken = generateAuthToken({ uuid: user.uuid }, "10m");
    const newSessionToken = generateAuthToken({ uuid: user.uuid }, "30m");
    const tokenExpires = Date.now() + 10 * 60 * 1000;

    // Process based on email type
    const companyName = process.env.APP_NAME;
    const logoPath = `${process.env.SERVER_URL}/public/logo/logo.png`;
    let emailMessage, emailSubject, successMessage, url;

    if (emailType === 'verification') {
      user.verificationToken = newActionToken;
      user.verificationExpires = tokenExpires;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      
      url = `${process.env.FRONTEND_URL}/auth/verify-email/${newActionToken}`;
      emailMessage = verificationEmail(url, companyName);
      emailSubject = "Vérification de votre compte";
      successMessage = "Email de vérification renvoyé avec succès";

    } else {
      user.passwordResetToken = newActionToken;
      user.passwordResetExpires = tokenExpires;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      
      url = `${process.env.FRONTEND_URL}/auth/reset-password/${newActionToken}`;
      emailMessage = resetEmail(url, companyName);
      emailSubject = "Réinitialisation de mot de passe";
      successMessage = "Email de réinitialisation renvoyé avec succès";
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
        status: "failure",
        error: "Erreur lors de l'envoi de l'email",
      });
    }

    // Update session cookie
    setAuthCookie(res, newSessionToken, 30);

    res.status(200).json({
      status: "success",
      message: successMessage,
      emailType: emailType,
    });

  } catch (error) {
    console.error("resendEmail error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: "failure",
        error: "Token invalide",
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: "failure",
        error: "Session expirée",
      });
    }

    res.status(500).json({
      status: "failure",
      error: "Erreur du serveur",
    });
  }
};

