const express = require('express');
const EventController = require('../controllers/eventController');
const ReservationController = require('../controllers/reservationController');
const { validateReservation, validateEvent } = require('../middleware/validator');

const router = express.Router();

// Event routes
router.get('/events/bootstrap', EventController.bootstrap);
router.get('/events', EventController.getAll);
router.post('/events', validateEvent, EventController.create);
router.get('/events/:eventId', EventController.getSummary);

// Reservation routes
router.post('/reservations', validateReservation, ReservationController.create);
router.get('/reservations', ReservationController.getAll);
router.get('/reservations/event/:eventId', ReservationController.getByEventId);
router.delete('/reservations/:reservationId', ReservationController.cancel);

module.exports = router;
