-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "priceMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundMinor" INTEGER;
