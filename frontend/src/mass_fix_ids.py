import os
import re

src_dir = r'c:\Users\j_ant\projects\EduCompose\frontend\src'
exclude_files = ['Input.tsx', 'Select.tsx']

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file in exclude_files:
            continue
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace id: 1 to id: '1'
            new_content = re.sub(r'id:\s*(\d+)', r"id: '\1'", content)
            
            # Replace Date.now() in id assignments with String(Date.now())
            new_content = re.sub(r'id:\s*Date\.now\(\)', r"id: String(Date.now())", new_content)

            # Replace idx + 1 or i + 1 in id assignments with String(idx + 1)
            new_content = re.sub(r'id:\s*(idx|i)\s*\+\s*1', r"id: String(\1 + 1)", new_content)
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")
