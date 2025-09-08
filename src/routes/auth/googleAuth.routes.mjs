import express from "express";
import {passport} from '../../app/middlewares/passport.middlewares.mjs'
import { logger } from "../../app/config/logger.config.mjs";
import { logout } from "../../app/controllers/auth/logout.auth.controllers.mjs";

const gAuthRoutes = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "https://self-sec.com";
gAuthRoutes.get("/failed", (req, res) => {
  res.status(401).json({ message: "login failed", error: true });
});
gAuthRoutes.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", async (err, data) => {
    if (err) {
      return res.redirect(`${FRONTEND_URL}/auth/failed`);
    }
    if (data) {
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;
      const role = data.user.role;
      const redirectPath = roleBasedUrls[role] || "/";

      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });
      // Redirect with token, role, and redirectUrl as query params
      const url = new URL(`${FRONTEND_URL}/auth/google`);
      url.searchParams.set("token", accessToken);
      url.searchParams.set("role", role);
      url.searchParams.set("redirectUrl", redirectPath);
      // Redirect URL based on user role
      //   const redirectUrl = `${FRONTEND_URL}/auth/google?token=${data.accessToken}&role=${data.user.role}`;
      logger.info(
        `Google login successful: Redirecting user ${data.user.uuid} to ${redirectPath}`
      );
      //   return res.redirect(redirectUrl);
      return res.redirect(url.toString());
    }
    res.redirect(`${FRONTEND_URL}/auth/failed`);
  })(req, res, next);
});

gAuthRoutes.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

gAuthRoutes.get("/api/v2/google", (req, res) => {
  const { token, role, redirectUrl } = req.session;
  return res.status(200).json({ token, role, redirectUrl });
});

gAuthRoutes.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      logger.error("Error during logout:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    // Optional: call your logout controller to handle cookies, DB updates
    logout(req, res);
  });
});

export { gAuthRoutes };
