import { attachDatabasePool } from "@vercel/functions";
import { Pool, types } from "pg";

// Hand the client the same JSON shapes it was written against: ISO-8601
// timestamps (not Date objects) and numeric columns as numbers.
const parseTimestamp = types.getTypeParser(types.builtins.TIMESTAMPTZ);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (value) => (parseTimestamp(value) as Date).toISOString());
types.setTypeParser(types.builtins.NUMERIC, Number);

// Pooled Neon connection string. attachDatabasePool lets Vercel Fluid compute
// close idle clients before a function instance is suspended.
export const db = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(db);
