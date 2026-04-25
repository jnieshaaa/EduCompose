import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './frontend/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRubrics() {
  console.log('Fetching all rubrics from database...');
  const { data, error } = await supabase
    .from('rubrics')
    .select('id, name, user_id, created_at');

  if (error) {
    console.error('Error fetching rubrics:', error);
    return;
  }

  console.log('--- RUBRICS LIST ---');
  data.forEach(r => {
    console.log(`ID: ${r.id} | Name: "${r.name}" | user_id: ${r.user_id} | Created: ${r.created_at}`);
  });
  console.log('--- END ---');
}

checkRubrics();
