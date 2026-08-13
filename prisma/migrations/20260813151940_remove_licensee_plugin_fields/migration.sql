/*
  Warnings:

  - You are about to drop the column `chatDefault` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `chatIdentifier` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `chatKey` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `chatUrl` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappDefault` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappToken` on the `licensees` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappUrl` on the `licensees` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bodies" DROP CONSTRAINT "bodies_department_fkey";

-- DropForeignKey
ALTER TABLE "bodies" DROP CONSTRAINT "bodies_inbox_fkey";

-- DropForeignKey
ALTER TABLE "bodies" DROP CONSTRAINT "bodies_licensee_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_licensee_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_inbox_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_licensee_fkey";

-- DropForeignKey
ALTER TABLE "inboxes" DROP CONSTRAINT "inboxes_licensee_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_contact_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_department_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_inbox_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_licensee_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_room_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_trigger_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_agent_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_contact_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_department_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_inbox_fkey";

-- DropForeignKey
ALTER TABLE "templates" DROP CONSTRAINT "templates_licensee_fkey";

-- DropForeignKey
ALTER TABLE "triggers" DROP CONSTRAINT "triggers_licensee_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_licensee_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_sessions" DROP CONSTRAINT "whatsapp_sessions_inbox_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_sessions" DROP CONSTRAINT "whatsapp_sessions_licensee_fkey";

-- AlterTable
ALTER TABLE "licensees" DROP COLUMN "chatDefault",
DROP COLUMN "chatIdentifier",
DROP COLUMN "chatKey",
DROP COLUMN "chatUrl",
DROP COLUMN "whatsappDefault",
DROP COLUMN "whatsappToken",
DROP COLUMN "whatsappUrl";
