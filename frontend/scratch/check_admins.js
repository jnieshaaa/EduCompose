import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_secret_fcRaNPeSSpftU2Q9bilmRA_jSptAXwL'; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, first_name, last_name')
    .limit(20);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Users found (Service Role):', data);
}

listUsers();
