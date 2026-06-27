# MediFlow Backend

NestJS backend for the MediFlow doctor booking system. This service handles authentication, users, doctors, patients, clinics, specialties, availability, appointments, prescriptions, medical records, reviews, payments, notifications, admin summaries, and reports.

## Tech Stack

- NestJS
- Prisma
- PostgreSQL
- JWT authentication
- Swagger API docs

## Features

- Patient and doctor registration
- Login, refresh token, logout, current user profile
- Doctor directory, specialties, and clinics
- Doctor availability and slot management
- Appointment booking, status updates, and rescheduling
- Prescriptions and medical records
- Reviews and notifications
- Payments and reporting
- Admin dashboard endpoints

## Project Structure

```text
src/
  common/
  config/
  modules/
    admin/
    appointments/
    auth/
    availability/
    clinics/
    doctors/
    medical-records/
    notifications/
    patients/
    payments/
    prescriptions/
    reports/
    reviews/
    specialties/
    users/
  prisma/
prisma/
test/
```

## Environment Variables

Create a `.env` file in the project root. You can copy from `.env.example`.

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/doctor_booking_db?schema=public"
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
SWAGGER_PATH=docs
```

Important:

- `FRONTEND_URL` must match the frontend app URL for CORS.
- If your database password contains `@`, encode it as `%40` in `DATABASE_URL`.
- Do not commit the real `.env` file.

## Installation

```bash
npm install
```

## Database Setup

1. Create a PostgreSQL database.
2. Update `DATABASE_URL` in `.env`.
3. Run migrations:

```bash
npm run prisma:migrate
```

4. Generate Prisma client if needed:

```bash
npm run prisma:generate
```

5. Optional: inspect the database:

```bash
npm run prisma:studio
```

## Run the Application

Development:

```bash
npm run start:dev
```

Standard start:

```bash
npm run start
```

Production build:

```bash
npm run build
npm run start:prod
```

The API runs on:

```text
http://localhost:4000
```

## Swagger Documentation

Swagger is available at:

```text
http://localhost:4000/docs
```

If `SWAGGER_PATH` is changed in `.env`, use that custom path instead.

## Authentication Flow

Frontend integration should start with the auth module.

Public auth endpoints:

- `POST /auth/register/patient`
- `POST /auth/register/doctor`
- `POST /auth/login`
- `POST /auth/refresh`

Protected auth endpoints:

- `GET /auth/me`
- `POST /auth/logout`

Protected requests must send:

```http
Authorization: Bearer <accessToken>
```

Notes:

- Login only works for users that already exist in the database.
- Registration creates the user and returns JWT tokens.
- `refreshToken` is stored as a hash in the database.

## Main API Modules

- `Auth` -> `/auth`
- `Users` -> `/users`
- `Patients` -> `/patients`
- `Doctors` -> `/doctors`
- `Specialties` -> `/specialties`
- `Clinics` -> `/clinics`
- `Availability` -> `/availability`
- `Appointments` -> `/appointments`
- `Medical Records` -> `/medical-records`
- `Prescriptions` -> `/prescriptions`
- `Reviews` -> `/reviews`
- `Payments` -> `/payments`
- `Notifications` -> `/notifications`
- `Admin` -> `/admin`
- `Reports` -> `/reports`

## Frontend Integration Notes

The frontend and backend can live in separate repositories. Integration is done by calling backend APIs from the frontend.

Frontend should keep the backend base URL in environment variables:

For Vite:

```env
VITE_API_BASE_URL=http://localhost:4000
```

For Next.js:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Backend should allow the frontend origin:

```env
FRONTEND_URL=http://localhost:3000
```

Recommended integration order:

1. Auth
2. Doctors and specialties
3. Availability and slots
4. Appointments
5. Dashboard, notifications, records, prescriptions, and payments

## Common Commands

```bash
npm run build
npm run format
npm run lint
npm run test
npm run test:e2e
npm run test:cov
npm run prisma:validate
```

## API Response Validation

This project uses Nest global validation with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

That means frontend request bodies must match DTO fields exactly.

## Git Notes

Recommended files to commit:

- `src/`
- `prisma/`
- `test/`
- `package.json`
- `package-lock.json`
- `.env.example`
- config files

Recommended files not to commit:

- `.env`
- `node_modules/`
- `dist/`

## Next Backend Steps

- Add project-specific examples for each module in Swagger or README
- Seed demo data for specialties, clinics, doctors, and patients
- Add role-based usage examples for frontend teams
- Add deployment instructions for staging and production
