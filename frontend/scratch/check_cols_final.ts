
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Testing column existence...');
  
  const { error: userError } = await supabase.from('courses').select('user_id').limit(1);
  console.log('user_id exists:', !userError);
  if (userError) console.log('user_id error:', userError.message);
  
  const { error: teacherError } = await supabase.from('courses').select('teacher_id').limit(1);
  console.log('teacher_id exists:', !teacherError);
  if (teacherError) console.log('teacher_id error:', teacherError.message);

  const { data } = await supabase.from('courses').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Sample row keys:', Object.keys(data[0]));
  }
}

checkColumns();
