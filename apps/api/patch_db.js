const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:jkSBarLOLBlakBEdabwVWkUUSlVjxeOe@autorack.proxy.rlwy.net:17861/railway'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB.");

    const cols = [
      'custom_template_horizontal_front_url',
      'custom_template_horizontal_back_url',
      'custom_template_vertical_front_url',
      'custom_template_vertical_back_url'
    ];

    for (const col of cols) {
      try {
        await client.query(`ALTER TABLE "card_settings" ADD COLUMN "${col}" text;`);
        console.log(`Added ${col} column.`);
      } catch (e) {
        console.log(`${col} might already exist:`, e.message);
      }
    }

    console.log("Finished patching db.");
  } catch (error) {
    console.error("Connection error", error);
  } finally {
    await client.end();
  }
}

run();
