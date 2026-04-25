const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V';

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
