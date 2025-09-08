import mongoose from "mongoose";

const userModel = mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    googleId: { type: String },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    verificationToken: String,
    verificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshToken: { type: String, unique: true, sparse: true },
    loginAttempts: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    profileImage: { type:String, default: null },
    isOnline: {type: Boolean,default: false},
    socketId: {type: String,default: null},
    lastSeen: {type: Date,default: null},
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated", "pending"],
    },
    lastLoginIp: { type: String }, // New field for storing IP address
    
  },

  { timestamps: true }
);

const Users = mongoose.model("Users", userModel);
export { Users };
