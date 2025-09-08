import express from "express";
import passport from '../../app/middlewares/passport.middlewares.mjs';


const fAuthRoutes = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "https://self-sec.com";

fAuthRoutes.get("/failed", (req, res) => {
  res.status(401).json({ message: "Facebook login failed", error: true });
});

fAuthRoutes.get("/facebook/callback", (req, res, next) => {
  passport.authenticate("facebook", async (err, data) => {
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

      const url = new URL(`${FRONTEND_URL}/auth/facebook`);
      url.searchParams.set("token", accessToken);
      url.searchParams.set("role", role);
      url.searchParams.set("redirectUrl", redirectPath);

      logger.info(
        `Facebook login successful: Redirecting user ${data.user.uuid} to ${redirectPath}`
      );
      return res.redirect(url.toString());
    }
    res.redirect(`${FRONTEND_URL}/auth/failed`);
  })(req, res, next);
});

// Start Facebook login
fAuthRoutes.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// Client route to retrieve token and role
fAuthRoutes.get("/api/v2/facebook", (req, res) => {
  const { token, role, redirectUrl } = req.session;
  return res.status(200).json({ token, role, redirectUrl });
});

// Logout
fAuthRoutes.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      logger.error("Error during logout:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    logout(req, res);
  });
});

export { fAuthRoutes };
