CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

COMMENT ON COLUMN "user_profiles"."id" IS 'Supabase Auth user UUID verified by the API';
