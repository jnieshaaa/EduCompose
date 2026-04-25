import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const supabaseKey = 'sb_secret_fcRaNPeSSpftU2Q9bilmRA_jSptAXwL'; // Service Role
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIsRead() {
  const { data, error } = await supabase
    .from('notifications')
    .select('is_read')
    .limit(1);

  if (error) {
    console.error('Error selecting is_read:', error.message);
    
    // Try selecting 'read' instead
    const { data: data2, error: error2 } = await supabase
      .from('notifications')
      .select('read')
      .limit(1);
      
    if (error2) {
       console.error('Error selecting read:', error2.message);
    } else {
       console.log("Found column: 'read'");
    }
  } else {
    console.log("Found column: 'is_read'");
  }
}

checkIsRead();
