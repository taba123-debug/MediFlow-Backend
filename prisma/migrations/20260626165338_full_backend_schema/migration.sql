/*
  Warnings:

  - The values [PENDING] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `appointmentAt` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the `DoctorEducation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DoctorLanguage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DoctorTag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `appointmentDate` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consultationType` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledEndAt` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledStartAt` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('CLINIC_VISIT', 'ONLINE_CONSULTATION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT', 'PAYMENT', 'REVIEW', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
ALTER TABLE "public"."Appointment" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Appointment" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'UNPAID';
COMMIT;

-- DropForeignKey
ALTER TABLE "DoctorEducation" DROP CONSTRAINT "DoctorEducation_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "DoctorLanguage" DROP CONSTRAINT "DoctorLanguage_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "DoctorTag" DROP CONSTRAINT "DoctorTag_doctorId_fkey";

-- DropIndex
DROP INDEX "Appointment_doctorId_appointmentAt_idx";

-- DropIndex
DROP INDEX "Appointment_patientId_appointmentAt_idx";

-- DropIndex
DROP INDEX "MedicalRecord_appointmentId_key";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "appointmentAt",
DROP COLUMN "endTime",
DROP COLUMN "startTime",
DROP COLUMN "type",
ADD COLUMN     "appointmentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "consultationType" "ConsultationType" NOT NULL,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "scheduledEndAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "scheduledStartAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "timeSlotId" TEXT,
ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "qualification" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "refundedAmount" DECIMAL(10,2),
ALTER COLUMN "status" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenHash" TEXT;

-- DropTable
DROP TABLE "DoctorEducation";

-- DropTable
DROP TABLE "DoctorLanguage";

-- DropTable
DROP TABLE "DoctorTag";

-- DropEnum
DROP TYPE "AppointmentType";

-- CreateTable
CREATE TABLE "DoctorTimeSlot" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "availabilityId" TEXT,
    "slotDate" TIMESTAMP(3) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "instructions" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorTimeSlot_doctorId_slotDate_isBooked_isActive_idx" ON "DoctorTimeSlot"("doctorId", "slotDate", "isBooked", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorTimeSlot_doctorId_startAt_endAt_key" ON "DoctorTimeSlot"("doctorId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_patientId_idx" ON "Prescription"("doctorId", "patientId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_patientId_appointmentDate_idx" ON "Appointment"("patientId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Clinic_name_city_idx" ON "Clinic"("name", "city");

-- CreateIndex
CREATE INDEX "DoctorAvailability_doctorId_dayOfWeek_isActive_idx" ON "DoctorAvailability"("doctorId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "DoctorProfile_specialtyId_clinicId_idx" ON "DoctorProfile"("specialtyId", "clinicId");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientId_recordDate_idx" ON "MedicalRecord"("patientId", "recordDate");

-- CreateIndex
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Review_doctorId_rating_idx" ON "Review"("doctorId", "rating");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- AddForeignKey
ALTER TABLE "DoctorTimeSlot" ADD CONSTRAINT "DoctorTimeSlot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTimeSlot" ADD CONSTRAINT "DoctorTimeSlot_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "DoctorAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "DoctorTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
