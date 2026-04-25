import os

src_dir = r'c:\Users\j_ant\projects\EduCompose\frontend\src'
exclude_files = ['Input.tsx', 'Select.tsx']

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file in exclude_files:
            continue
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content.replace('string | number', 'string')
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")
