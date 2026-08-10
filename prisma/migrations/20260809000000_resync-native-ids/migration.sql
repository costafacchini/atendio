-- Drop mongo_id columns from all tables
ALTER TABLE "licensees" DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "users"     DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "contacts"  DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "inboxes"   DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "rooms"     DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "templates" DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "triggers"  DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "departments"     DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "whatsapp_sessions" DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "bodies"   DROP COLUMN IF EXISTS "mongo_id";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "mongo_id";

-- Replace VARCHAR FK columns with INTEGER FK columns on users
ALTER TABLE "users" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "users" ADD COLUMN "licensee" INTEGER REFERENCES "licensees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- contacts
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "contacts" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- inboxes
ALTER TABLE "inboxes" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "inboxes" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- rooms
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "contact";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "agent";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "department";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "inbox";
ALTER TABLE "rooms" ADD COLUMN "contact"    INTEGER NOT NULL REFERENCES "contacts"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD COLUMN "agent"      INTEGER          REFERENCES "users"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD COLUMN "department" INTEGER          REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD COLUMN "inbox"      INTEGER          REFERENCES "inboxes"("id")     ON DELETE SET NULL ON UPDATE CASCADE;

-- templates
ALTER TABLE "templates" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "templates" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- triggers
ALTER TABLE "triggers" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "triggers" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- departments
ALTER TABLE "departments" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "inbox";
ALTER TABLE "departments" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departments" ADD COLUMN "inbox"    INTEGER          REFERENCES "inboxes"("id")   ON DELETE SET NULL ON UPDATE CASCADE;

-- whatsapp_sessions
ALTER TABLE "whatsapp_sessions" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "whatsapp_sessions" DROP COLUMN IF EXISTS "inbox";
ALTER TABLE "whatsapp_sessions" ADD COLUMN "licensee" INTEGER NOT NULL REFERENCES "licensees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_sessions" ADD COLUMN "inbox"    INTEGER          REFERENCES "inboxes"("id")   ON DELETE SET NULL ON UPDATE CASCADE;

-- bodies
ALTER TABLE "bodies" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "bodies" DROP COLUMN IF EXISTS "department";
ALTER TABLE "bodies" DROP COLUMN IF EXISTS "inbox";
ALTER TABLE "bodies" ADD COLUMN "licensee"   INTEGER NOT NULL REFERENCES "licensees"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bodies" ADD COLUMN "department" INTEGER          REFERENCES "departments"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bodies" ADD COLUMN "inbox"      INTEGER          REFERENCES "inboxes"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

-- messages
ALTER TABLE "messages" DROP COLUMN IF EXISTS "licensee";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "contact";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "room";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "department";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "inbox";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "trigger";
ALTER TABLE "messages" ADD COLUMN "licensee"   INTEGER NOT NULL REFERENCES "licensees"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD COLUMN "contact"    INTEGER NOT NULL REFERENCES "contacts"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD COLUMN "room"       INTEGER          REFERENCES "rooms"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD COLUMN "department" INTEGER          REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD COLUMN "inbox"      INTEGER          REFERENCES "inboxes"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD COLUMN "trigger"    INTEGER          REFERENCES "triggers"("id")    ON DELETE SET NULL ON UPDATE CASCADE;
