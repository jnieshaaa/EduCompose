import os

path = r'c:\Users\j_ant\projects\EduCompose\frontend\src\services\activityService.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Fix allowResubmission to handle multiple essays (delete all)
# Find the start of allowResubmission
allow_start = -1
for i, line in enumerate(lines):
    if 'export const allowResubmission = async (' in line:
        allow_start = i
        break

if allow_start != -1:
    # Look for the .maybeSingle() call
    for i in range(allow_start, allow_start + 100):
        if '.maybeSingle()' in lines[i] and 'existingEssay' in lines[i-5:i+1][0] or 'existingEssay' in "".join(lines[i-5:i+1]):
             # Replace from the select to the delete
             # Actually, let's just rewrite the whole block from step 2
             pass

# It's better to use a more surgical approach or rewrite the function
# Let's use a simpler way to find the lines
def find_and_replace_block(lines, start_pattern, end_pattern, new_block):
    start_idx = -1
    for i, line in enumerate(lines):
        if start_pattern in line:
            start_idx = i
            break
    if start_idx == -1: return lines
    
    end_idx = -1
    for i in range(start_idx, len(lines)):
        if end_pattern in lines[i]:
            end_idx = i + 1
            break
    if end_idx == -1: return lines
    
    return lines[:start_idx] + [new_block] + lines[end_idx:]

# Fix allowResubmission
new_allow_block = """    // 2. Remove existing submission if it exists
    // We fetch all submissions for this student/activity and delete them
    const { data: existingEssays, error: fetchError } = await supabase
      .from("essays")
      .select("id, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityId);

    if (fetchError) {
      console.error("[allowResubmission] Error fetching existing essays:", fetchError);
    }

    if (existingEssays && existingEssays.length > 0) {
      console.log(`[allowResubmission] Found ${existingEssays.length} essays to delete.`);
      
      for (const essay of existingEssays) {
        // Delete file from storage
        if (essay.file_path) {
          await supabase.storage.from("essays").remove([essay.file_path]);
        }

        // Delete database record (cascades to analysis results)
        const { error: delError } = await supabase.from("essays").delete().eq("id", essay.id);
        if (delError) {
           console.error(`[allowResubmission] Error deleting essay ${essay.id}:`, delError);
        } else {
           console.log(`[allowResubmission] Deleted existing essay ${essay.id} for resubmission.`);
        }
      }
    }
"""

lines = find_and_replace_block(lines, '// 2. Remove existing submission if it exists', 'console.log(', new_allow_block)
# Note: I need to be careful with the end pattern. 
# The original code had console.log on the next line.

# Let's try again with more context for the patterns
# I'll just rewrite the file content more carefully.
# Actually, I'll use replace_file_content for specific parts.
