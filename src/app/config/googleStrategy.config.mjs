
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Users } from "../models/users.models.mjs";
import { generateAuthToken } from "../middlewares/jwt.middleware.mjs";


dotenv.config();

const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // callbackURL: "/auth/google/callback",
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    // proxy: true,
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      let user = await Users.findOne({ email: profile.emails[0].value });
      if (!user) {
        const defaultPassword = uuidv4();
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        user = await Users.create({
          uuid: uuidv4(),
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          password: hashedPassword,
          lastName: profile.name.familyName || "",
          isVerified: true,
          role: "user",
          profileImage: profile.photos?.[0]?.value || "", // ✅ Fixed here
          accountStatus: "active",
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }

      // ✅ Avoid shadowing by renaming JWT tokens
      const payload = { uuid: user.uuid, role: user.role };
      const jwtAccessToken = generateAuthToken(payload, "1h");
      const jwtRefreshToken = generateAuthToken(payload, "1d");

      user.refreshToken = jwtRefreshToken;
      await user.save();

      done(null, {
        user,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
      });
    } catch (err) {
      done(err);
    }
  }
);

export { googleStrategy };
