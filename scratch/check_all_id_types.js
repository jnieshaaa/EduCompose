const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

async function checkAllTableTypes() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  const tables = ['students', 'essays', 'essay_analysis_results', 'notifications'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (data && data.length > 0) {
        console.log(`Table: ${table}`);
        for (const [key, value] of Object.entries(data[0])) {
            if (key === 'id' || key.endsWith('_id')) {
                console.log(`  ${key}: ${typeof value} (Value: ${value})`);
            }
        }
    } else if (error) {
        console.error(`Error checking ${table}:`, error);
    } else {
        console.log(`Table: ${table} (Empty)`);
    }
  }
}

checkAllTableTypes();
