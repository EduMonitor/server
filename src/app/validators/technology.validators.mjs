import Joi from "joi";

export const techValidator = (user) => {

  const schema = Joi.object({
    name: Joi.string().required(),

    version: Joi.string().optional().allow(null, ""),

    description: Joi.string().optional().allow(null, "")
  });

  return schema.validate(user, { abortEarly: false });
};
