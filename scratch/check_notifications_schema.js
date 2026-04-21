const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

async function checkNotificationsSchema() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  // Use a query that will fail or return metadata
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'notifications' });

  if (error) {
     // Fallback: simple query to check typical columns
     const { data: sample, error: sampleError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);
    
     if (sampleError) {
         console.error('Error checking notifications:', sampleError);
     } else {
         console.log('Sample Notification:', sample);
     }
  } else {
    console.log('Table Schema:', data);
  }
}

checkNotificationsSchema();
