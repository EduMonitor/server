// Joi authValidator schema for creating a user
import Joi from "joi"; // Use default import for Joi

const validator = (user) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(3)
      .max(255)
      .required()
      .label("Prénom")
      .messages({
        "string.empty": "Le prénom est requis.",
        "string.min": "Le prénom doit contenir au moins 3 caractères.",
        "string.max": "Le prénom ne peut pas dépasser 255 caractères.",
        "any.required": "Le prénom est requis.",
      }),

    lastName: Joi.string()
      .min(3)
      .max(255)
      .required()
      .label("Nom")
      .messages({
        "string.empty": "Le nom est requis.",
        "string.min": "Le nom doit contenir au moins 3 caractères.",
        "string.max": "Le nom ne peut pas dépasser 255 caractères.",
        "any.required": "Le nom est requis.",
      }),

    email: Joi.string()
      .email()
      .required()
      .label("Email")
      .messages({
        "string.empty": "L'adresse email est requise.",
        "string.email": "L'adresse email n'est pas valide.",
        "any.required": "L'adresse email est requise.",
      }),

    password: Joi.string()
      .min(6)
      .required()
      .label("Mot de passe")
      .messages({
        "string.min": "Le mot de passe doit contenir au moins 6 caractères.",
        "string.empty": "Le mot de passe est requis.",
        "any.required": "Le mot de passe est requis.",
      }),

    role: Joi.string()
      .valid("admin", "user")
      .optional()
      .label("Rôle")
      .messages({
        "any.only": "Le rôle doit être soit 'admin' soit 'user'.",
      }),
  });

  return schema.validate(user, { abortEarly: false });
};



// Joi authValidator schema for login
const validatorLogin = (user, req) => {
  const schema = Joi.object({
    email: Joi.string()
      .required()
      .messages({
        "string.empty": "Email is Required",
      }),
    password: Joi.string().required(),
  });

  return schema.validate(user, { abortEarly: false });
};

// Joi authValidator schema for reset password
const validatorResetPass = (user, req) => {
  const schema = Joi.object({
    password: Joi.string()
      .min(6)
      .required()
      .label("Password")
      .messages({
        "string.min":"Password must length should be greather than 6",
      }),
    passwordConfirm: Joi.any()
      .valid(Joi.ref("password"))
      .required()
      .label("Password Confirmation")
      .messages({
        "any.only": "Password doesn't correspond",
      }),
  });
  return schema.validate(user, { abortEarly: false });
};

// Joi authValidator schema for forgot password
const validatorForgot = (user, req) => {
  const schema = Joi.object({
    email: Joi.string()
      .required()
      .messages({
        "string.empty": "Email is Required",
      }),
  });

  return schema.validate(user, { abortEarly: false });
};


const updateFieldValidator = (updateData, req) => {
  const schema = Joi.object({
    field: Joi.string()
      .required()
      .messages({
        "string.base": "Le champ doit être une chaîne de caractères.",
        "any.required": "Le champ est requis.",
      }),
    value: Joi.alternatives()
      .try(
        Joi.string()
          .allow(null, "")
          .messages({
            "string.base": "La valeur doit être une chaîne de caractères.",
          }),
        Joi.number()
          .allow(null, "")
          .messages({
            "number.base": "La valeur doit être un nombre.",
          }),
        Joi.boolean()
          .allow(null)
          .messages({
            "boolean.base": "La valeur doit être un booléen.",
          }),
        Joi.object()
          .custom((value, helpers) => {
            if (Buffer.isBuffer(value)) {
              return value;
            }
            return helpers.error("object.base", {
              message: "La valeur doit être un buffer.",
            });
          })
          .allow(null)
      )
      .when("field", {
        is: "profileImage",
        then: Joi.optional(),
        otherwise: Joi.required().messages({
          "any.required": "La valeur est requise.",
        }),
      }),
  });

  return schema.validate(updateData, { abortEarly: false });
};

// Profile data update validator
// Validateur pour la mise à jour des données du profil
const profileDataUpdate = (data) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(3)
      .max(255)
      .required()
      .label("Prénom")
      .messages({
        "string.empty": "Le prénom est requis.",
        "string.min": "Le prénom doit contenir au moins 3 caractères.",
        "string.max": "Le prénom ne peut pas dépasser 255 caractères.",
        "any.required": "Le prénom est requis.",
      }),

    lastName: Joi.string()
      .min(3)
      .max(255)
      .required()
      .label("Nom")
      .messages({
        "string.empty": "Le nom est requis.",
        "string.min": "Le nom doit contenir au moins 3 caractères.",
        "string.max": "Le nom ne peut pas dépasser 255 caractères.",
        "any.required": "Le nom est requis.",
      }),
  });

  return schema.validate(data, { abortEarly: false });
};
// Password update validator
const passwordDataUpate = (data, req) => {
  const schema = Joi.object({
    currentPassword: Joi.string()
      .min(3)
      .max(255)
      .required()
      .label("Mot de passe actuel")
      .messages({
        "string.base": "Le mot de passe actuel doit être une chaîne de caractères.",
        "string.min": "Le mot de passe actuel doit contenir au moins 3 caractères.",
        "string.max": "Le mot de passe actuel ne peut pas dépasser 255 caractères.",
        "any.required": "Le mot de passe actuel est requis.",
      }),

    newPassword: Joi.string()
      .min(6)
      .required()
      .label("Nouveau mot de passe")
      .messages({
        "string.base": "Le nouveau mot de passe doit être une chaîne de caractères.",
        "string.min": "Le nouveau mot de passe doit contenir au moins 6 caractères.",
        "any.required": "Le nouveau mot de passe est requis.",
      }),

    confirmNewPassword: Joi.any()
      .valid(Joi.ref("newPassword"))
      .required()
      .label("Confirmation du mot de passe")
      .messages({
        "any.only": "La confirmation ne correspond pas au nouveau mot de passe.",
        "any.required": "La confirmation du mot de passe est requise.",
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

export {
  validator,
  validatorLogin,
  validatorResetPass,
  validatorForgot,
  passwordDataUpate,
  updateFieldValidator,
  profileDataUpdate,
};
