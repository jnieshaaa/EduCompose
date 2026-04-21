
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from frontend/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking table schemas...');

  // Check essays table
  const { data: essayCols, error: essayErr } = await supabase.rpc('get_table_columns', { table_name: 'essays' });
  if (essayErr) {
    console.error('Error fetching essays schema:', essayErr);
    // Fallback: just try to select one row
    const { data: essayRow } = await supabase.from('essays').select('*').limit(1);
    console.log('Sample essay row:', essayRow);
  } else {
    console.log('Essays columns:', essayCols);
  }

  // Check essay_analysis_results table
  const { data: analysisCols, error: analysisErr } = await supabase.rpc('get_table_columns', { table_name: 'essay_analysis_results' });
  if (analysisErr) {
    console.error('Error fetching essay_analysis_results schema:', analysisErr);
    const { data: analysisRow } = await supabase.from('essay_analysis_results').select('*').limit(1);
    console.log('Sample analysis row:', analysisRow);
  } else {
    console.log('Analysis columns:', analysisCols);
  }

  // Check a specific activity's rubric_id
  const { data: activities } = await supabase.from('essay_activities').select('id, rubric_id').limit(5);
  console.log('Recent activities:', activities);
}

checkSchema();
