import Joi from "joi"; // Import par défaut de Joi

// Fonction de validation des champs d’un template d’e-mail
const validateEmailInputs = (data) => {
  // Schéma de validation du template e-mail
  const emailTemplateSchema = Joi.object({
    url: Joi.string()
      .uri()
      .required()
      .messages({
        "string.uri": "L'URL n'est pas valide.",
        "any.required": "L'URL est requise.",
      }),
    companyName: Joi.string()
      .max(100)
      .trim()
      .required()
      .messages({
        "string.max": "Le nom de l'entreprise ne peut pas dépasser 100 caractères.",
        "any.required": "Le nom de l'entreprise est requis.",
      }),
  });

  const { error, value } = emailTemplateSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((err) => err.message).join(", ");
    throw new Error(`Données invalides : ${errorMessages}`);
  }

  return value;
};

export { validateEmailInputs };
