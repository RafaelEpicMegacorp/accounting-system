/*
  Warnings:

  - Added the required column `companyId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `method` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONTENT_MARKETING', 'PODCAST_SPONSORSHIP', 'SOCIAL_MEDIA', 'ADVERTISING', 'CREATIVE_SERVICES', 'PLATFORM_MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CRYPTO_WALLET', 'BANK_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'BTC', 'ETH');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'CRYPTO', 'OTHER');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "vatNumber" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "taxCode" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "signature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Insert default company from settings for existing data
INSERT INTO "companies" ("id", "name", "email", "address", "createdAt", "updatedAt")
SELECT 
    'cm3b4z5a6000000example', 
    "companyName", 
    "companyEmail", 
    "companyAddress",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "settings" 
WHERE "id" IS NOT NULL 
LIMIT 1;

-- Insert default company if no settings exist
INSERT INTO "companies" ("id", "name", "email", "createdAt", "updatedAt")
SELECT 'cm3b4z5a6000000example', 'Default Company', 'admin@company.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "settings");

-- Add companyId column to invoices with default value
ALTER TABLE "invoices" ADD COLUMN "companyId" TEXT;
UPDATE "invoices" SET "companyId" = 'cm3b4z5a6000000example';
ALTER TABLE "invoices" ALTER COLUMN "companyId" SET NOT NULL;

-- Add other invoice columns
ALTER TABLE "invoices" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';
ALTER TABLE "invoices" ADD COLUMN "notes" TEXT;

-- Handle payments method column change
ALTER TABLE "payments" ADD COLUMN "method_new" "PaymentType";
UPDATE "payments" SET "method_new" = 
    CASE 
        WHEN "method"::text = 'BANK_TRANSFER' THEN 'BANK_TRANSFER'::"PaymentType"
        WHEN "method"::text = 'CREDIT_CARD' THEN 'CREDIT_CARD'::"PaymentType"
        WHEN "method"::text = 'CHECK' THEN 'CHECK'::"PaymentType"
        WHEN "method"::text = 'CASH' THEN 'CASH'::"PaymentType"
        ELSE 'OTHER'::"PaymentType"
    END;
ALTER TABLE "payments" DROP COLUMN "method";
ALTER TABLE "payments" RENAME COLUMN "method_new" TO "method";
ALTER TABLE "payments" ALTER COLUMN "method" SET NOT NULL;

-- Drop old enum
DROP TYPE "PaymentMethod";

-- CreateTable
CREATE TABLE "service_library" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "defaultPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "name" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_library"("id") ON DELETE SET NULL ON UPDATE CASCADE;
