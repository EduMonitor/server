import { Strategy as FacebookStrategy } from "passport-facebook";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Users } from "../models/users.models.mjs";
import { generateAuthToken } from "../middlewares/jwt.middleware.mjs";


dotenv.config();

const facebookStrategy = new FacebookStrategy(
  {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ["id", "emails", "name", "picture.type(large)"],
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      let user = await Users.findOne({ email });

      if (!user) {
        const defaultPassword = uuidv4();
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        user = await Users.create({
          uuid: uuidv4(),
          facebookId: profile.id,
          email,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName || "",
          password: hashedPassword,
          isVerified: true,
          role: "user",
          profileImage: profile.photos?.[0]?.value || "",
          accountStatus: "active",
        });
      } else if (!user.facebookId) {
        user.facebookId = profile.id;
        await user.save();
      }

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
    } catch (error) {
      done(error);
    }
  }
);

export { facebookStrategy };
