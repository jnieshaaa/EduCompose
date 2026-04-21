const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
  // Query information_schema
  const { data, error } = await supabase.rpc('check_column_types', { table_name: 'essay_analysis_results' });

  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema via a trick or just guess
    console.error('Error checking types:', error);
    
    // Fallback: try to insert a uuid and see what happens, or just look at the error hints
  } else {
    console.log('Column types:', data);
  }
}

// Since I can't easily add RPCs, I'll use a standard query that might work if permissions allow
async function checkViaSelect() {
    const { data, error } = await supabase
        .from('essay_analysis_results')
        .select('*')
        .limit(1);
    
    if (data && data.length > 0) {
        console.log('Sample Data Key Types:');
        for (const [key, value] of Object.entries(data[0])) {
            console.log(`${key}: ${typeof value} (Value: ${value})`);
        }
    }
}

checkViaSelect();
