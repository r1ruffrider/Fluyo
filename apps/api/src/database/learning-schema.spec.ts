import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20261017233723_create_learning_domain/migration.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const publicationMigration = readFileSync(
  resolve(
    __dirname,
    "../../prisma/migrations/20261018000000_enforce_learning_publication/migration.sql",
  ),
  "utf8",
);

describe("learning-domain migration", () => {
  it("binds published and attempted content to the owning activity version", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("id", "published_version") REFERENCES "activity_versions"("activity_id", "content_version")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("activity_id", "content_version") REFERENCES "activity_versions"("activity_id", "content_version")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("next_activity_id", "lesson_id") REFERENCES "activities"("id", "lesson_id")',
    );
  });

  it("enforces owner-scoped idempotency and progress projection uniqueness", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "activity_attempts_user_idempotency_key" ON "activity_attempts"("user_id", "idempotency_key")',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "lesson_progress_user_lesson_key" ON "lesson_progress"("user_id", "lesson_id")',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "practice_days_user_local_date_key" ON "practice_days"("user_id", "local_date")',
    );
  });

  it("keeps auth ownership logical and goal bounds database-enforced", () => {
    expect(migration).not.toContain('REFERENCES "user_profiles"');
    expect(migration).toContain(
      'CONSTRAINT "learning_goals_daily_target_check" CHECK ("daily_target" BETWEEN 1 AND 20)',
    );
    expect(migration).toContain(
      'CONSTRAINT "activity_attempts_request_hash_check" CHECK ("request_hash" ~ \'^[0-9a-f]{64}$\')',
    );
  });

  it("protects published activity versions from destructive edits", () => {
    expect(migration).toContain('CREATE FUNCTION "prevent_published_activity_version_mutation"');
    expect(migration).toContain('CREATE TRIGGER "activity_versions_published_immutable"');
    expect(migration).toContain('IF OLD."published_at" IS NOT NULL THEN');
  });

  it("allows published pointers only to content marked as published", () => {
    expect(publicationMigration).toContain(
      'CREATE FUNCTION "ensure_activity_published_version_is_published"',
    );
    expect(publicationMigration).toContain('AND "content_version" = NEW."published_version"');
    expect(publicationMigration).toContain('AND "published_at" IS NOT NULL');
    expect(publicationMigration).toContain(
      'CREATE TRIGGER "activities_published_version_is_published"',
    );
  });
});
