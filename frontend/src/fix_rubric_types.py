import re

path = r'c:\Users\j_ant\projects\EduCompose\frontend\src\components\rubrics\types.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace id: 1 to id: '1', etc.
# Only for id property inside objects
content = re.sub(r'id:\s*(\d+)', r"id: '\1'", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Updated: {path}")
