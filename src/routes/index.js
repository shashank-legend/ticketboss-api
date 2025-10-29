const express = require('express');
const EventController = require('../controllers/eventController');
const ReservationController = require('../controllers/reservationController');
const { validateReservation } = require('../middleware/validator');

const router = express.Router();

// Event routes
router.get('/events/bootstrap', EventController.bootstrap);
router.get('/events/:eventId', EventController.getSummary);
router.get('/events', EventController.getAll);

// Reservation routes
router.post('/reservations', validateReservation, ReservationController.create);
router.get('/reservations', ReservationController.getAll);
router.get('/reservations/event/:eventId', ReservationController.getByEventId);

module.exports = router;
