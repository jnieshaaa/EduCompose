import re

path = r'c:\Users\j_ant\projects\EduCompose\frontend\src\services\rubricImportService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace id: 1 to id: '1', etc.
content = re.sub(r'id:\s*(\d+)', r"id: '\1'", content)

# Replace dynamic IDs with String()
content = content.replace('id: score.id || j + 1', 'id: String(score.id || j + 1)')
content = content.replace('id: criterion.id || i + 1', 'id: String(criterion.id || i + 1)')
content = content.replace('id: idx + 1', 'id: String(idx + 1)')
content = content.replace('id: parsedCriteria.length + 1', 'id: String(parsedCriteria.length + 1)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Updated: {path}")
