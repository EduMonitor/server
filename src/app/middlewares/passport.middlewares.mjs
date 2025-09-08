import passport from "passport";
import dotenv from "dotenv";
import { Users } from "../models/users.models.mjs";
import { facebookStrategy } from "../config/facebookStrategy.mjs";
import { googleStrategy } from "../config/googleStrategy.config.mjs";
import { localStrategy } from "../config/localStrategy.config.mjs";
dotenv.config();

// Configure LocalStrategy
passport.use(localStrategy);
passport.use(googleStrategy);
passport.use(facebookStrategy);


// Serialize user into the sessions
passport.serializeUser((user, done) => {
  done(null, user.uuid);
});

// Deserialize user from the sessions
passport.deserializeUser(async (uuid, done) => {
  try {
    const user = await Users.findOne({ uuid });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export {passport};
