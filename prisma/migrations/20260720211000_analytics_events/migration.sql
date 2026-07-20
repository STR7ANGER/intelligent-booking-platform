-- CreateEnum
CREATE TYPE "AnalyticsEventKind" AS ENUM ('PAGE_VIEW', 'SEARCH_STARTED', 'SEARCH_EMPTY', 'HOLD_FAILED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED');

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" "AnalyticsEventKind" NOT NULL,
    "sessionIdHash" TEXT NOT NULL,
    "organizationId" TEXT,
    "resourceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_event_occurredAt_idx" ON "AnalyticsEvent"("organizationId", "event", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionIdHash_occurredAt_idx" ON "AnalyticsEvent"("sessionIdHash", "occurredAt");
