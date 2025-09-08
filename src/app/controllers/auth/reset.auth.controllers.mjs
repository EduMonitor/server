
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Users } from "../../models/users.models.mjs";
import { handleValidation } from "../../../utils/helpers/handleValidation.helpers.mjs";
import { validatorResetPass } from "../../validators/auths.validators.mjs";

const verifyPassReset = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { uuid } = decoded;

    const user = await Users.findOne({ uuid });
    if (!user) {
      return res.status(400).json({
        message: "Lien invalide.",
        status: "failure",
      });
    }

    const errors = handleValidation(
      validatorResetPass,
      { password, passwordConfirm }
    );
    if (errors) {
      return res
        .status(400)
        .json({ errors, message: "Erreur de validation des champs." });
    }

    // // Comparer ancien mot de passe avec le nouveau
    // const isSamePassword = await bcrypt.compare(password, user.password);
    // if (isSamePassword) {
    //   return res.status(400).json({
    //     message: "Le nouveau mot de passe ne peut pas être identique à l'ancien.",
    //     status: "failure",
    //   });
    // }

    // Hasher et sauvegarder le nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
    user.passwordResetToken = null; // Effacer OTP
    user.passwordResetExpires = null; // Effacer expiration

    await user.save();

    res.status(200).json({
      message: "Mot de passe réinitialisé avec succès.",
      status: "success",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "Votre lien de réinitialisation a expiré.",
        status: "failure",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        message: "Lien de réinitialisation invalide.",
        status: "failure",
      });
    }
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : `Erreur serveur : ${error.message}`,
      status: "error",
    });
  }
};

export { verifyPassReset };
