-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "enquiryNotifyWhatsapp" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "entityType" TEXT,
    "entityId" UUID,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessage_status_nextAttemptAt_idx" ON "WhatsAppMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_entityType_entityId_idx" ON "WhatsAppMessage"("entityType", "entityId");
