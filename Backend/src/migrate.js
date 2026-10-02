import { migrate, pool } from "./db.js";

try {
  await migrate();
  console.log("Schema applied.");
} catch (e) {
  console.error(`Migration failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
