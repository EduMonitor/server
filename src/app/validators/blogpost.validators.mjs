import Joi from "joi";

// Joi schema for creating or updating a blog post
export const validateBlogPost = (postData, req, isUpdate = false) => {
  const schema = Joi.object({
    title: Joi.string()
      .min(3)
      .max(255)
      .required()
      .messages({
        "string.base": req.t("blogValidator.titleString"),
        "string.empty": req.t("blogValidator.titleRequired"),
        "string.min": req.t("blogValidator.titleMin"),
        "string.max": req.t("blogValidator.titleMax"),
      }),

    excerpt: Joi.string()
      .max(300)
      .allow("")
      .messages({
        "string.max": req.t("blogValidator.excerptMax"),
      }),

    content: Joi.string()
      .min(10)
      .required()
      .custom((value, helpers) => {
        const plainText = value.replace(/<[^>]*>/g, "").trim();
        if (!plainText || plainText.length < 10) {
          return helpers.error("string.richtextMin");
        }
        return value;
      })
      .messages({
        "string.base": req.t("blogValidator.contentString"),
        "string.empty": req.t("blogValidator.contentRequired"),
        "string.richtextMin": req.t("blogValidator.contentMin"),
      }),

    category: Joi.string()
      .optional()
      .messages({
        "string.base": req.t("blogValidator.categoryString"),
      }),
    status: Joi.string()
      .optional()
      .messages({
        "string.base": req.t("blogValidator.categoryString"),
      }),

    ...(isUpdate
      ? {
          coverImage: Joi.binary().allow(null).messages({
            "binary.base":
              "Le fichier de preuve doit être un fichier valide (image ou PDF).",
          }),
        }
      : {
          coverImage: Joi.any()
            .custom((value, helpers) => {
              if (!value) return helpers.error("any.required");

              const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
              ];
              if (!value.type || !allowedTypes.includes(value.type)) {
                return helpers.message(req.t("blogValidator.imageType"));
              }
              return value;
            })
            .messages({
              "any.required": req.t("blogValidator.imageRequired"),
            }),
        }),
  });

  return schema.validate(postData, { abortEarly: false });
};

// Joi schema for creating or updating a blog post
export const validateComment = (postData, req) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(3)
      .max(255)
      .required()
      .messages({
        "string.empty": req.t("validateMessage.string.empty"),
        "any.required": req.t("validateMessage.string.required"),
      }),

    email: Joi.string()
      .required()
      .messages({
        "string.email": req.t("validateMessage.string.email"), // Use req keys for translation
        "string.empty": req.t("validateMessage.string.empty"),
        "any.required": req.t("validateMessage.string.required"),
      }),
      comment: Joi.string()
      .min(10)
      .required()
      .messages({
        "string.empty": req.t("validateMessage.string.empty"),
        "any.required": req.t("validateMessage.string.required"),
      }),
  });

  return schema.validate(postData, { abortEarly: false });
};
