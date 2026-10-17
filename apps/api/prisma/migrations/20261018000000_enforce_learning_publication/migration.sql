ALTER TABLE "lessons"
    ADD CONSTRAINT "lessons_entitlement_key_check"
    CHECK ("required_entitlement_key" IS NULL OR length(btrim("required_entitlement_key")) > 0);

CREATE FUNCTION "ensure_activity_published_version_is_published"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."published_version" IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM "activity_versions"
        WHERE "activity_id" = NEW."id"
          AND "content_version" = NEW."published_version"
          AND "published_at" IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'activity published version must reference published content';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "activities_published_version_is_published"
BEFORE INSERT OR UPDATE OF "published_version" ON "activities"
FOR EACH ROW
EXECUTE FUNCTION "ensure_activity_published_version_is_published"();
