-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('general_question', 'technical_question', 'refund_request');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "category" "TicketCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
