import { db } from "./src/db"; 
import { ppdbPendaftar } from "./src/db/schema"; 
async function run() { 
  const res = await db.select().from(ppdbPendaftar); 
  console.log("Pendaftar Count:", res.length); 
  process.exit(0); 
} 
run();
