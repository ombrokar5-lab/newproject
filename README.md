# Student Database Management System (MERN)

A simple CRUD Student Management System using MongoDB, Express, React, and Node.js.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `server/.env.example` to `server/.env` and update the Atlas variables:
   - `MONGO_USER` = your Atlas username
   - `MONGO_PASSWORD` = `Password5@`
   - `MONGO_CLUSTER` = your cluster host, e.g. `cluster0.mongodb.net`
   - `MONGO_DB` = `studentdb`
   - You can also use `MONGO_URI` directly if you prefer.
3. Start the app:
   ```bash
   npm run dev
   ```

## Available apps

- Backend: `server` runs on `http://localhost:5000`
- Frontend: `client` runs on `http://localhost:3000`

## API Endpoints

- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
