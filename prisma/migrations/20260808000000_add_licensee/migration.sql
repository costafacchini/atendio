-- CreateTable
CREATE TABLE "licensees" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "apiToken" TEXT NOT NULL,
    "licenseKind" TEXT NOT NULL,
    "useChatbot" BOOLEAN NOT NULL DEFAULT false,
    "chatbotDefault" TEXT,
    "chatbotUrl" TEXT,
    "chatbotApiToken" TEXT,
    "messageOnResetChatbot" TEXT,
    "messageOnCloseChat" TEXT,
    "chatbotAuthorizationToken" TEXT,
    "whatsappDefault" TEXT,
    "whatsappToken" TEXT,
    "whatsappUrl" TEXT,
    "chatDefault" TEXT,
    "chatUrl" TEXT,
    "chatKey" TEXT,
    "chatIdentifier" TEXT,
    "unidadeId" TEXT,
    "statusId" TEXT,
    "useWhatsappWindow" BOOLEAN NOT NULL DEFAULT false,
    "document" TEXT,
    "kind" TEXT,
    "financial_player_fee" DOUBLE PRECISION,
    "holder_name" TEXT,
    "bank" TEXT,
    "branch_number" TEXT,
    "branch_check_digit" TEXT,
    "account_number" TEXT,
    "account_check_digit" TEXT,
    "holder_kind" TEXT,
    "holder_document" TEXT,
    "account_type" TEXT,
    "card_information_url" TEXT,
    "useSenderName" BOOLEAN NOT NULL DEFAULT false,
    "useDepartments" BOOLEAN NOT NULL DEFAULT false,
    "useFileIDYcloud" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licensees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licensees_mongo_id_key" ON "licensees"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "licensees_apiToken_key" ON "licensees"("apiToken");
