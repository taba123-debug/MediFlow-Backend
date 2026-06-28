# Patient API Reference

Patient-facing backend contract for integrating these frontend pages:

- `/patient/dashboard`
- `/patient/book`
- `/patient/appointments`
- `/patient/appointments/[id]`
- `/patient/profile`
- `/patient/medical-records`
- `/patient/reviews`

## Base URL

Local development:

```text
http://localhost:4000
```

Patient module base path:

```text
/patient
```

## Authentication

All patient module APIs require a bearer token:

```http
Authorization: Bearer <accessToken>
```

The frontend still depends on these auth APIs:

```http
POST /auth/register/patient
POST /auth/login
POST /auth/refresh
GET  /auth/me
POST /auth/logout
```

## Enums

### `AppointmentStatus`

```text
PENDING
CONFIRMED
REJECTED
RESCHEDULED
CANCELLED
COMPLETED
NO_SHOW
```

### `PaymentStatus`

```text
UNPAID
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

### `ConsultationType`

```text
CLINIC_VISIT
ONLINE_CONSULTATION
```

### `Gender`

```text
MALE
FEMALE
OTHER
PREFER_NOT_TO_SAY
```

### `NotificationType`

```text
APPOINTMENT
PAYMENT
REVIEW
SYSTEM
```

## 1. Dashboard

### `GET /patient/dashboard`

Purpose: fetch the full patient dashboard in one request.

Response:

```json
{
  "profile": {
    "userId": "user-id",
    "patientId": "patient-id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "stats": {
    "upcomingAppointments": 3,
    "medicalRecords": 12,
    "unreadNotifications": 4,
    "completedAppointments": 9
  },
  "upcomingAppointments": [
    {
      "id": "appointment-id",
      "doctorId": "doctor-id",
      "doctorName": "Dr Ali",
      "specialty": "Cardiology",
      "clinic": "City Hospital",
      "appointmentDate": "2026-06-30",
      "scheduledStartAt": "2026-06-30T09:00:00.000Z",
      "scheduledEndAt": "2026-06-30T09:30:00.000Z",
      "status": "CONFIRMED",
      "consultationType": "CLINIC_VISIT",
      "reason": "Fever and headache",
      "paymentStatus": "PAID"
    }
  ],
  "recommendedDoctors": [
    {
      "doctorId": "doctor-id",
      "name": "Dr Sara",
      "specialty": "Dermatology",
      "clinic": "ABC Clinic",
      "experienceYears": 8,
      "consultationFee": 2500,
      "rating": 4.8,
      "about": "Skin specialist",
      "isVerified": true
    }
  ],
  "notificationsPreview": [
    {
      "id": "notification-id",
      "title": "Appointment confirmed",
      "message": "Your appointment is confirmed",
      "type": "APPOINTMENT",
      "isRead": false,
      "createdAt": "2026-06-28T10:00:00.000Z"
    }
  ]
}
```

## 2. Profile

### `GET /patient/profile`

Response:

```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+923001234567",
    "location": "Lahore",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "patientProfile": {
    "id": "patient-id",
    "dateOfBirth": "2000-01-01",
    "gender": "MALE",
    "bloodGroup": "A+",
    "address": "Street 1",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "+923001234568"
  }
}
```

### `PATCH /patient/profile`

Request:

```json
{
  "name": "Updated Name",
  "phone": "+923001234567",
  "location": "Lahore",
  "avatarUrl": "https://example.com/avatar.png",
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "bloodGroup": "A+",
  "address": "Street 1",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+923001234568"
}
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "name": "Updated Name",
    "email": "john@example.com",
    "phone": "+923001234567",
    "location": "Lahore",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "patientProfile": {
    "id": "patient-id",
    "dateOfBirth": "2000-01-01",
    "gender": "MALE",
    "bloodGroup": "A+",
    "address": "Street 1",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "+923001234568"
  }
}
```

## 3. Doctor Discovery

### `GET /patient/doctors`

Query params:

```json
{
  "search": "cardio",
  "specialtyId": "uuid",
  "clinicId": "uuid",
  "minFee": 1000,
  "maxFee": 5000,
  "page": 1,
  "limit": 10
}
```

Response:

```json
{
  "data": [
    {
      "doctorId": "doctor-id",
      "name": "Dr Ali",
      "specialty": "Cardiology",
      "clinic": "City Hospital",
      "experienceYears": 5,
      "consultationFee": 2000,
      "rating": 4.7,
      "about": "Cardiologist",
      "isVerified": true
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `GET /patient/doctors/:doctorId`

Response:

```json
{
  "doctorId": "doctor-id",
  "name": "Dr Ali",
  "specialty": "Cardiology",
  "clinic": {
    "id": "clinic-id",
    "name": "City Hospital",
    "address": "Main Road"
  },
  "experienceYears": 5,
  "consultationFee": 2000,
  "qualification": "MBBS",
  "about": "Cardiologist",
  "rating": 4.7,
  "reviews": [],
  "availableDates": ["2026-06-30", "2026-07-01"]
}
```

### `GET /patient/doctors/:doctorId/slots?date=2026-06-30`

Response:

```json
{
  "doctorId": "doctor-id",
  "date": "2026-06-30",
  "slots": [
    {
      "slotId": "slot-id",
      "startAt": "2026-06-30T09:00:00.000Z",
      "endAt": "2026-06-30T09:30:00.000Z",
      "isBooked": false
    }
  ]
}
```

## 4. Appointment Booking

### `POST /patient/appointments`

Request:

```json
{
  "doctorId": "doctor-id",
  "clinicId": "clinic-id",
  "timeSlotId": "slot-id",
  "consultationType": "CLINIC_VISIT",
  "reason": "Fever and headache",
  "notes": "Optional notes"
}
```

Response:

```json
{
  "id": "appointment-id",
  "status": "PENDING",
  "paymentStatus": "UNPAID",
  "doctor": {
    "id": "doctor-id",
    "name": "Dr Ali"
  },
  "clinic": {
    "id": "clinic-id",
    "name": "City Hospital"
  },
  "timeSlot": {
    "slotId": "slot-id",
    "startAt": "2026-06-30T09:00:00.000Z",
    "endAt": "2026-06-30T09:30:00.000Z"
  }
}
```

## 5. Patient Appointments

### `GET /patient/appointments`

Query params:

```json
{
  "status": "CONFIRMED",
  "date": "2026-06-30",
  "page": 1,
  "limit": 10
}
```

Response:

```json
{
  "data": [
    {
      "id": "appointment-id",
      "status": "CONFIRMED",
      "appointmentDate": "2026-06-30",
      "scheduledStartAt": "2026-06-30T09:00:00.000Z",
      "scheduledEndAt": "2026-06-30T09:30:00.000Z",
      "consultationType": "CLINIC_VISIT",
      "reason": "Fever and headache",
      "notes": "Optional notes",
      "doctor": {
        "id": "doctor-id",
        "name": "Dr Ali",
        "specialty": "Cardiology"
      },
      "clinic": {
        "id": "clinic-id",
        "name": "City Hospital"
      },
      "paymentStatus": "PAID",
      "canCancel": true,
      "canReschedule": true,
      "canReview": false
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `GET /patient/appointments/:id`

Response:

```json
{
  "id": "appointment-id",
  "status": "CONFIRMED",
  "appointmentDate": "2026-06-30",
  "scheduledStartAt": "2026-06-30T09:00:00.000Z",
  "scheduledEndAt": "2026-06-30T09:30:00.000Z",
  "consultationType": "CLINIC_VISIT",
  "reason": "Fever and headache",
  "notes": "Optional notes",
  "doctor": {
    "id": "doctor-id",
    "name": "Dr Ali",
    "specialty": "Cardiology",
    "clinic": {
      "id": "clinic-id",
      "name": "City Hospital",
      "address": "Main Road"
    }
  },
  "clinic": {
    "id": "clinic-id",
    "name": "City Hospital",
    "address": "Main Road"
  },
  "payment": {
    "id": "payment-id",
    "amount": 2000,
    "currency": "USD",
    "method": "CARD",
    "status": "PAID",
    "transactionRef": "TXN-123",
    "paidAt": "2026-06-27T10:00:00.000Z"
  },
  "medicalRecords": [],
  "prescriptions": [],
  "review": null
}
```

### `PATCH /patient/appointments/:id/cancel`

Request:

```json
{
  "reason": "Unable to attend"
}
```

Response:

```json
{
  "id": "appointment-id",
  "status": "CANCELLED"
}
```

### `PATCH /patient/appointments/:id/reschedule`

Request:

```json
{
  "timeSlotId": "new-slot-id",
  "reason": "Need another time"
}
```

Response:

```json
{
  "id": "appointment-id",
  "status": "RESCHEDULED",
  "timeSlotId": "new-slot-id"
}
```

## 6. Medical Records

### `GET /patient/medical-records`

Response:

```json
{
  "data": [
    {
      "id": "record-id",
      "title": "Blood Test",
      "description": "Summary",
      "fileUrl": "https://example.com/file.pdf",
      "recordDate": "2026-06-27",
      "doctor": {
        "id": "doctor-id",
        "name": "Dr Ali"
      },
      "appointmentId": "appointment-id"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `GET /patient/medical-records/:id`

Response:

```json
{
  "id": "record-id",
  "title": "Blood Test",
  "description": "Summary",
  "fileUrl": "https://example.com/file.pdf",
  "recordDate": "2026-06-27",
  "doctor": {
    "id": "doctor-id",
    "name": "Dr Ali"
  },
  "appointmentId": "appointment-id"
}
```

## 7. Reviews

### `GET /patient/reviews`

Response:

```json
{
  "data": [
    {
      "id": "review-id",
      "appointmentId": "appointment-id",
      "doctor": {
        "id": "doctor-id",
        "name": "Dr Ali"
      },
      "rating": 5,
      "comment": "Very helpful doctor",
      "createdAt": "2026-06-28T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `POST /patient/reviews`

Request:

```json
{
  "appointmentId": "appointment-id",
  "rating": 5,
  "comment": "Very helpful doctor"
}
```

### `PATCH /patient/reviews/:id`

Request:

```json
{
  "rating": 4,
  "comment": "Updated comment"
}
```

### `DELETE /patient/reviews/:id`

Response:

```json
{
  "message": "Review deleted successfully."
}
```

## 8. Notifications

### `GET /patient/notifications`

Query params:

```json
{
  "isRead": false,
  "page": 1,
  "limit": 10
}
```

Response:

```json
{
  "data": [
    {
      "id": "notification-id",
      "title": "Appointment confirmed",
      "message": "Your appointment is confirmed",
      "type": "APPOINTMENT",
      "isRead": false,
      "createdAt": "2026-06-28T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `PATCH /patient/notifications/:id/read`

Request:

```json
{
  "isRead": true
}
```

### `PATCH /patient/notifications/read-all`

Response:

```json
{
  "updatedCount": 4
}
```

## 9. Payments

### `GET /patient/payments`

Response:

```json
{
  "data": [
    {
      "id": "payment-id",
      "appointmentId": "appointment-id",
      "amount": 2000,
      "currency": "USD",
      "method": "CARD",
      "status": "PAID",
      "transactionRef": "TXN-123",
      "paidAt": "2026-06-27T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `GET /patient/payments/:id`

Response:

```json
{
  "id": "payment-id",
  "appointmentId": "appointment-id",
  "amount": 2000,
  "currency": "USD",
  "method": "CARD",
  "status": "PAID",
  "transactionRef": "TXN-123",
  "paidAt": "2026-06-27T10:00:00.000Z"
}
```

## Final Patient Route List

```http
GET    /patient/dashboard

GET    /patient/profile
PATCH  /patient/profile

GET    /patient/doctors
GET    /patient/doctors/:doctorId
GET    /patient/doctors/:doctorId/slots

POST   /patient/appointments
GET    /patient/appointments
GET    /patient/appointments/:id
PATCH  /patient/appointments/:id/cancel
PATCH  /patient/appointments/:id/reschedule

GET    /patient/medical-records
GET    /patient/medical-records/:id

GET    /patient/reviews
POST   /patient/reviews
PATCH  /patient/reviews/:id
DELETE /patient/reviews/:id

GET    /patient/notifications
PATCH  /patient/notifications/:id/read
PATCH  /patient/notifications/read-all

GET    /patient/payments
GET    /patient/payments/:id
```

## Frontend Integration Notes

- Use `GET /auth/me` after login to confirm the logged-in patient.
- Use `/patient/dashboard` for the dashboard page instead of many parallel requests.
- Use `/patient/doctors`, `/patient/doctors/:doctorId`, and `/patient/doctors/:doctorId/slots` for the booking flow.
- Use `/patient/appointments` as the source for appointment history and upcoming appointments.
- Use `canCancel`, `canReschedule`, and `canReview` flags to drive frontend actions.
- All paginated endpoints return:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```
