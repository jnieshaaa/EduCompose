
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking database schema for ID types...");
  
  // We'll use a hacky way to check types by querying information_schema if possible,
  // or just querying one row and checking the value format.
  
  const tables = ['essays', 'essay_activities', 'essay_analysis_results', 'students'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`Error querying table ${table}:`, error.message);
        continue;
      }
      
      console.log(`\n--- Table: ${table} ---`);
      if (data && data.length > 0) {
        Object.keys(data[0]).forEach(key => {
          const val = data[0][key];
          if (key.includes('id')) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));
            console.log(`${key}: ${val} (Type: ${typeof val}, Is UUID: ${isUuid})`);
          }
        });
      } else {
        console.log("No data found in table to check types.");
      }
    } catch (err) {
      console.error(`Unexpected error for ${table}:`, err);
    }
  }
}

checkSchema();
