const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'courses' });
  if (error) {
    console.log("RPC get_table_columns failed, trying another way...");
    // Try querying a sample row
    const { data: sample, error: sampleError } = await supabase.from('courses').select('*').limit(1);
    if (sampleError) {
      console.error("Error fetching courses:", sampleError);
    } else {
      console.log("Columns in 'courses':", Object.keys(sample[0] || {}));
    }
  } else {
    console.log("Columns:", data);
  }
}

checkSchema();
