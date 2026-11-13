const pool = require('../config/database');

class Event {
  /**
   * Get event by ID
   * @param {string} eventId
   * @param {object} [db=pool] - pool or transaction client
   */
  static async getById(eventId, db = pool) {
    const result = await db.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new event. Returns null if the eventId already exists.
   */
  static async create({ eventId, name, totalSeats }) {
    const result = await pool.query(
      `INSERT INTO events (event_id, name, total_seats, available_seats, version)
       VALUES ($1, $2, $3, $3, 0)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING *`,
      [eventId, name, totalSeats]
    );
    return result.rows[0] || null;
  }

  /**
   * Initialize/reset an event: restores all seats and clears its reservations
   * so the seat count and reservation list stay consistent.
   */
  static async bootstrap({ eventId, name, totalSeats }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO events (event_id, name, total_seats, available_seats, version)
         VALUES ($1, $2, $3, $3, 0)
         ON CONFLICT (event_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           total_seats = EXCLUDED.total_seats,
           available_seats = EXCLUDED.available_seats,
           version = 0,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [eventId, name, totalSeats]
      );
      await client.query('DELETE FROM reservations WHERE event_id = $1', [eventId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reserve seats with optimistic locking.
   * CRITICAL: the core concurrency control mechanism. The UPDATE only applies
   * if nobody else changed the row since we read it (same version) and there
   * are still enough seats. Returns undefined on conflict.
   */
  static async reserveSeats(eventId, seatsToReserve, currentVersion, db = pool) {
    const result = await db.query(
      `UPDATE events
       SET available_seats = available_seats - $1,
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $2
         AND version = $3
         AND available_seats >= $1
       RETURNING *`,
      [seatsToReserve, eventId, currentVersion]
    );
    return result.rows[0];
  }

  /**
   * Return seats to the pool (used when a reservation is cancelled).
   * Bumps the version so in-flight optimistic reservations re-read state.
   */
  static async releaseSeats(eventId, seats, db = pool) {
    const result = await db.query(
      `UPDATE events
       SET available_seats = LEAST(available_seats + $1, total_seats),
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $2
       RETURNING *`,
      [seats, eventId]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(
      `SELECT e.*,
              COALESCE(COUNT(r.reservation_id) FILTER (WHERE r.status = 'confirmed'), 0)::int
                AS reservation_count
       FROM events e
       LEFT JOIN reservations r ON r.event_id = e.event_id
       GROUP BY e.event_id
       ORDER BY e.created_at DESC`
    );
    return result.rows;
  }
}

module.exports = Event;
