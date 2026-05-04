import os
import glob
import re

def strip_console_statements(directory):
    # Find all TypeScript/JavaScript files in the directory
    files = glob.glob(os.path.join(directory, '**', '*.ts*'), recursive=True)
    files.extend(glob.glob(os.path.join(directory, '**', '*.js*'), recursive=True))
    
    count = 0
    # regex to match console.log or console.warn, including multiline up to the closing semicolon
    # it uses a basic approach and might not handle heavily nested parens perfectly but should work for most
    pattern = re.compile(r'^[ \t]*console\.(log|warn)\b[^\n]*$', re.MULTILINE)
    
    for filepath in files:
        if 'node_modules' in filepath or '.git' in filepath:
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Basic line-by-line removal for single-line console.logs
        lines = content.split('\n')
        new_lines = []
        modified = False
        
        in_multiline_console = False
        for line in lines:
            stripped = line.strip()
            # If it's already commented, skip removing it so we don't break code, or maybe remove it?
            # User said "remove all", so we can remove even commented ones
            if stripped.startswith('// console.log') or stripped.startswith('// console.warn'):
                modified = True
                continue
                
            if stripped.startswith('console.log(') or stripped.startswith('console.warn('):
                modified = True
                if not line.endswith(';'):
                    in_multiline_console = True
                continue
                
            if in_multiline_console:
                modified = True
                if line.endswith(';'):
                    in_multiline_console = False
                continue
                
            new_lines.append(line)
            
        if modified:
            new_content = '\n'.join(new_lines)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            
    print(f"Removed console statements from {count} files.")

if __name__ == "__main__":
    strip_console_statements('c:/Users/j_ant/projects/EduCompose/frontend/src')
