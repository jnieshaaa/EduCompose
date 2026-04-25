const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ifyacvbvfleyvzgglvqo.supabase.co";
const supabaseKey = "sb_publishable_Q6pZjHQxXeeJCUfiWtcsGA_UnEJLe7V";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking essay_activities schema...");
  const { data, error, count } = await supabase.from('essay_activities').select('id', { count: 'exact' });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Total activities:", count);
    if (count > 0) {
       const { data: first } = await supabase.from('essay_activities').select('*').limit(1);
       console.log("First row keys:", Object.keys(first[0]));
       // Check if course_id is an array
       const sample = first[0];
       console.log("course_id type:", Array.isArray(sample.course_id) ? 'Array' : typeof sample.course_id);
       console.log("block_id type:", Array.isArray(sample.block_id) ? 'Array' : typeof sample.block_id);
       console.log("program_id type:", Array.isArray(sample.program_id) ? 'Array' : typeof sample.program_id);
    }
  }
}

checkSchema();
