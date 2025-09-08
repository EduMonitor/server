import jwt from "jsonwebtoken";
import { Users } from "../../models/users.models.mjs";
import { generateAuthToken } from "../../middlewares/jwt.middleware.mjs";

const refresh = async (req, res) => {
  const refreshToken = req.cookies.jwt;
  if (!refreshToken) {
    return res.status(401).json({
      message: "Jeton de rafraîchissement manquant.",
      status: "unauthorized",
    });
  }

  try {
    const user = await Users.findOne({ refreshToken });
    if (!user) {
      return res.status(403).json({
        message: "Accès interdit. Jeton non reconnu.",
        status: "forbidden",
      });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err || user.uuid !== decoded.uuid) {
        return res.status(403).json({
          message: "Jeton invalide ou utilisateur non autorisé.",
          status: "forbidden",
        });
      }

      const newAccessToken = generateAuthToken(
        { uuid: user.uuid, role: user.role },
        "1d"
      );

      // Remplacer l'ancien jeton par le nouveau
      user.refreshToken = newAccessToken;
      await user.save();

      res.cookie("jwt", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 1 jour
      });

      res.json({
        accessToken: newAccessToken,
        role: user.role,
        message: "Nouveau jeton d'accès généré avec succès.",
        status: "success",
      });
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) console.error(error);

    res.status(500).json({
      message: isProduction
        ? "Une erreur interne du serveur est survenue."
        : `Erreur serveur : ${error.message}`,
      status: "error",
    });
  }
};

export { refresh };
