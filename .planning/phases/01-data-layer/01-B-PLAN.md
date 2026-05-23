---
phase: 01-data-layer
plan: B
type: execute
wave: 2
depends_on:
  - 01-A
files_modified:
  - prisma.config.ts
  - prisma/schema.prisma
  - prisma/migrations/
autonomous: false
requirements:
  - DATA-05

must_haves:
  truths:
    - "prisma.config.ts has both url and directUrl configured from environment variables"
    - "Migration runs successfully against Supabase PostgreSQL"
    - "CHECK constraints (qty >= 0, reservedQty >= 0) exist on Inventory table"
    - "Prisma client is generated at app/generated/prisma"
  artifacts:
    - path: "prisma.config.ts"
      provides: "Prisma datasource config with url + directUrl"
      contains: "directUrl"
    - path: "prisma/migrations/"
      provides: "Migration directory with at least one migration file"
    - path: "app/generated/prisma/"
      provides: "Generated Prisma client output"
  key_links:
    - from: "prisma.config.ts"
      to: ".env DIRECT_URL"
      via: "process.env['DIRECT_URL']"
      pattern: "DIRECT_URL"
    - from: "prisma/migrations/*/migration.sql"
      to: "Inventory table"
      via: "CHECK constraint SQL"
      pattern: "CHECK.*qty.*0"

user_setup:
  - service: supabase
    why: "DIRECT_URL env var required for Prisma migrations (pooler cannot run migrations)"
    env_vars:
      - name: DIRECT_URL
        source: "Supabase Dashboard → Project → Settings → Database → Connection string → URI (direct, not pooler). Format: postgresql://postgres.xxxx:password@aws-1-ap-south-1.supabase.com:5432/postgres"
    note: "DATABASE_URL should remain the pooler URL (port 6543). DIRECT_URL uses the direct connection (port 5432) for migrations only."
---

<objective>
Configure Prisma for Supabase migrations (add directUrl), run the database migration to create all tables, inject CHECK constraints via custom SQL, and generate the Prisma TypeScript client.

Purpose: Supabase uses PgBouncer (pooler) for the default connection, which cannot run DDL migrations. The directUrl bypasses the pooler for migration commands only. CHECK constraints preventing negative inventory cannot be expressed in Prisma SDL and must be added via raw SQL in the migration file.

Output: All 4 tables created in Supabase PostgreSQL, CHECK constraints on Inventory, generated Prisma client at app/generated/prisma/.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
@.agent/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-data-layer/01-CONTEXT.md
@.planning/codebase/INTEGRATIONS.md
@GEMINI.md

<interfaces>
<!-- Current prisma.config.ts:
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env["DATABASE_URL"],
    // directUrl: MISSING — needed for Supabase migrations
  },
});
-->

<!-- .env has both DATABASE_URL (pooler, port 6543) and DIRECT_URL (direct, port 5432).
     DIRECT_URL must be added to prisma.config.ts datasource for migrations to work. -->

<!-- CHECK constraint SQL to add to migration file:
ALTER TABLE "Inventory"
  ADD CONSTRAINT "Inventory_qty_non_negative" CHECK (qty >= 0),
  ADD CONSTRAINT "Inventory_reservedQty_non_negative" CHECK ("reservedQty" >= 0);
-->
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <what-built>Plan B requires DIRECT_URL to be present in .env before running migrations. The executor has verified .env exists but cannot confirm DIRECT_URL is set correctly.</what-built>
  <how-to-verify>
    1. Open `.env` in the project root
    2. Confirm `DIRECT_URL` is present and uses the direct Supabase connection string (port 5432, NOT 6543)
    3. Format: `DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-1-ap-south-1.supabase.com:5432/postgres`
    4. Get it from: Supabase Dashboard → Project → Settings → Database → Connection string → URI (switch to "Direct connection")
    5. If missing, add it now before continuing
  </how-to-verify>
  <resume-signal>Type "DIRECT_URL confirmed" when the env var is set correctly in .env</resume-signal>
</task>

<task type="auto">
  <name>Task 1: Add directUrl to prisma.config.ts</name>
  <files>prisma.config.ts</files>
  <read_first>
    - prisma.config.ts (current state shown in interfaces block above)
    - .env (verify DIRECT_URL key name matches exactly)
    - GEMINI.md (Prisma v7 config format)
  </read_first>
  <action>
    Add `directUrl: process.env["DIRECT_URL"]` to the datasource block in prisma.config.ts. The datasource block should have both url (pooler for app queries) and directUrl (direct connection for migrations). The result should be:

    datasource: {
      url: process.env["DATABASE_URL"],
      directUrl: process.env["DIRECT_URL"],
    }

    No other changes to the file.
  </action>
  <verify>
    <automated>grep "directUrl" prisma.config.ts</automated>
  </verify>
  <done>prisma.config.ts contains directUrl: process.env["DIRECT_URL"] in the datasource block.</done>
</task>

<task type="auto">
  <name>Task 2: Run migration and inject CHECK constraints</name>
  <files>prisma/migrations/</files>
  <read_first>
    - prisma/schema.prisma (from Plan A — must be complete with all 4 models before this runs)
    - prisma.config.ts (with directUrl from Task 1)
  </read_first>
  <action>
    Step 1 — Create the migration (do NOT apply yet):
    Run `npx prisma migrate dev --name init --create-only`
    This creates the migration SQL file at `prisma/migrations/[timestamp]_init/migration.sql` without applying it.

    Step 2 — Edit the generated migration.sql to append CHECK constraints BEFORE applying:
    Find the migration file and append these SQL statements after the Inventory table CREATE:

    ALTER TABLE "Inventory"
      ADD CONSTRAINT "Inventory_qty_non_negative" CHECK (qty >= 0),
      ADD CONSTRAINT "Inventory_reservedQty_non_negative" CHECK ("reservedQty" >= 0);

    Step 3 — Apply the migration:
    Run `npx prisma migrate dev`
    This applies the edited migration including the CHECK constraints.

    Step 4 — Generate the Prisma client:
    Run `npx prisma generate`
    This generates the TypeScript client at app/generated/prisma/ (per the generator output path).

    If the migration fails due to existing tables, run `npx prisma migrate reset --force` first (development only).
  </action>
  <verify>
    <automated>npx prisma migrate status 2>&1</automated>
  </verify>
  <done>
    `npx prisma migrate status` shows "Database schema is up to date!" with no pending migrations.
    `ls app/generated/prisma/` shows generated client files (index.js, index.d.ts, etc.).
    Running `npx prisma db execute --stdin --url "$DIRECT_URL" <<< "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='Inventory' AND constraint_type='CHECK';"` returns 2 rows (the CHECK constraints).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| .env → prisma.config.ts | Database credentials flow from env to Prisma config |
| Migration SQL → Supabase DB | Raw SQL executes against production database |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-B-01 | Information Disclosure | .env DIRECT_URL | mitigate | .env is in .gitignore; credentials never committed to git |
| T-01-B-02 | Tampering | migration.sql CHECK constraints | mitigate | CHECK constraints prevent negative stock at DB level — application bugs cannot bypass |
| T-01-B-03 | Denial of Service | migrate reset --force | accept | Development-only command; not available in production workflow |
</threat_model>

<verification>
1. `npx prisma migrate status` → "Database schema is up to date!"
2. `ls app/generated/prisma/` → shows generated client files
3. `grep "directUrl" prisma.config.ts` → matches
4. CHECK constraints exist: query information_schema.table_constraints for Inventory table
</verification>

<success_criteria>
- prisma.config.ts has directUrl pointing to DIRECT_URL env var
- Migration applied successfully to Supabase PostgreSQL
- CHECK constraints on Inventory.qty >= 0 and Inventory.reservedQty >= 0 exist at DB level
- Prisma client generated at app/generated/prisma/ (not @prisma/client)
- `npx prisma migrate status` shows no pending migrations
</success_criteria>

<output>
Create `.planning/phases/01-data-layer/01-B-SUMMARY.md` when done.
</output>
