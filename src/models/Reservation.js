const pool = require('../config/database');
const crypto = require('crypto');
const { STATUS } = require('../utils/constants');

class Reservation {
  /**
   * Create a new reservation
   * @param {string} eventId - The event identifier
   * @param {string} partnerId - The partner making the reservation
   * @param {number} seats - Number of seats to reserve
   * @returns {Promise<Object>} Created reservation
   */
  static async create(eventId, partnerId, seats) {
    const reservationId = crypto.randomUUID();
    
    const query = `
      INSERT INTO reservations (reservation_id, event_id, partner_id, seats, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        reservationId,
        eventId,
        partnerId,
        seats,
        STATUS.CONFIRMED
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Get all reservations for a specific event
   * @param {string} eventId - The event identifier
   * @returns {Promise<Array>} Array of reservations
   */
  static async getByEventId(eventId) {
    const query = `
      SELECT * FROM reservations 
      WHERE event_id = $1 
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [eventId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  }

  /**
   * Count total reservations for an event
   * @param {string} eventId - The event identifier
   * @returns {Promise<number>} Count of reservations
   */
  static async countByEventId(eventId) {
    const query = `
      SELECT COUNT(*)::int as count 
      FROM reservations 
      WHERE event_id = $1
    `;
    
    try {
      const result = await pool.query(query, [eventId]);
      return result.rows[0].count;
    } catch (error) {
      console.error('Error counting reservations:', error);
      throw error;
    }
  }

  /**
   * Get reservation by ID
   * @param {string} reservationId - The reservation identifier
   * @returns {Promise<Object|null>} Reservation object or null
   */
  static async getById(reservationId) {
    const query = 'SELECT * FROM reservations WHERE reservation_id = $1';
    
    try {
      const result = await pool.query(query, [reservationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching reservation:', error);
      throw error;
    }
  }

  /**
   * Get all reservations
   * @returns {Promise<Array>} Array of all reservations
   */
  static async getAll() {
    const query = 'SELECT * FROM reservations ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all reservations:', error);
      throw error;
    }
  }
}

module.exports = Reservation;
