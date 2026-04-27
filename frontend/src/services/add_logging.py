import os

path = r'c:\Users\j_ant\projects\EduCompose\frontend\src\services\activityService.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of gradeEssay
start_idx = -1
for i, line in enumerate(lines):
    if 'export const gradeEssay = async (' in line:
        start_idx = i
        break

if start_idx == -1:
    print("Could not find start of gradeEssay")
    exit(1)

# Find the part where it updates the 
update_idx = -1
for i in range(start_idx, len(lines)):
    if '.update({' in lines[i] and '.from("essays")' in lines[i-1]:
        update_idx = i
        break

if update_idx != -1:
    # Add logging before update
    log_line = '    console.log("[gradeEssay] Updating essay ID:", essayData.id, "with scores:", analysisResult.scores);\n'
    lines.insert(update_idx - 1, log_line)
    
    # Also find where it returns success
    for i in range(update_idx, len(lines)):
        if 'return { success: true };' in lines[i]:
            lines.insert(i, '    console.log("[gradeEssay] Successfully completed grading for essay ID:", essayData.id);\n')
            break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Successfully added logging to gradeEssay")
