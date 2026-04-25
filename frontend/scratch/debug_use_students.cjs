const { createClient } = require('@supabase/supabase-js');
const url = 'https://ifyacvbvfleyvzgglvqo.supabase.co';
const key = 'sb_secret_fcRaNPeSSpftU2Q9bilmRA_jSptAXwL';
const supabase = createClient(url, key);

async function checkData() {
  const blockId = '47b8fba2-cf72-48dc-8798-99b948c20222';
  
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
            *,
            block_students!fk_block_students_user!inner (
              block_id,
              blocks (
                id,
                name,
                teacher_program_loads!fk_block_program_load (
                  teacher_course_loads (
                    academic_year,
                    term
                  )
                )
              )
            )
      `)
      .eq("role", "student")
      .eq("block_students.block_id", blockId);

    if (error) {
      console.error("Error:", error);
      return;
    }

    console.log("Data count:", data.length);
    if (data.length > 0) {
      console.log("Structure of first student's block_students[0]:");
      const bs = data[0].block_students[0];
      console.log("Blocks:", JSON.stringify(bs.blocks, null, 2));
    } else {
      console.log("No data returned from query.");
    }
  } catch (err) {
    console.error("Catch Error:", err);
  }
}

checkData();
