const pool = require('../config/database');
const crypto = require('crypto');
const { STATUS } = require('../utils/constants');

class Reservation {
  /**
   * Create a new reservation
   * @param {object} [db=pool] - pool or transaction client
   */
  static async create(eventId, partnerId, seats, db = pool) {
    const result = await db.query(
      `INSERT INTO reservations (reservation_id, event_id, partner_id, seats, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [crypto.randomUUID(), eventId, partnerId, seats, STATUS.CONFIRMED]
    );
    return result.rows[0];
  }

  static async getByEventId(eventId) {
    const result = await pool.query(
      'SELECT * FROM reservations WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId]
    );
    return result.rows;
  }

  /** Count confirmed reservations for an event */
  static async countByEventId(eventId) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM reservations
       WHERE event_id = $1 AND status = $2`,
      [eventId, STATUS.CONFIRMED]
    );
    return result.rows[0].count;
  }

  static async getById(reservationId, db = pool) {
    const result = await db.query(
      'SELECT * FROM reservations WHERE reservation_id = $1',
      [reservationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Mark a confirmed reservation as cancelled. Returns the updated row, or
   * undefined if it was already cancelled (prevents double-release of seats).
   */
  static async cancel(reservationId, db = pool) {
    const result = await db.query(
      `UPDATE reservations SET status = $1
       WHERE reservation_id = $2 AND status = $3
       RETURNING *`,
      [STATUS.CANCELLED, reservationId, STATUS.CONFIRMED]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
    return result.rows;
  }
}

module.exports = Reservation;
