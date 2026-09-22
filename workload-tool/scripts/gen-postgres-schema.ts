// Generate the Postgres variant of the schema from the SQL Server source.
// -----------------------------------------------------------------------------
//   npm run pg:schema
//
// prisma/schema.prisma stays the single source of truth. Postgres is a second
// deployment target (Supabase for demo/staging), not a fork — so the variant is
// DERIVED, never hand-edited. Change the source, re-run this, commit both.
//
// Only the connector-specific parts differ. Every model, field, relation and
// index is carried across untouched, so the two targets cannot drift apart.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { APP_SCHEMA } from "./app-schema";

const SOURCE = join(process.cwd(), "prisma", "schema.prisma");
const TARGET = join(process.cwd(), "prisma", "postgres", "schema.prisma");

// SQL Server native type -> Postgres native type.
//   UniqueIdentifier -> Uuid       (both 16-byte UUIDs)
//   NVarChar(Max)    -> Text       (Postgres has no length ceiling to opt out of)
//   NVarChar(n)      -> VarChar(n) (Postgres text is already Unicode)
function convertNativeTypes(schema: string): string {
  return schema
    .replace(/@db\.UniqueIdentifier/g, "@db.Uuid")
    .replace(/@db\.NVarChar\(Max\)/g, "@db.Text")
    .replace(/@db\.NVarChar\((\d+)\)/g, "@db.VarChar($1)");
}

function convertDatasource(schema: string): string {
  const block = /datasource db \{[^}]*\}/m;
  if (!block.test(schema)) {
    throw new Error("Could not find the datasource block in schema.prisma.");
  }
  return schema.replace(
    block,
    `datasource db {
  provider = "postgresql"
  // ONE connection string, and it must be the SESSION-mode one (port 5432).
  //
  // There is deliberately no directUrl: directUrl exists to give migrations a
  // non-pooled connection when the app runs through a transaction-mode pooler,
  // and this app cannot use a transaction-mode pooler at all — its interactive
  // transactions, which keep a ticket change and its audit row atomic, do not
  // survive one. Since the app and migrations both need the session connection,
  // a second variable would only be the same value twice, with a chance of the
  // two drifting apart.
  url      = env("DATABASE_URL")
  // This app owns exactly one schema. Scoping it here is what makes it safe to
  // share a database with an unrelated application: Prisma neither reads nor
  // migrates anything outside "${APP_SCHEMA}", so another app's tables can
  // never register as drift and can never be dropped by a migration.
  schemas  = ["${APP_SCHEMA}"]
}`
  );
}

function convertGenerator(schema: string): string {
  const block = /generator client \{[^}]*\}/m;
  if (!block.test(schema)) {
    throw new Error("Could not find the generator block in schema.prisma.");
  }
  // multiSchema is GA as of Prisma 6 and warns if declared as a preview
  // feature, so the generator block is carried across unchanged.
  return schema.replace(
    block,
    `generator client {
  provider = "prisma-client-js"
}`
  );
}

/**
 * multiSchema requires every model to declare its schema. Done line-wise rather
 * than with a regex over whole blocks: model bodies contain braces, and a
 * pattern that gets that subtly wrong would silently mis-tag a model.
 */
function addSchemaAttributes(schema: string): string {
  const out: string[] = [];
  let depth = 0;
  let inModel = false;

  for (const line of schema.split("\n")) {
    const trimmed = line.trim();

    if (!inModel && /^model\s+\w+\s*\{/.test(trimmed)) {
      inModel = true;
      depth = 1;
      out.push(line);
      continue;
    }

    if (inModel) {
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;

      if (depth + opens - closes === 0) {
        // Closing line of the model — inject the attribute just before it.
        out.push("");
        out.push(`  @@schema("${APP_SCHEMA}")`);
        out.push(line);
        inModel = false;
        depth = 0;
        continue;
      }
      depth += opens - closes;
    }

    out.push(line);
  }

  if (inModel) throw new Error("Unbalanced braces while scanning models.");
  return out.join("\n");
}

const HEADER = `// ⚠️  GENERATED FILE — DO NOT EDIT.
//
// Produced from prisma/schema.prisma by scripts/gen-postgres-schema.ts.
// Edit the source schema and run \`npm run pg:schema\` instead; any change made
// here is lost on the next generation.
//
// Differences from the source, and nothing else:
//   * datasource provider sqlserver -> postgresql, plus directUrl
//   * datasource scoped to the "${APP_SCHEMA}" schema, and @@schema on each model
//   * @db.UniqueIdentifier -> @db.Uuid
//   * @db.NVarChar(Max)    -> @db.Text
//   * @db.NVarChar(n)      -> @db.VarChar(n)
//
// NOTE: the NoAction referential actions on Assignment.agent are a SQL Server
// requirement (it rejects multiple cascade paths). Postgres does not need them,
// but they are kept so both targets behave identically.

`;

function main(): void {
  const source = readFileSync(SOURCE, "utf8");

  let converted = convertNativeTypes(source);
  converted = convertGenerator(converted);
  converted = convertDatasource(converted);
  converted = addSchemaAttributes(converted);

  const leftovers = converted.match(/@db\.(NVarChar|UniqueIdentifier)\S*/g);
  if (leftovers) {
    throw new Error(
      `Unconverted SQL Server native types remain: ${[...new Set(leftovers)].join(", ")}`
    );
  }

  const modelCount = (source.match(/^model\s+\w+/gm) ?? []).length;
  const tagged = (converted.match(/@@schema\(/g) ?? []).length;
  if (modelCount !== tagged) {
    throw new Error(
      `Tagged ${tagged} models with @@schema but the source has ${modelCount}.`
    );
  }

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, HEADER + converted);
  console.log(`Wrote ${TARGET} (${modelCount} models in schema "${APP_SCHEMA}")`);
}

main();
