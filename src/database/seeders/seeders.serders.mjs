import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { Users } from "../../app/models/users.models.mjs";
import connectDB from "../db.databases.mjs";

dotenv.config();

const seedUsers = async () => {
  try {
    const targetEmail = "zongowseymond@gmail.com";

    // Connect to DB
    await connectDB();

    // Check if a user with the email already exists
    const existingUser = await Users.findOne({ email: targetEmail });

    if (existingUser) {
      console.log("⚠️ User with this email already exists. Deleting...");
      await Users.deleteOne({ email: targetEmail });
      console.log("✅ Existing user deleted.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("Seymond#70", 12);

    // Create new admin user
    const adminUser = new Users({
      uuid: uuidv4(),
      firstName: "Simeon",
      lastName: "ZONGO",
      email: targetEmail,
      password: hashedPassword,
      isVerified: true,
      role: "admin",
      accountStatus: "active",
    });

    await adminUser.save();

    console.log("✅ Admin account created successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedUsers();
