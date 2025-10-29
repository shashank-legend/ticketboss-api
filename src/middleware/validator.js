const Joi = require('joi');
const { 
  MAX_SEATS_PER_RESERVATION, 
  MIN_SEATS_PER_RESERVATION,
  MAX_PARTNER_ID_LENGTH,
  HTTP_STATUS 
} = require('../utils/constants');

// Validation schema for reservation creation
const reservationSchema = Joi.object({
  partnerId: Joi.string()
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

/**
 * Middleware to validate reservation request
 */
const validateReservation = (req, res, next) => {
  const { error, value } = reservationSchema.validate(req.body, {
    abortEarly: false // Return all validation errors
  });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: errorMessages.join(', ')
    });
  }
  
  // Replace request body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = {
  validateReservation
};
