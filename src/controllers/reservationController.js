const pool = require('../config/database');
const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const {
  DEFAULT_EVENT_ID,
  HTTP_STATUS,
  ERRORS,
  MAX_RESERVATION_RETRIES
} = require('../utils/constants');

// Random, growing pause between retries so competing requests spread out
// instead of colliding again on the same version.
const backoff = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * Math.min(50, 2 + attempt * 4)));

const formatReservation = (r) => ({
  reservationId: r.reservation_id,
  eventId: r.event_id,
  partnerId: r.partner_id,
  seats: r.seats,
  status: r.status,
  createdAt: r.created_at
});

class ReservationController {
  /**
   * Create a new reservation using optimistic concurrency control.
   * POST /api/reservations
   *
   * Read the event + version, then conditionally decrement seats in the same
   * transaction as the reservation insert. On a version conflict (someone else
   * booked in between) we re-read and retry (with jittered backoff) before giving up.
   */
  static async create(req, res, next) {
    const { partnerId, seats } = req.body;
    const eventId = req.body.eventId || DEFAULT_EVENT_ID;

    try {
      for (let attempt = 0; attempt < MAX_RESERVATION_RETRIES; attempt++) {
        if (attempt > 0) await backoff(attempt);
        const event = await Event.getById(eventId);

        if (!event) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERRORS.EVENT_NOT_FOUND });
        }

        if (event.available_seats < seats) {
          return res.status(HTTP_STATUS.CONFLICT).json({ error: ERRORS.NOT_ENOUGH_SEATS });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const updatedEvent = await Event.reserveSeats(eventId, seats, event.version, client);

          if (!updatedEvent) {
            // Version conflict: another request changed the event. Retry.
            await client.query('ROLLBACK');
            continue;
          }

          const reservation = await Reservation.create(eventId, partnerId, seats, client);
          await client.query('COMMIT');

          return res.status(HTTP_STATUS.CREATED).json({
            ...formatReservation(reservation),
            availableSeats: updatedEvent.available_seats
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      // Still conflicting after all retries: report contention
      return res.status(HTTP_STATUS.CONFLICT).json({ error: ERRORS.RESERVATION_CONFLICT });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a reservation and release its seats back to the event.
   * DELETE /api/reservations/:reservationId
   */
  static async cancel(req, res, next) {
    const { reservationId } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cancelled = await Reservation.cancel(reservationId, client);

      if (!cancelled) {
        await client.query('ROLLBACK');
        const existing = await Reservation.getById(reservationId);
        return existing
          ? res.status(HTTP_STATUS.GONE).json({ error: ERRORS.ALREADY_CANCELLED })
          : res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERRORS.RESERVATION_NOT_FOUND });
      }

      const event = await Event.releaseSeats(cancelled.event_id, cancelled.seats, client);
      await client.query('COMMIT');

      return res.status(HTTP_STATUS.OK).json({
        ...formatReservation(cancelled),
        availableSeats: event ? event.available_seats : undefined
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      // Malformed UUID -> 404 rather than 500
      if (error.code === '22P02') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: ERRORS.RESERVATION_NOT_FOUND });
      }
      next(error);
    } finally {
      client.release();
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
        reservations: reservations.map(formatReservation)
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
        eventId,
        reservations: reservations.map(formatReservation)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReservationController;
