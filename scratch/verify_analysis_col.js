const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

async function checkActualSchema() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  // Use a direct query to information_schema via RPC if possible, 
  // or just try to select the column specifically.
  const { data, error } = await supabase
    .from('essays')
    .select('id, analysis')
    .limit(1);

  if (error) {
    console.error('Error selecting analysis column:', error);
  } else {
    console.log('Success! Column exists and is accessible.');
  }
}

checkActualSchema();
