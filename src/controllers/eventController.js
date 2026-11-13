const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const { DEFAULT_EVENT_ID, HTTP_STATUS, ERRORS } = require('../utils/constants');

const formatEvent = (event) => ({
  eventId: event.event_id,
  name: event.name,
  totalSeats: event.total_seats,
  availableSeats: event.available_seats,
  version: event.version,
  ...(event.reservation_count !== undefined && { reservationCount: event.reservation_count }),
  createdAt: event.created_at
});

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'event';

class EventController {
  /**
   * Bootstrap/reset the default event (restores seats, clears its reservations)
   * GET /api/events/bootstrap
   */
  static async bootstrap(req, res, next) {
    try {
      const event = await Event.bootstrap({
        eventId: DEFAULT_EVENT_ID,
        name: 'Node.js Meet-up',
        totalSeats: 500
      });

      return res.status(HTTP_STATUS.OK).json({
        message: 'Event initialized successfully',
        event: formatEvent(event)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new event
   * POST /api/events
   */
  static async create(req, res, next) {
    const { name, totalSeats } = req.body;
    const eventId = req.body.eventId || slugify(name);

    try {
      const event = await Event.create({ eventId, name, totalSeats });
      if (!event) {
        return res.status(HTTP_STATUS.CONFLICT).json({ error: ERRORS.EVENT_EXISTS });
      }
      return res.status(HTTP_STATUS.CREATED).json(formatEvent({ ...event, reservation_count: 0 }));
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

      return res.status(HTTP_STATUS.OK).json(
        formatEvent({ ...event, reservation_count: reservationCount })
      );
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
        events: events.map(formatEvent)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
