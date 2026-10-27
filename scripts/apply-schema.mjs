// Applies db/schema.sql to the database in DATABASE_URL_UNPOOLED. Schema
// changes go over the direct connection, not the pooler.
import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL_UNPOOLED (corré `vercel env pull` primero).");
  process.exit(1);
}

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(schema);
  console.log("Esquema aplicado.");
} finally {
  await client.end();
}
