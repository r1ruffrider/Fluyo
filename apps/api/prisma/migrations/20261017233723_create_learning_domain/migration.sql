-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('phrase_choice');

-- CreateEnum
CREATE TYPE "ActivityAttemptResult" AS ENUM ('correct', 'incorrect');

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "required_entitlement_key" VARCHAR(100),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lessons_slug_check" CHECK (length(btrim("slug")) > 0),
    CONSTRAINT "lessons_title_check" CHECK (length(btrim("title")) > 0),
    CONSTRAINT "lessons_sort_order_check" CHECK ("sort_order" > 0)
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "published_version" INTEGER,
    "required_entitlement_key" VARCHAR(100),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_sort_order_check" CHECK ("sort_order" > 0),
    CONSTRAINT "activities_published_version_check" CHECK ("published_version" IS NULL OR "published_version" > 0),
    CONSTRAINT "activities_entitlement_key_check" CHECK ("required_entitlement_key" IS NULL OR length(btrim("required_entitlement_key")) > 0)
);

-- CreateTable
CREATE TABLE "activity_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "content_version" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "feedback" JSONB NOT NULL,
    "validation" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_versions_content_version_check" CHECK ("content_version" > 0),
    CONSTRAINT "activity_versions_prompt_check" CHECK (length(btrim("prompt")) > 0),
    CONSTRAINT "activity_versions_choices_check" CHECK (jsonb_typeof("choices") = 'array'),
    CONSTRAINT "activity_versions_feedback_check" CHECK (jsonb_typeof("feedback") = 'object'),
    CONSTRAINT "activity_versions_validation_check" CHECK (jsonb_typeof("validation") = 'object')
);

-- CreateTable
CREATE TABLE "phrase_decks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "source_locale" VARCHAR(35) NOT NULL,
    "target_locale" VARCHAR(35) NOT NULL,
    "required_entitlement_key" VARCHAR(100),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phrase_decks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phrase_decks_slug_check" CHECK (length(btrim("slug")) > 0),
    CONSTRAINT "phrase_decks_title_check" CHECK (length(btrim("title")) > 0),
    CONSTRAINT "phrase_decks_source_locale_check" CHECK (length(btrim("source_locale")) > 0),
    CONSTRAINT "phrase_decks_target_locale_check" CHECK (length(btrim("target_locale")) > 0),
    CONSTRAINT "phrase_decks_entitlement_key_check" CHECK ("required_entitlement_key" IS NULL OR length(btrim("required_entitlement_key")) > 0)
);

-- CreateTable
CREATE TABLE "phrases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deck_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "source_text" TEXT NOT NULL,
    "target_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phrases_sort_order_check" CHECK ("sort_order" > 0),
    CONSTRAINT "phrases_source_text_check" CHECK (length(btrim("source_text")) > 0),
    CONSTRAINT "phrases_target_text_check" CHECK (length(btrim("target_text")) > 0)
);

-- CreateTable
CREATE TABLE "lesson_phrase_decks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_phrase_decks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lesson_phrase_decks_sort_order_check" CHECK ("sort_order" > 0)
);

-- CreateTable
CREATE TABLE "activity_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "content_version" INTEGER NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "selected_choice_id" VARCHAR(100) NOT NULL,
    "result" "ActivityAttemptResult" NOT NULL,
    "response" JSONB NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_attempts_request_hash_check" CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "activity_attempts_choice_id_check" CHECK (length(btrim("selected_choice_id")) > 0)
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "next_activity_id" UUID,
    "completed_activity_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "timezone" VARCHAR(100) NOT NULL,
    "completed_activity_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_days_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_days_timezone_check" CHECK (length(btrim("timezone")) > 0),
    CONSTRAINT "practice_days_completed_count_check" CHECK ("completed_activity_count" >= 0)
);

-- CreateTable
CREATE TABLE "learning_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "daily_target" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_goals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learning_goals_daily_target_check" CHECK ("daily_target" BETWEEN 1 AND 20)
);

-- CreateTable
CREATE TABLE "learning_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learning_preferences_timezone_check" CHECK (length(btrim("timezone")) > 0)
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "practice_reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminder_local_time" TIME(0) NOT NULL DEFAULT '09:00:00'::time,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_sort_order_key" ON "lessons"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "activities_lesson_order_key" ON "activities"("lesson_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "activities_id_lesson_key" ON "activities"("id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_versions_activity_version_key" ON "activity_versions"("activity_id", "content_version");

-- CreateIndex
CREATE UNIQUE INDEX "phrase_decks_slug_key" ON "phrase_decks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "phrases_deck_order_key" ON "phrases"("deck_id", "sort_order");

-- CreateIndex
CREATE INDEX "lesson_phrase_decks_deck_id_idx" ON "lesson_phrase_decks"("deck_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_phrase_decks_lesson_deck_key" ON "lesson_phrase_decks"("lesson_id", "deck_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_phrase_decks_lesson_order_key" ON "lesson_phrase_decks"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "activity_attempts_user_activity_time_idx" ON "activity_attempts"("user_id", "activity_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_attempts_user_idempotency_key" ON "activity_attempts"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "lesson_progress_user_updated_idx" ON "lesson_progress"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "lesson_progress_next_activity_idx" ON "lesson_progress"("next_activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_user_lesson_key" ON "lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "practice_days_user_date_idx" ON "practice_days"("user_id", "local_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "practice_days_user_local_date_key" ON "practice_days"("user_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "learning_goals_user_id_key" ON "learning_goals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_preferences_user_id_key" ON "learning_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_id_published_version_fkey" FOREIGN KEY ("id", "published_version") REFERENCES "activity_versions"("activity_id", "content_version") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_versions" ADD CONSTRAINT "activity_versions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "phrase_decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_phrase_decks" ADD CONSTRAINT "lesson_phrase_decks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_phrase_decks" ADD CONSTRAINT "lesson_phrase_decks_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "phrase_decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_activity_id_content_version_fkey" FOREIGN KEY ("activity_id", "content_version") REFERENCES "activity_versions"("activity_id", "content_version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_next_activity_id_lesson_id_fkey" FOREIGN KEY ("next_activity_id", "lesson_id") REFERENCES "activities"("id", "lesson_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON COLUMN "activity_attempts"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "lesson_progress"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "practice_days"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "learning_goals"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "learning_preferences"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "notification_preferences"."user_id" IS 'Verified Supabase Auth user UUID';
COMMENT ON COLUMN "activity_versions"."validation" IS 'Server-only answer validation; never returned in catalog responses';
COMMENT ON COLUMN "activity_attempts"."response" IS 'Original safe API response used for idempotent replay';

CREATE FUNCTION "prevent_published_activity_version_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD."published_at" IS NOT NULL THEN
        RAISE EXCEPTION 'published activity versions are immutable';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "activity_versions_published_immutable"
BEFORE UPDATE OR DELETE ON "activity_versions"
FOR EACH ROW
EXECUTE FUNCTION "prevent_published_activity_version_mutation"();
