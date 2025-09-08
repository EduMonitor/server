import { logger } from "../../config/logger.config.mjs";
import { Users } from "../../models/users.models.mjs";


let activeSessions = new Map();

const invalidateSession = (session) => {
  activeSessions.delete(session);
};


const logout = async (req, res) => {
  const cookies = req.cookies;
  const session = req.cookies.session;

  if (!cookies?.jwt) {
    logger.info("Logout attempted without token.");
    return res.status(403).json({ message: "Token missing" });
  }

  const refreshToken = cookies.jwt;

  try {
    const findUser = await Users.findOne({ refreshToken }).exec();

    if (findUser) {
      await Users.updateOne({ refreshToken }, { $unset: { refreshToken: 1 } });
      logger.info(`User ${findUser.email} logged out.`);
    } else {
      logger.warn("No user found with provided token.");
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    res.clearCookie("XSRF", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    invalidateSession(session);
    req.session.destroy(() => {
      res.clearCookie("session");
      return res.sendStatus(204);
    });
  } catch (err) {
    logger.error("Logout error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { logout };
