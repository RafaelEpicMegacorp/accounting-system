-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'PAID_IN_ADVANCE');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "ccEmails" TEXT[],
ADD COLUMN     "preferredCurrency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "primaryContactEmail" TEXT,
ADD COLUMN     "primaryContactName" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bicSwift" TEXT,
ADD COLUMN     "defaultCurrency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "service_library" ADD COLUMN     "billingCycle" "BillingCycle",
ADD COLUMN     "billingDay" INTEGER,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "recurring_subscriptions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "billingDay" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPaidInAdvance" BOOLEAN NOT NULL DEFAULT false,
    "advancePaidUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_subscriptions_clientId_idx" ON "recurring_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_serviceId_idx" ON "recurring_subscriptions"("serviceId");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_companyId_idx" ON "recurring_subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_status_idx" ON "recurring_subscriptions"("status");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_nextBillingDate_idx" ON "recurring_subscriptions"("nextBillingDate");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_status_nextBillingDate_idx" ON "recurring_subscriptions"("status", "nextBillingDate");

-- CreateIndex
CREATE INDEX "clients_primaryContactEmail_idx" ON "clients"("primaryContactEmail");

-- CreateIndex
CREATE INDEX "companies_userId_idx" ON "companies"("userId");

-- CreateIndex
CREATE INDEX "companies_userId_isDefault_idx" ON "companies"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "service_library_category_idx" ON "service_library"("category");

-- CreateIndex
CREATE INDEX "service_library_isRecurring_idx" ON "service_library"("isRecurring");

-- CreateIndex
CREATE INDEX "service_library_isActive_idx" ON "service_library"("isActive");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_subscriptions" ADD CONSTRAINT "recurring_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_subscriptions" ADD CONSTRAINT "recurring_subscriptions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_subscriptions" ADD CONSTRAINT "recurring_subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
