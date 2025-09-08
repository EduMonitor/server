import express from "express";
import { signUp } from "../../app/controllers/auth/signup.auth.controllers.mjs";
import { forgotEmail } from "../../app/controllers/auth/forgot.auth.controllers.mjs";
import { resendEmail } from "../../app/controllers/auth/resend.auth.controllers.mjs";
import { verifyEmail } from "../../app/controllers/auth/verification.auth.controllers.mjs";
import { verifyPassReset } from "../../app/controllers/auth/reset.auth.controllers.mjs";
import { refresh } from "../../app/controllers/auth/refresh.auth.controllers.mjs";
import { rateLimiter } from "../../app/middlewares/rateLimiter.middlewares.mjs";
import { signin } from "../../app/controllers/auth/signin.auth.controllers.mjs";
import { checkVerificationStatus, getTokenInfo, sessions } from "../../app/controllers/auth/sessions.auth.mjs";
import { validateToken } from "../../app/middlewares/jwt.middleware.mjs";
import { getCurrentUser } from "../../app/controllers/users/users.controllers.mjs";

const authRoute = express.Router();
authRoute.post("/signup",rateLimiter(10), signUp);
authRoute.post("/signin",rateLimiter(5), signin);
authRoute.post("/forgot",rateLimiter(10), forgotEmail);
authRoute.get("/session/:uuid", sessions);
authRoute.get("/check-session/:uuid", checkVerificationStatus);
authRoute.post("/resend/:uuid",rateLimiter(5), resendEmail);
authRoute.get("/verify/:token", verifyEmail);
authRoute.get("/token-info/:token", getTokenInfo);
authRoute.post("/reset-password/:token", verifyPassReset);

///refresh token
authRoute.get("/refresh", refresh)

// /// validate user:
authRoute.get('/auth/validate', validateToken, getCurrentUser)
// authRoute.put("/auth/update-picture", validateToken,authorizeRoles('user','admin'),upload.single("profileImage"),uploadErrorHandler, updateProfile);
// authRoute.put("/auth/update-info", validateToken,authorizeRoles('user','admin'), updateProfileInfo);
// authRoute.put("/auth/update-pass", validateToken,authorizeRoles('user','admin'), updatePasswordInfo);
// authRoute.get("/auth/users", validateToken,authorizeRoles('admin'), getAllsUsers);
// authRoute.get("/auth/users/:id", validateToken,authorizeRoles('admin'), showUser);
// authRoute.delete("/auth/users/:id", validateToken,authorizeRoles('admin'), deleteUser);


export { authRoute };
