const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Concurrency Tests', () => {
  
  // Close database connections after all tests
  afterAll(async () => {
    await pool.end();
  });
  
  beforeEach(async () => {
    // Reset event before each concurrency test
    await request(app).get('/api/events/bootstrap');
    
    // Wait a moment for the operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('Should handle 50 concurrent reservations correctly', async () => {
    // Create 50 concurrent requests (50 x 2 seats = 100 seats total)
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ 
            partnerId: `partner-concurrent-${i}`, 
            seats: 2 
          })
      );
    }
    
    const results = await Promise.all(promises);
    
    // Count successes and conflicts
    const successes = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    
    console.log(`✓ Successes: ${successes}, Conflicts: ${conflicts}`);
    
    // All requests should complete (either success or conflict)
    expect(successes + conflicts).toBe(50);
    
    // At least some should succeed
    expect(successes).toBeGreaterThan(0);
    
    // Verify final event state
    const summary = await request(app).get('/api/events/node-meetup-2025');
    
    // Available seats should be exactly 500 - (successes * 2)
    expect(summary.body.availableSeats).toBe(500 - (successes * 2));
    
    // Reservation count should match successes
    // Note: This might be higher if previous tests added reservations
    expect(summary.body.reservationCount).toBeGreaterThanOrEqual(successes);
  });

  test('Should prevent overbooking with 100 concurrent requests', async () => {
    // Create 100 concurrent requests attempting to book 10 seats each
    // Total attempted: 1000 seats (but only 500 available)
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ 
            partnerId: `partner-heavy-${i}`, 
            seats: 10 
          })
      );
    }
    
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    
    console.log(`✓ Successes: ${successes}, Conflicts: ${conflicts}`);
    
    // Verify no overbooking
    const summary = await request(app).get('/api/events/node-meetup-2025');
    
    // Should have at most 50 successful reservations (50 * 10 = 500 seats)
    expect(successes).toBeLessThanOrEqual(50);
    expect(summary.body.availableSeats).toBeGreaterThanOrEqual(0);
    expect(summary.body.availableSeats).toBe(500 - (successes * 10));
  });

  test('Should handle mixed seat reservations concurrently', async () => {
    const promises = [];
    
    // Mix of different seat counts
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ partnerId: `partner-mixed-${i}`, seats: 1 })
      );
    }
    
    for (let i = 20; i < 40; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ partnerId: `partner-mixed-${i}`, seats: 5 })
      );
    }
    
    for (let i = 40; i < 50; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ partnerId: `partner-mixed-${i}`, seats: 10 })
      );
    }
    
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.status === 201);
    
    // Calculate total seats reserved
    let totalSeatsReserved = 0;
    for (let i = 0; i < successes.length; i++) {
      totalSeatsReserved += successes[i].body.seats;
    }
    
    console.log(`✓ Total seats reserved: ${totalSeatsReserved}`);
    
    // Verify final state
    const summary = await request(app).get('/api/events/node-meetup-2025');
    expect(summary.body.availableSeats).toBe(500 - totalSeatsReserved);
  });
  
  test('Should demonstrate version conflicts under high contention', async () => {
    // This test specifically shows optimistic locking in action
    const promises = [];
    
    // 200 concurrent requests for 3 seats each
    for (let i = 0; i < 200; i++) {
      promises.push(
        request(app)
          .post('/api/reservations')
          .send({ 
            partnerId: `partner-stress-${i}`, 
            seats: 3 
          })
      );
    }
    
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    
    console.log(`✓ High Contention Test - Successes: ${successes}, Conflicts: ${conflicts}`);
    
    // With 500 seats and 3 per request, max is 166 successful reservations
    expect(successes).toBeLessThanOrEqual(166);
    
    // Should have many conflicts due to high contention
    expect(conflicts).toBeGreaterThan(0);
    
    // Verify no overbooking
    const summary = await request(app).get('/api/events/node-meetup-2025');
    expect(summary.body.availableSeats).toBeGreaterThanOrEqual(0);
    expect(summary.body.availableSeats).toBe(500 - (successes * 3));
  });
});
