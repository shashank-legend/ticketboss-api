const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const { DEFAULT_EVENT_ID, HTTP_STATUS, ERRORS } = require('../utils/constants');

class ReservationController {
  /**
   * Create a new reservation
   * POST /api/reservations
   */
  static async create(req, res, next) {
    const { partnerId, seats } = req.body;
    const eventId = req.body.eventId || DEFAULT_EVENT_ID;
    
    try {
      // Step 1: Get current event state
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERRORS.EVENT_NOT_FOUND
        });
      }
      
      // Step 2: Check if enough seats available (optimistic check)
      if (event.available_seats < seats) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: ERRORS.NOT_ENOUGH_SEATS
        });
      }
      
      // Step 3: Attempt to reserve seats with optimistic locking
      const updatedEvent = await Event.reserveSeats(
        eventId,
        seats,
        event.version  // Pass current version for optimistic locking
      );
      
      // Step 4: Check if update succeeded
      if (!updatedEvent) {
        // Version conflict - another request modified the event
        // OR insufficient seats (race condition)
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: ERRORS.NOT_ENOUGH_SEATS
        });
      }
      
      // Step 5: Create reservation record
      const reservation = await Reservation.create(
        eventId,
        partnerId,
        seats
      );
      
      // Step 6: Return success response
      return res.status(HTTP_STATUS.CREATED).json({
        reservationId: reservation.reservation_id,
        seats: reservation.seats,
        status: reservation.status
      });
      
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reservations
   * GET /api/reservations
   */
  static async getAll(req, res, next) {
    try {
      const reservations = await Reservation.getAll();
      
      return res.status(HTTP_STATUS.OK).json({
        count: reservations.length,
        reservations: reservations.map(r => ({
          reservationId: r.reservation_id,
          eventId: r.event_id,
          partnerId: r.partner_id,
          seats: r.seats,
          status: r.status,
          createdAt: r.created_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reservations for a specific event
   * GET /api/reservations/event/:eventId
   */
  static async getByEventId(req, res, next) {
    const { eventId } = req.params;
    
    try {
      const reservations = await Reservation.getByEventId(eventId);
      
      return res.status(HTTP_STATUS.OK).json({
        count: reservations.length,
        eventId: eventId,
        reservations: reservations.map(r => ({
          reservationId: r.reservation_id,
          partnerId: r.partner_id,
          seats: r.seats,
          status: r.status,
          createdAt: r.created_at
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReservationController;
