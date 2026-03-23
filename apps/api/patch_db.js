const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:jkSBarLOLBlakBEdabwVWkUUSlVjxeOe@autorack.proxy.rlwy.net:17861/railway'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB.");

    try {
      await client.query(`ALTER TABLE "card_settings" ADD COLUMN "terms_text" text;`);
      console.log("Added terms_text column.");
    } catch (e) {
      console.log("terms_text might already exist:", e.message);
    }
    
    try {
      await client.query(`ALTER TABLE "card_settings" ADD COLUMN "headmaster_signature_url" text;`);
      console.log("Added headmaster_signature_url column.");
    } catch (e) {
      console.log("headmaster_signature_url might already exist:", e.message);
    }
    
    try {
      await client.query(`ALTER TABLE "card_settings" ADD COLUMN "kemenag_logo_url" text;`);
      console.log("Added kemenag_logo_url column.");
    } catch (e) {
      console.log("kemenag_logo_url might already exist:", e.message);
    }
    
    try {
      await client.query(`ALTER TABLE "card_settings" ADD COLUMN "school_stamp_url" text;`);
      console.log("Added school_stamp_url column.");
    } catch (e) {
      console.log("school_stamp_url might already exist:", e.message);
    }

    console.log("Finished patching db.");
  } catch (error) {
    console.error("Connection error", error);
  } finally {
    await client.end();
  }
}

run();
