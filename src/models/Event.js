const pool = require('../config/database');

class Event {
  /**
   * Get event by ID
   * @param {string} eventId - The event identifier
   * @returns {Promise<Object|null>} Event object or null if not found
   */
  static async getById(eventId) {
    const query = 'SELECT * FROM events WHERE event_id = $1';
    
    try {
      const result = await pool.query(query, [eventId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  /**
   * Initialize/Bootstrap event data
   * @param {Object} eventData - Event information
   * @returns {Promise<Object>} Created or updated event
   */
  static async bootstrap(eventData) {
    const { eventId, name, totalSeats } = eventData;
    
    const query = `
      INSERT INTO events (event_id, name, total_seats, available_seats, version)
      VALUES ($1, $2, $3, $3, 0)
      ON CONFLICT (event_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        total_seats = EXCLUDED.total_seats,
        available_seats = EXCLUDED.available_seats,
        version = 0,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [eventId, name, totalSeats]);
      return result.rows[0];
    } catch (error) {
      console.error('Error bootstrapping event:', error);
      throw error;
    }
  }

  /**
   * Reserve seats with optimistic locking
   * CRITICAL: This is the core concurrency control mechanism
   * @param {string} eventId - The event identifier
   * @param {number} seatsToReserve - Number of seats to reserve
   * @param {number} currentVersion - Current version for optimistic locking
   * @returns {Promise<Object|undefined>} Updated event or undefined if conflict
   */
  static async reserveSeats(eventId, seatsToReserve, currentVersion) {
    const query = `
      UPDATE events 
      SET available_seats = available_seats - $1,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $2 
        AND version = $3 
        AND available_seats >= $1
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        seatsToReserve,
        eventId,
        currentVersion
      ]);
      
      // Returns undefined if no rows updated (version conflict or insufficient seats)
      return result.rows[0];
    } catch (error) {
      console.error('Error reserving seats:', error);
      throw error;
    }
  }

  /**
   * Get all events
   * @returns {Promise<Array>} Array of all events
   */
  static async getAll() {
    const query = 'SELECT * FROM events ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }
}

module.exports = Event;
