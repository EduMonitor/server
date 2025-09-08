// passport-strategy.js - Improved Local Strategy without i18n
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { Users } from "../models/users.models.mjs";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000; // 10 minutes
const UNLOCK_BUFFER_TIME = 5 * 1000; // 5 seconds buffer for timing safety

const localStrategy = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
  },
  async (email, password, done) => {
    try {
      // Input validation
      if (!email || !password) {
        return done(null, false, { message: "Email and password are required." });
      }

      // Find user with select optimization for security
      const user = await Users.findOne({ email })
        .select("+password +loginAttempts +isLocked +lockUntil");

      if (!user) {
        // Prevent timing attacks - still hash a dummy password
        await bcrypt.compare(password, "$2b$12$dummy.hash.to.prevent.timing.attacks");
        return done(null, false, { message: "Invalid email or password." });
      }

      const currentTime = Date.now();

      // Check if account is locked and still within lock time
      if (user.isLocked && user.lockUntil && currentTime < (user.lockUntil + UNLOCK_BUFFER_TIME)) {
        const minutesLeft = Math.ceil((user.lockUntil - currentTime) / 60000);
        return done(null, false, {
          message: `Your account is locked. Please try again in ${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"}.`,
        });
      }

      // Unlock account if lock time has expired
      if (user.isLocked && user.lockUntil && currentTime >= user.lockUntil) {
        await Users.updateOne(
          { _id: user._id },
          {
            $unset: { lockUntil: 1 },
            $set: { isLocked: false, loginAttempts: 0 },
          }
        );
        user.isLocked = false;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        const newAttempts = (user.loginAttempts || 0) + 1;

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          // Lock the account
          await Users.updateOne(
            { _id: user._id },
            {
              $set: {
                loginAttempts: newAttempts,
                isLocked: true,
                lockUntil: currentTime + LOCK_TIME,
              },
            }
          );

          return done(null, false, {
            message: "Too many failed login attempts. Your account has been locked for 10 minutes.",
          });
        } else {
          // Increment login attempts
          await Users.updateOne(
            { _id: user._id },
            { $set: { loginAttempts: newAttempts } }
          );

          const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;
          return done(null, false, {
            message: "Invalid email or password.",
            remainingAttempts,
          });
        }
      }

      // Successful login - reset security fields
      if (user.loginAttempts > 0 || user.isLocked) {
        await Users.updateOne(
          { _id: user._id },
          {
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 0, isLocked: false },
          }
        );
      }

      // Remove sensitive data before returning user
      user.password = undefined;
      user.loginAttempts = undefined;
      user.lockUntil = undefined;

      return done(null, user);
    } catch (err) {
      console.error("LocalStrategy error:", err);
      return done(err);
    }
  }
);

export { localStrategy };
