import Joi from "joi";

export const contactValidator = (data,req) => {
  const schema = Joi.object({
    name: Joi.string().trim().required().messages({
      "string.empty": req.t("validateMessage.string.empty"), // Use req keys for translation
      "any.required": req.t("validateMessage.any.required"),
    }),
    
    email: Joi.string().email().trim().lowercase().required().messages({
      "string.email": req.t("validateMessage.string.email"), // Use req keys for translation
      "string.empty": req.t("validateMessage.string.empty"),
      "any.required": req.t("validateMessage.string.required"),
    }),
    subject: Joi.string().trim().required().messages({
      "string.empty": req.t("validateMessage.string.empty"), // Use req keys for translation
      "any.required": req.t("validateMessage.string.required"),
    }),
    message: Joi.string().trim().required().messages({
      "string.empty": req.t("validateMessage.string.empty"), // Use req keys for translation
      "any.required": req.t("validateMessage.string.required"),
    }),
  });

  return schema.validate(data, { abortEarly: false });
};
