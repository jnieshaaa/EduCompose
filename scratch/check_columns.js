const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('essays')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching essays:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in essays table:', Object.keys(data[0]));
  } else {
    console.log('No data in essays table, trying to get columns via RPC or metadata...');
    // fall back
  }
}

checkSchema();
