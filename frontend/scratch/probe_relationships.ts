
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkForeignKeys() {
  console.log('Checking foreign keys for courses table...');
  
  // Try to find foreign keys using a simple join on pg_catalog if possible, 
  // but since we only have public schema access via Supabase JS, 
  // we might be limited unless we have an RPC.
  
  // Let's try to query courses with different join names to see what works.
  const joins = ['user_id', 'teacher_id', 'users', 'author_id'];
  
  for (const join of joins) {
    const { error } = await supabase
      .from('courses')
      .select(`id, users:${join}(id)`)
      .limit(1);
    
    console.log(`Join on users:${join}:`, error ? `FAILED (${error.message})` : 'SUCCESS');
  }

  // Also check if 'users' table is directly joinable without a column name if it's the only FK
  const { error: directError } = await supabase
    .from('courses')
    .select(`id, users(id)`)
    .limit(1);
  console.log(`Join on users (direct):`, directError ? `FAILED (${directError.message})` : 'SUCCESS');
}

checkForeignKeys();
