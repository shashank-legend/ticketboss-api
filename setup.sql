-- Create database
CREATE DATABASE ticketboss;

-- Connect to database
\c ticketboss;

-- Create events table
CREATE TABLE events (
    event_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reservations table
CREATE TABLE reservations (
    reservation_id UUID PRIMARY KEY,
    event_id VARCHAR(100) REFERENCES events(event_id) ON DELETE CASCADE,
    partner_id VARCHAR(100) NOT NULL,
    seats INTEGER NOT NULL CHECK (seats > 0 AND seats <= 10),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_event_id ON reservations(event_id);
CREATE INDEX idx_reservations_partner_id ON reservations(partner_id);
CREATE INDEX idx_events_version ON events(version);

-- Insert seed data
INSERT INTO events (event_id, name, total_seats, available_seats, version)
VALUES ('node-meetup-2025', 'Node.js Meet-up', 500, 500, 0)
ON CONFLICT (event_id) DO NOTHING;

-- Display created tables
\dt
