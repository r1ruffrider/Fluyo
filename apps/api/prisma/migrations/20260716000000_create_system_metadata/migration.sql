CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "system_metadata" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_metadata_key_key" ON "system_metadata"("key");
