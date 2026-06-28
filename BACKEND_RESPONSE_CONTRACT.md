# Backend Response Contract

This file defines the standard backend response and error shape for all modules in this project.

## Goals

- return accurate validation errors directly from the backend
- give the frontend field-level errors when possible
- keep business/auth/not-found errors simple and consistent
- standardize list responses across patient, doctor, admin, and reports modules

## Success Response Shapes

### 1. Paginated list response

Use this for list endpoints.

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

Examples:

- `GET /patient/appointments`
- `GET /patient/medical-records`
- `GET /patient/reviews`
- `GET /patient/notifications`
- `GET /patient/payments`

### 2. Single object response

Use a direct object for single-resource reads and module-specific summary endpoints.

```json
{
  "id": "resource-id",
  "name": "Example"
}
```

Examples:

- `GET /patient/dashboard`
- `GET /patient/profile`
- `GET /patient/appointments/:id`
- `GET /patient/payments/:id`

### 3. Mutation response

Use the updated or created object directly, or a small status object when that is the endpoint purpose.

Examples:

```json
{
  "id": "appointment-id",
  "status": "CANCELLED"
}
```

```json
{
  "message": "Review deleted successfully."
}
```

## Error Response Shapes

## 1. Validation error

Use this shape for DTO validation and request payload validation failures.

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "name": ["name should not be empty"],
    "email": ["email must be an email"],
    "password": ["password must be longer than or equal to 8 characters"]
  }
}
```

Notes:

- `errors` keys map to request field names.
- values are arrays because one field may have multiple validation messages.
- nested DTO fields should use dot notation if needed.

## 2. Business rule error

Use this for domain logic failures.

```json
{
  "statusCode": 400,
  "message": "Appointments cannot be booked in the past."
}
```

Other examples:

```json
{
  "statusCode": 409,
  "message": "email already exists",
  "errors": {
    "email": ["email already exists"]
  }
}
```

```json
{
  "statusCode": 404,
  "message": "Appointment not found."
}
```

## 3. Authentication error

```json
{
  "statusCode": 401,
  "message": "Invalid email or password"
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token"
}
```

## 4. Forbidden error

```json
{
  "statusCode": 403,
  "message": "You do not have access to this appointment."
}
```

## 5. Unexpected server error

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Frontend Handling Rules

Frontend should process backend errors in this order:

1. If `errors.fieldName` exists, show that under the matching field.
2. If only `message` exists, show it as a form-level or toast error.
3. If neither exists, show a generic fallback such as `Request failed`.

## Current Backend Implementation

These rules are now enforced globally through:

- NestJS `ValidationPipe` with custom `exceptionFactory`
- global application exception filter
- Prisma error normalization

Key behavior:

- class-validator DTO errors return `message: "Validation failed"` plus `errors`
- `HttpException` errors return `statusCode` and `message`
- Prisma unique constraint failures return a precise conflict message
- unexpected errors return a safe 500 response

## Recommended Module Rule

All new modules should follow this same standard:

- list endpoints: `{ data, meta }`
- single object endpoints: direct object
- validation errors: `{ statusCode, message, errors }`
- business/auth/not-found errors: `{ statusCode, message }`
