const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const { DEFAULT_EVENT_ID, HTTP_STATUS, ERRORS } = require('../utils/constants');

class EventController {
  /**
   * Bootstrap/Initialize event data
   * GET /api/events/bootstrap
   */
  static async bootstrap(req, res, next) {
    try {
      const eventData = {
        eventId: DEFAULT_EVENT_ID,
        name: 'Node.js Meet-up',
        totalSeats: 500
      };
      
      const event = await Event.bootstrap(eventData);
      
      return res.status(HTTP_STATUS.OK).json({
        message: 'Event initialized successfully',
        event: {
          eventId: event.event_id,
          name: event.name,
          totalSeats: event.total_seats,
          availableSeats: event.available_seats,
          version: event.version
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event summary
   * GET /api/events/:eventId
   */
  static async getSummary(req, res, next) {
    const { eventId } = req.params;
    
    try {
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: ERRORS.EVENT_NOT_FOUND
        });
      }
      
      const reservationCount = await Reservation.countByEventId(eventId);
      
      return res.status(HTTP_STATUS.OK).json({
        eventId: event.event_id,
        name: event.name,
        totalSeats: event.total_seats,
        availableSeats: event.available_seats,
        reservationCount: reservationCount,
        version: event.version
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all events
   * GET /api/events
   */
  static async getAll(req, res, next) {
    try {
      const events = await Event.getAll();
      
      return res.status(HTTP_STATUS.OK).json({
        count: events.length,
        events: events.map(event => ({
          eventId: event.event_id,
          name: event.name,
          totalSeats: event.total_seats,
          availableSeats: event.available_seats,
          version: event.version
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
