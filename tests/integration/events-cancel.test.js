const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Event creation and reservation cancellation', () => {
  const eventId = `test-event-${Date.now()}`;

  afterAll(async () => {
    await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
    await pool.end();
  });

  test('POST /api/events creates an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ eventId, name: 'Test Concert', totalSeats: 20 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ eventId, totalSeats: 20, availableSeats: 20 });
  });

  test('POST /api/events rejects a duplicate eventId', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ eventId, name: 'Dup', totalSeats: 5 });
    expect(res.status).toBe(409);
  });

  test('POST /api/events validates input', async () => {
    const res = await request(app).post('/api/events').send({ name: '', totalSeats: 0 });
    expect(res.status).toBe(400);
  });

  test('GET /api/events lists events with reservation counts', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    const ev = res.body.events.find((e) => e.eventId === eventId);
    expect(ev).toBeDefined();
    expect(ev).toHaveProperty('reservationCount', 0);
  });

  test('Cancelling a reservation releases its seats exactly once', async () => {
    const booked = await request(app)
      .post('/api/reservations')
      .send({ eventId, partnerId: 'cancel-partner', seats: 4 });
    expect(booked.status).toBe(201);
    expect(booked.body.availableSeats).toBe(16);

    const cancelled = await request(app).delete(`/api/reservations/${booked.body.reservationId}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', availableSeats: 20 });

    const again = await request(app).delete(`/api/reservations/${booked.body.reservationId}`);
    expect(again.status).toBe(410);

    const summary = await request(app).get(`/api/events/${eventId}`);
    expect(summary.body.availableSeats).toBe(20);
    expect(summary.body.reservationCount).toBe(0);
  });

  test('Cancelling an unknown reservation returns 404', async () => {
    const res = await request(app).delete('/api/reservations/not-a-uuid');
    expect(res.status).toBe(404);
  });
});
