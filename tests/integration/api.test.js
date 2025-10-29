const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('TicketBoss API Integration Tests', () => {
  
  // Close database connections after all tests
  afterAll(async () => {
    await pool.end();
  });
  
  beforeAll(async () => {
    // Bootstrap event before tests
    await request(app).get('/api/events/bootstrap');
  });

  describe('GET /health', () => {
    test('Should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/events/bootstrap', () => {
    test('Should initialize event successfully', async () => {
      const response = await request(app).get('/api/events/bootstrap');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.event).toHaveProperty('eventId', 'node-meetup-2025');
      expect(response.body.event).toHaveProperty('totalSeats', 500);
    });
  });

  describe('GET /api/events/:eventId', () => {
    test('Should return event summary', async () => {
      const response = await request(app).get('/api/events/node-meetup-2025');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('eventId');
      expect(response.body).toHaveProperty('availableSeats');
      expect(response.body).toHaveProperty('version');
    });

    test('Should return 404 for non-existent event', async () => {
      const response = await request(app).get('/api/events/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/reservations', () => {
    test('Should create reservation successfully', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          partnerId: `test-partner-${Date.now()}`,
          seats: 3
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reservationId');
      expect(response.body).toHaveProperty('seats', 3);
      expect(response.body).toHaveProperty('status', 'confirmed');
    });

    test('Should reject invalid seats count (too high)', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          partnerId: 'test-partner',
          seats: 15
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('Should reject invalid seats count (zero)', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          partnerId: 'test-partner',
          seats: 0
        });
      
      expect(response.status).toBe(400);
    });

    test('Should reject missing partnerId', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({
          seats: 5
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reservations', () => {
    test('Should return all reservations', async () => {
      const response = await request(app).get('/api/reservations');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('reservations');
      expect(Array.isArray(response.body.reservations)).toBe(true);
    });
  });
});
