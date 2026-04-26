/**
 * Patch script: Ensure card_settings table has all required columns.
 * Run with: node patch_card_settings.js
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function patch() {
  const client = await pool.connect();
  try {
    // First, check if the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'card_settings'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('card_settings table does not exist — creating it...');
      await client.query(`
        CREATE TABLE card_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_name VARCHAR(100) NOT NULL DEFAULT 'Sekolah',
          school_subtitle VARCHAR(150) NOT NULL DEFAULT '-',
          school_logo_url VARCHAR(255),
          academic_year VARCHAR(50) NOT NULL DEFAULT '2025/2026',
          selected_template VARCHAR(50) DEFAULT 'classic-blue',
          orientation VARCHAR(20) DEFAULT 'vertical',
          show_qr_code BOOLEAN DEFAULT true,
          qr_code_content VARCHAR(50) DEFAULT 'nisn',
          terms_text TEXT,
          headmaster_signature_url TEXT,
          kemenag_logo_url TEXT,
          school_stamp_url TEXT,
          custom_template_horizontal_front_url TEXT,
          custom_template_horizontal_back_url TEXT,
          custom_template_vertical_front_url TEXT,
          custom_template_vertical_back_url TEXT
        );
      `);
      console.log('✅ card_settings table created.');
    } else {
      console.log('card_settings table exists — checking columns...');
      
      // Columns that may have been added after initial migration
      const columnsToAdd = [
        { name: 'headmaster_signature_url', type: 'TEXT' },
        { name: 'kemenag_logo_url', type: 'TEXT' },
        { name: 'school_stamp_url', type: 'TEXT' },
        { name: 'custom_template_horizontal_front_url', type: 'TEXT' },
        { name: 'custom_template_horizontal_back_url', type: 'TEXT' },
        { name: 'custom_template_vertical_front_url', type: 'TEXT' },
        { name: 'custom_template_vertical_back_url', type: 'TEXT' },
      ];
      
      for (const col of columnsToAdd) {
        const colCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'card_settings' AND column_name = $1
          );
        `, [col.name]);
        
        if (!colCheck.rows[0].exists) {
          console.log(`  Adding missing column: ${col.name}`);
          await client.query(`ALTER TABLE card_settings ADD COLUMN ${col.name} ${col.type};`);
        } else {
          console.log(`  ✓ ${col.name} exists`);
        }
      }
      console.log('✅ All columns verified.');
    }
    
    // Show current data
    const rows = await client.query('SELECT id, school_name FROM card_settings LIMIT 5;');
    console.log(`\nCurrent rows in card_settings: ${rows.rowCount}`);
    rows.rows.forEach(r => console.log(`  - ${r.id}: ${r.school_name}`));
    
  } catch (err) {
    console.error('❌ Patch failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

patch();
