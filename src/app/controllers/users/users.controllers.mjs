import { Users } from "../../models/users.models.mjs";
import { passwordDataUpate, profileDataUpdate, updateFieldValidator } from "../../validators/auths.validators.mjs";
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcrypt'

export const getCurrentUser = async (req, res) => {
  try {
    // Ensure that req.user is defined
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    // Log the user data to console
    return res.status(200).json({
      isAuthenticated: true,
      user: req.user,
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};


export const updateProfile = async (req, res) => {
  const { field } = req.body; // Field to be updated
  const { uuid } = req.user; // User ID from the route parameters
  try {
    // Validate the request body
    const { error } = updateFieldValidator(req.body, req);
    if (error) {
      const errors = error.details.reduce((acc, err) => {
        acc[err.path[0]] = err.message;
        return acc; // Change to return acc instead of res
      }, {});
      return res.status(400).json({ errors }); // Send errors response here
    }

    // Check if the user exists
    const existingUser = await Users.findOne({ uuid });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Check if the field exists in the user model
    if (!(field in existingUser._doc)) {
      // Check if the field is valid
      return res.status(400).json({ message: "Champ non valide." });
    }
    // Handle logo upload if file is provided
    // Handle logo upload if file is provided
    if (req.file) {
      // 🗑️ Delete the old profile image if it exists and is not default
      const oldImageUrl = existingUser.profileImage;
      if (oldImageUrl && oldImageUrl.includes("/uploads/")) {
        const oldImagePath = path.join(
          process.cwd(),
          oldImageUrl
            .replace(`${process.env.SERVER_URL}/`, "")
            .replace(/\\/g, "/")
        );
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.warn(
              "⚠️ Échec de la suppression de l'ancienne image:",
              err.message
            );
          }
        }
      }

      const tempFilePath = req.file.path;
      const targetDirectory = path.join("uploads", "profiles");
      fs.mkdirSync(targetDirectory, { recursive: true });

      const newFileName = `profiles-${Date.now()}.jpeg`;
      const finalFilePath = path.join(targetDirectory, newFileName);

      // Compress image without resizing
      await sharp(tempFilePath)
        .withMetadata()
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(finalFilePath);

      // Try to delete the temp file, but don't block the process if it fails
      fs.unlink(tempFilePath, (err) => {
        if (err) {
          console.warn("⚠️ Failed to delete temp file:", err.message);
        }
      });

      const image = `${process.env.SERVER_URL}/${finalFilePath.replace(
        /\\/g,
        "/"
      )}`;
      existingUser[field] = image; // Update the user field with the image
    } else {
      existingUser[field] = null; // Set field to null if no image is provided
    }

    // Save the updated user document
    const profileImage = await existingUser.save();

    return res.status(200).json({
      message: "Profil mis à jour avec succès.",
      profileImage: profileImage.profileImage,
    }); // Success response
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    }); // Server error response
  }
};

export const updateProfileInfo = async (req, res) => {
  const { lastName, firstName } = req.body; // Fields and values to update
  const { uuid } = req.user; // User ID from the route parameters
  try {
    // **Joi Validation**: Validate the fields and values with Joi
    const { error } = profileDataUpdate(req.body, req);
    if (error) {
      const errors = error.details.reduce((acc, err) => {
        acc[err.path[0]] = err.message;
        return acc;
      }, {});
      return res.status(400).json({ errors });
    }
    // Check if the user exists
    const existingUser = await Users.findOne({ uuid });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    // Update the fields
    existingUser.firstName = firstName; // Update first field
    existingUser.lastName = lastName; // Update second field
    await existingUser.save(); // Save the updated user to the database

    return res.status(200).json({
      message: "Utilisateur mis à jour avec succès.",
      user: existingUser,
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};

export const updatePasswordInfo = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body; // Fields and values to update
  const { uuid } = req.user; // User ID from the route parameters
  try {
    // Joi Validation for input data
    const { error } = passwordDataUpate(req.body, req);
    if (error) {
      const errors = error.details.reduce((acc, err) => {
        acc[err.path[0]] = err.message;
        return acc;
      }, {});
      return res.status(400).json({ errors });
    }

    // Find the user by ID
    const existingUser = await Users.findOne({ uuid });
    if (!existingUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Validate current password
    const validPassword = await bcrypt.compare(
      currentPassword,
      existingUser.password
    );
    if (!validPassword) {
      return res
        .status(403)
        .json({ message: "Mot de passe actuel incorrect." });
    }

    // Confirm new passwords match
    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas." });
    }

    // Check if the new password is different from the current password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      existingUser.password
    );
    if (isSamePassword) {
      return res.status(400).json({
        message: "Le nouveau mot de passe doit être différent de l'actuel.",
        errors: {
          newPassword:
            "Le nouveau mot de passe doit être différent de l'actuel.",
          currentPassword:
            "Le mot de passe actuel est le même que le nouveau mot de passe.",
        },
      });
    }

    // Hash and update the password
    const salt = await bcrypt.genSalt(12);
    existingUser.password = await bcrypt.hash(newPassword, salt);
    await existingUser.save();

    return res.status(200).json({
      message: "Mot de passe mis à jour avec succès.",
      user: existingUser,
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};

export const getAllsUsers = async (req, res) => {
  const { uuid } = req.user;
  try {
    const existUser = await Users.findOne({ uuid, role: "admin" });

    if (!existUser) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit d'effectuer cette opération.",
      });
    }
    const users = await Users.find({ role: "user" })
      .sort({ createdAt: -1 })
      .select("-password -refreshToken -__v")
      .lean();
    return res.status(200).json({ data: users });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};
export const showUser = async (req, res) => {
  const { uuid } = req.user;
  const { id } = req.params;
  try {
    const existUser = await Users.findOne({ uuid, role: "admin" });
    if (!existUser) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit d'effectuer cette opération.",
      });
    }
    const users = await Users.findOne({ role: "user", uuid: id })
      .select("-password -refreshToken -__v")
      .lean();
    return res.status(200).json({ data: users });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  const { uuid } = req.user;
  const { id } = req.params;
  try {
    const existUser = await Users.findOne({ uuid, role: "admin" });
    if (!existUser) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit d'effectuer cette opération.",
      });
    }
    const user = await Users.findOne({ uuid: id, role: "user" });
    if (!user) {
      return res.status(404).json({
        message: "Utilisateur non trouvé.",
      });
    }
    if (user?.profileImage && user?.profileImage?.includes("/uploads/")) {
      const imagePath = path.join(
        process.cwd(),
        user.profileImage
          .replace(`${process.env.SERVER_URL}/`, "")
          .replace(/\\/g, "/")
      );
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    // 🗑️ Delete the profile image if it exists and is not default
    await Promise.all([
      Users.deleteOne({ uuid: id }),
      trainingApplication.deleteMany({ userId: user._id }),
      TrainingSessionTracking.deleteMany({ userId: user._id }),
      Notification.deleteMany({ uuid: id }),
      Message.deleteMany({ $or: [{ sender: id }, { receiver: id }] }),
    ]);
    return res
      .status(200)
      .json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    !isProduction && console.error(error);
    res.status(500).json({
      message: isProduction
        ? "Erreur serveur."
        : "Erreur serveur : " + error.message,
    });
  }
};
