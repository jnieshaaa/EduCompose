
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Inspecting courses table schema...');
  
  // 1. Get columns directly from information_schema
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'courses' });

  if (colError) {
    console.error('Error with RPC get_table_columns:', colError);
    // Fallback: use a raw query if RPC doesn't exist
    const { data: rawCols, error: rawError } = await supabase
      .from('courses')
      .select('*')
      .limit(0);
    
    if (rawError) {
      console.error('Error fetching courses with select *:', rawError);
    } else {
      console.log('Columns (from select *):', Object.keys(rawCols || {}));
    }
  } else {
    console.log('Columns (from RPC):', columns);
  }

  // 2. Check for relationships
  console.log('\nChecking for relationships via select...');
  const { error: relError } = await supabase
    .from('courses')
    .select('*, users:user_id(*)')
    .limit(1);
  
  console.log('Relationship with users:user_id error:', relError?.message || 'NONE (SUCCESS)');

  const { error: relTeacherError } = await supabase
    .from('courses')
    .select('*, users:teacher_id(*)')
    .limit(1);
  
  console.log('Relationship with users:teacher_id error:', relTeacherError?.message || 'NONE (SUCCESS)');
}

inspectSchema();
