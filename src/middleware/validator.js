const Joi = require('joi');
const {
  MAX_SEATS_PER_RESERVATION,
  MIN_SEATS_PER_RESERVATION,
  MAX_PARTNER_ID_LENGTH,
  MAX_EVENT_SEATS,
  HTTP_STATUS
} = require('../utils/constants');

// Validation schema for reservation creation
const reservationSchema = Joi.object({
  partnerId: Joi.string()
    .trim()
    .min(1)
    .max(MAX_PARTNER_ID_LENGTH)
    .required()
    .messages({
      'string.empty': 'partnerId cannot be empty',
      'string.max': `partnerId must not exceed ${MAX_PARTNER_ID_LENGTH} characters`,
      'any.required': 'partnerId is required'
    }),

  seats: Joi.number()
    .integer()
    .min(MIN_SEATS_PER_RESERVATION)
    .max(MAX_SEATS_PER_RESERVATION)
    .required()
    .messages({
      'number.base': 'seats must be a number',
      'number.integer': 'seats must be an integer',
      'number.min': `seats must be at least ${MIN_SEATS_PER_RESERVATION}`,
      'number.max': `seats must not exceed ${MAX_SEATS_PER_RESERVATION}`,
      'any.required': 'seats is required'
    }),

  eventId: Joi.string()
    .optional()
});

// Validation schema for event creation
const eventSchema = Joi.object({
  eventId: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100)
    .optional()
    .messages({
      'string.pattern.base': 'eventId may only contain lowercase letters, numbers and dashes'
    }),

  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'name cannot be empty',
      'any.required': 'name is required'
    }),

  totalSeats: Joi.number()
    .integer()
    .min(1)
    .max(MAX_EVENT_SEATS)
    .required()
    .messages({
      'number.base': 'totalSeats must be a number',
      'number.min': 'totalSeats must be at least 1',
      'number.max': `totalSeats must not exceed ${MAX_EVENT_SEATS}`,
      'any.required': 'totalSeats is required'
    })
});

const makeValidator = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false // Return all validation errors
  });

  if (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.details.map(detail => detail.message).join(', ')
    });
  }

  // Replace request body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = {
  reservationSchema,
  eventSchema,
  validateReservation: makeValidator(reservationSchema),
  validateEvent: makeValidator(eventSchema)
};
