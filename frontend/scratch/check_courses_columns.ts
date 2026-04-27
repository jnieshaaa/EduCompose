
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Checking courses table...');
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching courses:', error);
    // Try to check specific columns
    const { error: userError } = await supabase.from('courses').select('user_id').limit(1);
    console.log('user_id select error:', userError?.message);
    
    const { error: teacherError } = await supabase.from('courses').select('teacher_id').limit(1);
    console.log('teacher_id select error:', teacherError?.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in courses table:', Object.keys(data[0]));
  } else {
    console.log('No data in courses table.');
  }
}

checkColumns();
