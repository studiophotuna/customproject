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

const SOURCE = join(process.cwd(), "prisma", "schema.prisma");
const TARGET = join(process.cwd(), "prisma", "postgres", "schema.prisma");

// SQL Server native type -> Postgres native type.
//   UniqueIdentifier -> Uuid      (both 16-byte UUIDs)
//   NVarChar(Max)    -> Text      (Postgres has no length ceiling to opt out of)
//   NVarChar(n)      -> VarChar(n)(Postgres text is already Unicode)
function convertNativeTypes(schema: string): string {
  return schema
    .replace(/@db\.UniqueIdentifier/g, "@db.Uuid")
    .replace(/@db\.NVarChar\(Max\)/g, "@db.Text")
    .replace(/@db\.NVarChar\((\d+)\)/g, "@db.VarChar($1)");
}

function convertDatasource(schema: string): string {
  const source = /datasource db \{[^}]*\}/m;
  if (!source.test(schema)) {
    throw new Error("Could not find the datasource block in schema.prisma.");
  }
  return schema.replace(
    source,
    `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  // Migrations and introspection need a direct (session-mode) connection.
  // On Supabase, DIRECT_URL is the :5432 connection string. Interactive
  // transactions do not work through a transaction-mode pooler, and this app
  // relies on them for ticket + audit atomicity — see the README.
  directUrl = env("DIRECT_URL")
}`
  );
}

const HEADER = `// ⚠️  GENERATED FILE — DO NOT EDIT.
//
// Produced from prisma/schema.prisma by scripts/gen-postgres-schema.ts.
// Edit the source schema and run \`npm run pg:schema\` instead; any change made
// here is lost on the next generation.
//
// Differences from the source, and nothing else:
//   * datasource provider sqlserver -> postgresql, plus directUrl
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
  const converted = convertDatasource(convertNativeTypes(source));

  const leftovers = converted.match(/@db\.(NVarChar|UniqueIdentifier)\S*/g);
  if (leftovers) {
    throw new Error(
      `Unconverted SQL Server native types remain: ${[...new Set(leftovers)].join(", ")}`
    );
  }

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, HEADER + converted);
  console.log(`Wrote ${TARGET}`);
}

main();
