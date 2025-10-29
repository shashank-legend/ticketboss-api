# TicketBoss - Event Ticketing API

![Tests](https://img.shields.io/badge/tests-18%20passed-success)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-blue)


A production-grade event ticketing API with optimistic concurrency control for handling real-time seat reservations without overbooking.

## 🎯 Features

- **Optimistic Concurrency Control**: Version-based locking prevents race conditions
- **Real-time Reservations**: Instant accept/deny responses
- **PostgreSQL Backend**: ACID-compliant transactions for data integrity
- **RESTful API**: Clean, intuitive endpoint design
- **Comprehensive Testing**: Unit, integration, and concurrency tests
- **Production-Ready**: Error handling, logging, graceful shutdown

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: PostgreSQL 12+
- **Validation**: Joi
- **Testing**: Jest + Supertest

## 📋 Prerequisites

- Node.js v18.0.0 or higher
- PostgreSQL 12 or higher
- npm or yarn

## 🚀 Installation

### 1. Clone the Repository

