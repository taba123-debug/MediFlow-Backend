# Backend API Reference

This file is a frontend handoff for the current backend. It lists the modules, endpoints, auth rules, request DTOs, and the main response shapes returned by the service layer.

## Base URL

```text
http://localhost:4000
```

## Auth Header

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

## Common Pagination Query

Most list endpoints accept this shared query shape:

```json
{
  "page": 1,
  "limit": 10,
  "search": "optional text",
  "sortBy": "optional field",
  "sortOrder": "asc or desc"
}
```

Paginated responses use this shape:

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

## Enums Used Often

```text
UserRole: ADMIN | DOCTOR | PATIENT
UserStatus: ACTIVE | INACTIVE | PENDING
Gender: MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY
ConsultationType: CLINIC_VISIT | ONLINE_CONSULTATION
AppointmentStatus: PENDING | CONFIRMED | REJECTED | RESCHEDULED | CANCELLED | COMPLETED | NO_SHOW
PaymentStatus: UNPAID | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED
PaymentMethod: CARD | INSURANCE | WALLET | CASH | BANK_TRANSFER
NotificationType: APPOINTMENT | PAYMENT | REVIEW | SYSTEM
DayOfWeek: MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY
```

## Auth Module

### POST `/auth/register/patient`

Public.

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "phone": "+923001234567",
  "location": "Lahore",
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
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "PATIENT",
    "status": "ACTIVE",
    "patientProfile": {},
    "doctorProfile": null
  }
}
```

### POST `/auth/register/doctor`

Public.

Request:

```json
{
  "name": "Dr Ali",
  "email": "ali@example.com",
  "password": "secret123",
  "phone": "+923001111111",
  "location": "Karachi",
  "specialtyId": "specialty-uuid",
  "clinicId": "clinic-uuid",
  "licenseNumber": "LIC-123",
  "experienceYears": 5,
  "consultationFee": 2000,
  "qualification": "MBBS",
  "about": "Cardiologist",
  "isVerified": false
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user-id",
    "name": "Dr Ali",
    "email": "ali@example.com",
    "role": "DOCTOR",
    "status": "ACTIVE",
    "patientProfile": null,
    "doctorProfile": {}
  }
}
```

### POST `/auth/login`

Public.

Request:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "PATIENT",
    "patientProfile": {},
    "doctorProfile": null
  }
}
```

### POST `/auth/refresh`

Public.

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response: same token payload shape as login.

### GET `/auth/me`

Protected.

Response:

```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "PATIENT",
  "patientProfile": {},
  "doctorProfile": {
    "specialty": {},
    "clinic": {}
  },
  "notifications": []
}
```

### POST `/auth/logout`

Protected.

Response:

```json
{
  "message": "Logged out successfully."
}
```

## Users Module

### GET `/users`

Protected. Admin only.

Query adds:

```json
{
  "role": "PATIENT",
  "status": "ACTIVE"
}
```

Response:

```json
{
  "data": [
    {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "patientProfile": {},
      "doctorProfile": null
    }
  ],
  "meta": {}
}
```

### GET `/users/:id`

Protected. Admin or self.

Response includes:

```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "patientProfile": {},
  "doctorProfile": {
    "specialty": {},
    "clinic": {}
  }
}
```

### PATCH `/users/:id`

Protected. Admin or self.

Request:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+923001234567",
  "location": "Lahore",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Response: updated user with `patientProfile` and `doctorProfile`.

### PATCH `/users/:id/status`

Protected. Admin only.

Request:

```json
{
  "status": "ACTIVE"
}
```

Response: updated user.

## Patients Module

### GET `/patients`

Protected. Admin or doctor.

Response:

```json
{
  "data": [
    {
      "id": "patient-profile-id",
      "userId": "user-id",
      "user": {}
    }
  ],
  "meta": {}
}
```

### GET `/patients/:id`

Protected.

Response includes:

```json
{
  "id": "patient-profile-id",
  "user": {},
  "appointments": [],
  "medicalRecords": []
}
```

### PATCH `/patients/:id`

Protected.

Request:

```json
{
  "dateOfBirth": "2000-01-01",
  "gender": "MALE",
  "bloodGroup": "A+",
  "address": "Street 1",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+923001234568"
}
```

Response: updated patient profile with `user`.

## Doctors Module

### GET `/doctors`

Public.

Query adds:

```json
{
  "specialtyId": "uuid",
  "clinicId": "uuid",
  "minFee": 1000,
  "maxFee": 5000
}
```

Response:

```json
{
  "data": [
    {
      "id": "doctor-profile-id",
      "user": {},
      "specialty": {},
      "clinic": {}
    }
  ],
  "meta": {}
}
```

### GET `/doctors/:id`

Public.

Response includes:

```json
{
  "id": "doctor-profile-id",
  "user": {},
  "specialty": {},
  "clinic": {},
  "availabilities": [],
  "timeSlots": [],
  "reviews": []
}
```

### PATCH `/doctors/:id`

Protected. Admin or doctor owner.

Request:

```json
{
  "specialtyId": "uuid",
  "clinicId": "uuid",
  "licenseNumber": "LIC-123",
  "experienceYears": 5,
  "consultationFee": 2000,
  "about": "Cardiologist",
  "qualification": "MBBS",
  "isVerified": true
}
```

Response: updated doctor profile with `user`, `specialty`, `clinic`.

## Specialties Module

### GET `/specialties`

Public.

Response:

```json
{
  "data": [
    {
      "id": "specialty-id",
      "name": "Cardiology",
      "description": "Heart specialist",
      "isActive": true
    }
  ],
  "meta": {}
}
```

### GET `/specialties/:id`

Public.

Response includes `doctors`.

### POST `/specialties`

Protected. Admin only.

Request:

```json
{
  "name": "Cardiology",
  "description": "Heart specialist",
  "isActive": true
}
```

Response: created specialty.

### PATCH `/specialties/:id`

Protected. Admin only.

Request: same fields as create, all optional.

### DELETE `/specialties/:id`

Protected. Admin only.

Response: deleted specialty.

## Clinics Module

### GET `/clinics`

Public.

Query adds:

```json
{
  "city": "Lahore"
}
```

Response:

```json
{
  "data": [
    {
      "id": "clinic-id",
      "name": "City Hospital",
      "city": "Lahore"
    }
  ],
  "meta": {}
}
```

### GET `/clinics/:id`

Public.

Response includes `doctors`.

### POST `/clinics`

Protected. Admin only.

Request:

```json
{
  "name": "City Hospital",
  "address": "Main Road",
  "city": "Lahore",
  "state": "Punjab",
  "country": "Pakistan",
  "phone": "+923001234567",
  "email": "info@cityhospital.com",
  "isActive": true
}
```

### PATCH `/clinics/:id`

Protected. Admin only.

Request: same fields as create, all optional.

### DELETE `/clinics/:id`

Protected. Admin only.

## Availability Module

### POST `/availability/doctors/:doctorId`

Protected. Admin or doctor owner.

Request:

```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDurationMinutes": 30,
  "isActive": true
}
```

### GET `/availability`

Public.

Query adds:

```json
{
  "doctorId": "doctor-profile-id"
}
```

Response:

```json
{
  "data": [
    {
      "id": "availability-id",
      "doctorId": "doctor-profile-id",
      "dayOfWeek": "MONDAY"
    }
  ],
  "meta": {}
}
```

### PATCH `/availability/:id`

Protected. Admin or doctor owner.

Request: same fields as create, all optional.

### DELETE `/availability/:id`

Protected. Admin or doctor owner.

### POST `/availability/slots`

Protected. Admin or doctor owner.

Request:

```json
{
  "doctorId": "doctor-profile-id",
  "availabilityId": "availability-id",
  "slotDate": "2026-06-30",
  "startAt": "2026-06-30T09:00:00.000Z",
  "endAt": "2026-06-30T09:30:00.000Z"
}
```

### GET `/availability/slots/list`

Public.

Query adds:

```json
{
  "doctorId": "doctor-profile-id",
  "date": "2026-06-30"
}
```

Response:

```json
{
  "data": [
    {
      "id": "slot-id",
      "doctorId": "doctor-profile-id",
      "isBooked": false,
      "doctor": {
        "user": {},
        "specialty": {},
        "clinic": {}
      }
    }
  ],
  "meta": {}
}
```

### DELETE `/availability/slots/:id`

Protected. Admin or doctor owner.

Only unbooked slots can be deleted.

## Appointments Module

### POST `/appointments`

Protected.

Patient or admin can create.

Request:

```json
{
  "doctorId": "doctor-profile-id",
  "clinicId": "clinic-id",
  "timeSlotId": "slot-id",
  "consultationType": "CLINIC_VISIT",
  "reason": "Fever and headache",
  "notes": "Optional notes"
}
```

Response includes:

```json
{
  "id": "appointment-id",
  "patient": {
    "user": {}
  },
  "doctor": {
    "user": {},
    "specialty": {},
    "clinic": {}
  },
  "timeSlot": {}
}
```

### GET `/appointments`

Protected.

Query adds:

```json
{
  "status": "PENDING",
  "doctorId": "doctor-profile-id",
  "patientId": "patient-profile-id",
  "date": "2026-06-30"
}
```

Response items include:

```json
{
  "id": "appointment-id",
  "patient": {
    "user": {}
  },
  "doctor": {
    "user": {},
    "specialty": {},
    "clinic": {}
  },
  "clinic": {},
  "timeSlot": {},
  "payment": {},
  "review": {}
}
```

### GET `/appointments/:id`

Protected.

Response also includes `medicalRecords` and `prescriptions`.

### PATCH `/appointments/:id`

Protected.

Request:

```json
{
  "notes": "Updated notes"
}
```

### PATCH `/appointments/:id/status`

Protected.

Request:

```json
{
  "status": "CONFIRMED",
  "reason": "Optional rejection or cancellation reason"
}
```

### PATCH `/appointments/:id/reschedule`

Protected.

Request:

```json
{
  "timeSlotId": "new-slot-id",
  "reason": "Need another time"
}
```

## Medical Records Module

### POST `/medical-records`

Protected.

Doctor owner or admin.

Request:

```json
{
  "patientId": "patient-profile-id",
  "doctorId": "doctor-profile-id",
  "appointmentId": "appointment-id",
  "title": "Blood Test",
  "description": "Summary",
  "fileUrl": "https://example.com/file.pdf",
  "recordDate": "2026-06-27"
}
```

### GET `/medical-records`

Protected.

Query adds:

```json
{
  "patientId": "patient-profile-id"
}
```

Response items include `patient.user`, `doctor.user`, `appointment`.

### GET `/medical-records/:id`

Protected.

### PATCH `/medical-records/:id`

Protected.

Request: same fields as create, all optional.

### DELETE `/medical-records/:id`

Protected.

## Prescriptions Module

### POST `/prescriptions`

Protected.

Doctor only. Appointment must be completed.

Request:

```json
{
  "appointmentId": "appointment-id",
  "patientId": "patient-profile-id",
  "diagnosis": "Migraine",
  "medications": [
    {
      "name": "Medicine A",
      "dose": "1 tablet",
      "frequency": "twice a day"
    }
  ],
  "instructions": "Take after food",
  "followUpDate": "2026-07-10"
}
```

Response: created prescription.

### GET `/prescriptions`

Protected.

Query adds:

```json
{
  "patientId": "patient-profile-id"
}
```

Response items include `patient.user`, `doctor.user`, `appointment`.

### PATCH `/prescriptions/:id`

Protected.

Doctor owner or admin.

Request: same fields as create, all optional.

### DELETE `/prescriptions/:id`

Protected.

Doctor owner or admin.

## Reviews Module

### GET `/reviews`

Public.

Query adds:

```json
{
  "doctorId": "doctor-profile-id"
}
```

Response items include `doctor.user`, `patient.user`, `appointment`.

### POST `/reviews`

Protected.

Patient only. Appointment must be completed.

Request:

```json
{
  "appointmentId": "appointment-id",
  "rating": 5,
  "comment": "Very helpful doctor"
}
```

Response: created review.

### PATCH `/reviews/:id`

Protected.

Patient owner or admin.

Request:

```json
{
  "rating": 4,
  "comment": "Updated comment"
}
```

### DELETE `/reviews/:id`

Protected.

Patient owner or admin.

Response:

```json
{
  "message": "Review deleted successfully."
}
```

## Payments Module

### POST `/payments`

Protected. Admin only.

Request:

```json
{
  "appointmentId": "appointment-id",
  "amount": 2000,
  "currency": "USD",
  "method": "CARD",
  "status": "PAID",
  "transactionRef": "TXN-123"
}
```

Response: created payment.

### GET `/payments`

Protected.

Query adds:

```json
{
  "status": "PAID"
}
```

Response items include `appointment`, `patient.user`, `doctor.user`.

### GET `/payments/:id`

Protected.

Admin, owning patient, or owning doctor.

### PATCH `/payments/:id`

Protected. Admin only.

Request:

```json
{
  "amount": 2500,
  "currency": "USD",
  "method": "CARD",
  "status": "REFUNDED",
  "transactionRef": "TXN-123",
  "refundedAmount": 500,
  "paidAt": "2026-06-27T10:00:00.000Z"
}
```

## Notifications Module

### POST `/notifications`

Protected. Admin only.

Request:

```json
{
  "userId": "user-id",
  "title": "Appointment confirmed",
  "message": "Your appointment is confirmed",
  "type": "APPOINTMENT"
}
```

### GET `/notifications`

Protected.

Query adds:

```json
{
  "isRead": false
}
```

Response:

```json
{
  "data": [
    {
      "id": "notification-id",
      "userId": "user-id",
      "title": "Appointment confirmed",
      "message": "Your appointment is confirmed",
      "type": "APPOINTMENT",
      "isRead": false
    }
  ],
  "meta": {}
}
```

### PATCH `/notifications/:id`

Protected.

Request:

```json
{
  "isRead": true
}
```

### DELETE `/notifications/:id`

Protected.

## Admin Module

### GET `/admin/dashboard`

Protected. Admin only.

Response:

```json
{
  "usersCount": 0,
  "doctorsCount": 0,
  "patientsCount": 0,
  "appointmentsCount": 0,
  "pendingAppointments": 0,
  "completedAppointments": 0,
  "paidPayments": 0,
  "unreadNotifications": 0
}
```

## Reports Module

### GET `/reports/revenue`

Protected. Admin only.

Query:

```json
{
  "from": "2026-06-01",
  "to": "2026-06-30"
}
```

Response:

```json
{
  "_sum": {
    "amount": "0",
    "refundedAmount": "0"
  },
  "_count": {
    "id": 0
  }
}
```

### GET `/reports/appointments`

Protected. Admin only.

Query:

```json
{
  "from": "2026-06-01",
  "to": "2026-06-30"
}
```

Response:

```json
{
  "total": 0,
  "completed": 0,
  "cancelled": 0,
  "noShow": 0
}
```

## Frontend Integration Order

Recommended sequence:

1. Auth
2. Specialties and clinics
3. Doctors and doctor details
4. Availability and slots
5. Appointments
6. Patients and users
7. Prescriptions, records, reviews
8. Payments, notifications, admin, reports

## Notes

- Validation is strict, so frontend field names must match DTO names exactly.
- Most list APIs return paginated data with `data` and `meta`.
- Doctor registration depends on existing `specialtyId` and optional `clinicId`.
- Appointment booking depends on an available `timeSlotId`.
- Review creation requires a completed appointment and patient ownership.
- Prescription creation requires a completed appointment and doctor ownership.
