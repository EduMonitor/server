import jwt from "jsonwebtoken";
import { Users } from "../../models/users.models.mjs";

// Vérification de l'email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Vérifier le token (lance une erreur si expiré ou invalide)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { uuid } = decoded;

    const user = await Users.findOne({ uuid });
    if (!user) {
      return res.status(400).json({
        message: "Lien invalide.",
        status: "failure",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        message: "Adresse email déjà vérifiée.",
        status: "success",
      });
    }

    // Marquer l'utilisateur comme vérifié
    user.isVerified = true;
    user.accountStatus = "active";
    user.verificationToken = null;
    user.verificationExpires = null;

    await user.save();

    return res.status(200).json({
      message: "Vérification de l'email réussie.",
      action: "verify",
      status: "success",
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "Votre lien de vérification a expiré.",
        status: "failure",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        message: "Lien de vérification invalide.",
        status: "failure",
      });
    }

    if (!isProduction) console.error(error);

    return res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : `Erreur serveur : ${error.message}`,
      status: "error",
    });
  }
};

export { verifyEmail };
