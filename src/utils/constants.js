// Application constants
module.exports = {
  DEFAULT_EVENT_ID: 'node-meetup-2025',
  
  // Validation constraints
  MAX_SEATS_PER_RESERVATION: 10,
  MIN_SEATS_PER_RESERVATION: 1,
  MAX_PARTNER_ID_LENGTH: 100,
  
  // Status codes
  STATUS: {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled'
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },
  
  // Error messages
  ERRORS: {
    EVENT_NOT_FOUND: 'Event not found',
    NOT_ENOUGH_SEATS: 'Not enough seats left',
    RESERVATION_CONFLICT: 'Reservation conflict. Please try again.',
    INVALID_INPUT: 'Invalid input parameters'
  }
};
