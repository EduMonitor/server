import Joi from "joi";
import dayjs from "dayjs";

export const validateTrainingApplication = (data, req) => {
  const today = dayjs().startOf("day");
  const minEndDate = today.add(2, "day"); // End date must be at least 2 days from today

  const schema = Joi.object({
    phone: Joi.string()
      .min(7)
      .max(20)
      .required()
      .messages({
        "string.base": req.t("trainingAppValidator.phoneString"),
        "string.empty": req.t("trainingAppValidator.phoneRequired"),
        "string.min": req.t("trainingAppValidator.phoneMin"),
        "string.max": req.t("trainingAppValidator.phoneMax"),
      }),

    techInterest: Joi.array()
      .items(Joi.string())
      .min(1)
      .required()
      .messages({
        "array.base": req.t("trainingAppValidator.techInterestArray"),
        "array.min": req.t("trainingAppValidator.techInterestMin"),
      }),

      trainingTimeSlot: Joi.array()
      .items(
        Joi.object({
          _id: Joi.string().optional(""),
          day: Joi.string().required().messages({
            "string.base": req.t("trainingAppValidator.dayString"),
            "any.required": req.t("trainingAppValidator.dayRequired")
          }),
          startTime: Joi.string().required().messages({
            "string.base": req.t("trainingAppValidator.startTimeString"),
            "any.required": req.t("trainingAppValidator.startTimeRequired")
          }),
          endTime: Joi.string().required().messages({
            "string.base": req.t("trainingAppValidator.endTimeString"),
            "any.required": req.t("trainingAppValidator.endTimeRequired")
          }),
        })
      )
      .required()
      .messages({
        "array.base": req.t("trainingAppValidator.trainingTimeSlotArray"),
      }),
    
    trainingStartDate: Joi.date()
      .optional()
      .allow(null, "")
      .min(today.toDate())
      .messages({
        "date.min": req.t("trainingAppValidator.startDateInPast")
      }),

    trainingEndDate: Joi.date()
      .optional()
      .allow(null, "")
      .custom((value, helpers) => {
        const { trainingStartDate } = helpers.state.ancestors[0];

        if (!value) return value;

        const end = dayjs(value);
        const start = trainingStartDate ? dayjs(trainingStartDate) : null;

        if (end.isBefore(minEndDate)) {
          return helpers.message(req.t("trainingAppValidator.endDateTooSoon"));
        }

        if (start && end.isBefore(start.add(1, "day"))) {
          return helpers.message(req.t("trainingAppValidator.endBeforeStart"));
        }

        return value;
      }),

    preferredSchedule: Joi.string()
      .valid("Weekdays", "Weekends", "Evenings", "Mornings", "Flexible")
      .optional()
      .allow(null)
      .messages({
        "any.only": req.t("trainingAppValidator.invalidSchedule"),
      }),

    modeOfTraining: Joi.string()
      .valid("Online", "Offline", "Hybrid")
      .optional()
      .allow("")
      .messages({
        "any.only": req.t("trainingAppValidator.invalidMode"),
      }),

    location: Joi.string()
      .max(255)
      .optional()
      .allow("")
      .messages({
        "string.base": req.t("trainingAppValidator.locationString"),
      }),

    experienceLevel: Joi.string()
      .valid("Beginner", "Intermediate", "Advanced")
      .optional()
      .messages({
        "any.only": req.t("trainingAppValidator.invalidExperience"),
      }),

    specificInterest: Joi.string()
      .max(500)
      .optional()
      .allow("")
      .messages({
        "string.base": req.t("trainingAppValidator.interestString"),
      }),

    description: Joi.string()
      .max(1000)
      .optional()
      .allow("")
      .messages({
        "string.base": req.t("trainingAppValidator.descriptionString"),
      }),
  });

  return schema.validate(data, { abortEarly: false });
};
