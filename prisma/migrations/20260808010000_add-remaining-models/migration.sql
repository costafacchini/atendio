-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "language" TEXT NOT NULL DEFAULT 'pt',
    "licensee" VARCHAR(24),
    "blockedLicensees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT,
    "number" TEXT NOT NULL,
    "type" TEXT,
    "talkingWithChatBot" BOOLEAN NOT NULL,
    "email" TEXT,
    "licensee" VARCHAR(24) NOT NULL,
    "waId" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "landbotId" TEXT,
    "chatwootId" TEXT,
    "chatwootSourceId" TEXT,
    "city" TEXT,
    "uf" TEXT,
    "wa_start_chat" TIMESTAMP(3),
    "document" TEXT,
    "customer_id" TEXT,
    "credit_card_id" TEXT,
    "credit_cards" JSONB,
    "widgetSessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inboxes" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "licensee" VARCHAR(24) NOT NULL,
    "kind" TEXT NOT NULL,
    "whatsappDefault" TEXT NOT NULL DEFAULT '',
    "whatsappToken" TEXT,
    "whatsappUrl" TEXT,
    "chatDefault" TEXT NOT NULL DEFAULT '',
    "chatUrl" TEXT,
    "chatKey" TEXT,
    "chatIdentifier" TEXT,
    "inboxToken" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "roomId" TEXT,
    "token" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "contact" VARCHAR(24) NOT NULL,
    "agent" VARCHAR(24),
    "department" VARCHAR(24),
    "inbox" VARCHAR(24),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "namespace" TEXT,
    "language" TEXT,
    "category" TEXT,
    "waId" TEXT,
    "licensee" VARCHAR(24) NOT NULL,
    "headerParams" JSONB,
    "bodyParams" JSONB,
    "footerParams" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triggers" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT,
    "triggerKind" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "catalogId" TEXT,
    "catalogMulti" TEXT,
    "catalogSingle" TEXT,
    "textReplyButton" TEXT,
    "messagesList" TEXT,
    "text" TEXT,
    "licensee" VARCHAR(24) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "licensee" VARCHAR(24) NOT NULL,
    "users" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "departmentToken" TEXT NOT NULL,
    "inbox" VARCHAR(24),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "licensee" VARCHAR(24) NOT NULL,
    "inbox" VARCHAR(24),
    "creds" JSONB,
    "keys" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodies" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "content" JSONB NOT NULL,
    "licensee" VARCHAR(24) NOT NULL,
    "kind" TEXT NOT NULL,
    "department" VARCHAR(24),
    "inbox" VARCHAR(24),
    "concluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "mongo_id" VARCHAR(24) NOT NULL,
    "number" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT,
    "url" TEXT,
    "fileName" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "destination" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "departament" TEXT,
    "senderName" TEXT,
    "sended" BOOLEAN NOT NULL DEFAULT false,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "licensee" VARCHAR(24) NOT NULL,
    "contact" VARCHAR(24) NOT NULL,
    "room" VARCHAR(24),
    "department" VARCHAR(24),
    "inbox" VARCHAR(24),
    "trigger" VARCHAR(24),
    "messageWaId" TEXT,
    "attachmentWaId" TEXT,
    "sendedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "messageChatId" TEXT,
    "error" TEXT,
    "payload" TEXT,
    "replyMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mongo_id_key" ON "users"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_mongo_id_key" ON "contacts"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_mongo_id_key" ON "inboxes"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_inboxToken_key" ON "inboxes"("inboxToken");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_mongo_id_key" ON "rooms"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "templates_mongo_id_key" ON "templates"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "triggers_mongo_id_key" ON "triggers"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_mongo_id_key" ON "departments"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_departmentToken_key" ON "departments"("departmentToken");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_mongo_id_key" ON "whatsapp_sessions"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "bodies_mongo_id_key" ON "bodies"("mongo_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_mongo_id_key" ON "messages"("mongo_id");
