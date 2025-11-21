"""
Helper script to switch from Aura to Desktop configuration
Updates .env file with Desktop settings
"""
import sys
from pathlib import Path

env_file = Path(__file__).parent.parent / ".env"

if not env_file.exists():
    print(f"❌ .env file not found at: {env_file}")
    sys.exit(1)

print("=" * 70)
print("Switch to Neo4j Desktop Configuration")
print("=" * 70)
print()
print("This will update your .env file for Neo4j Desktop (local).")
print()
print("⚠️  IMPORTANT:")
print("   1. Make sure Neo4j Desktop is installed")
print("   2. Create a database in Desktop first")
print("   3. Have your Desktop password ready")
print()

# Get password
password = input("Enter your Neo4j Desktop password: ").strip()

if not password:
    print("❌ Password cannot be empty!")
    sys.exit(1)

print()
print("Updating .env file...")

# Read current .env
with open(env_file, 'r') as f:
    lines = f.readlines()

# Update Neo4j settings
updated = False
new_lines = []

for line in lines:
    stripped = line.strip()
    
    # Comment out Aura settings
    if stripped.startswith("NEO4J_URI=") and "neo4j+s://" in stripped:
        new_lines.append("# " + line)  # Comment out Aura URI
        new_lines.append("NEO4J_URI=bolt://localhost:7687\n")  # Add Desktop URI
        updated = True
    elif stripped.startswith("# NEO4J_URI=") and "bolt://localhost" in stripped:
        # Already commented or already desktop
        new_lines.append("NEO4J_URI=bolt://localhost:7687\n")
        updated = True
    elif stripped.startswith("NEO4J_URI=") and "bolt://localhost" in stripped:
        # Already desktop, keep it
        new_lines.append(line)
        updated = True
    elif stripped.startswith("NEO4J_USERNAME=") or stripped.startswith("NEO4J_USER="):
        if stripped.startswith("#"):
            new_lines.append("NEO4J_USERNAME=neo4j\n")
        else:
            new_lines.append("NEO4J_USERNAME=neo4j\n")
        updated = True
    elif stripped.startswith("NEO4J_PASSWORD="):
        if stripped.startswith("#"):
            new_lines.append("# " + line)  # Comment out old
            new_lines.append(f"NEO4J_PASSWORD={password}\n")  # Add new
        else:
            new_lines.append(f"NEO4J_PASSWORD={password}\n")
        updated = True
    elif stripped.startswith("NEO4J_DATABASE="):
        if stripped.startswith("#"):
            new_lines.append("NEO4J_DATABASE=neo4j\n")
        else:
            new_lines.append("NEO4J_DATABASE=neo4j\n")
        updated = True
    else:
        new_lines.append(line)

# If no Neo4j settings found, add them
if not updated:
    # Check if Neo4j section exists
    neo4j_section = False
    for line in lines:
        if "Neo4j" in line or "NEO4J" in line:
            neo4j_section = True
            break
    
    if not neo4j_section:
        new_lines.append("\n# Neo4j Desktop Configuration (Local)\n")
        new_lines.append("NEO4J_URI=bolt://localhost:7687\n")
        new_lines.append("NEO4J_USERNAME=neo4j\n")
        new_lines.append(f"NEO4J_PASSWORD={password}\n")
        new_lines.append("NEO4J_DATABASE=neo4j\n")

# Write updated .env
with open(env_file, 'w') as f:
    f.writelines(new_lines)

print("✅ .env file updated!")
print()
print("Updated settings:")
print("   NEO4J_URI=bolt://localhost:7687")
print("   NEO4J_USERNAME=neo4j")
print(f"   NEO4J_PASSWORD={password[:10]}...")
print("   NEO4J_DATABASE=neo4j")
print()
print("Next steps:")
print("   1. Make sure Neo4j Desktop database is running (Active)")
print("   2. Test connection: python scripts/test_neo4j_connection.py")
print()

