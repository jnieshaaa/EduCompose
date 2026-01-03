#!/usr/bin/env python3
"""
Test script to verify Copyscape API credentials are loaded correctly
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"[OK] Loaded .env from: {env_path}")
else:
    print(f"[ERROR] .env file not found at: {env_path}")
    sys.exit(1)

# Check credentials
username = os.getenv("COPYSCAPE_USERNAME", "")
api_key = os.getenv("COPYSCAPE_API_KEY", "")

print("\n" + "=" * 60)
print("Copyscape API Credentials Check")
print("=" * 60)

if username:
    print(f"[OK] COPYSCAPE_USERNAME is set (length: {len(username)} characters)")
    print(f"      First 3 chars: {username[:3]}...")
else:
    print("[ERROR] COPYSCAPE_USERNAME is NOT SET")
    print("        -> Add to .env: COPYSCAPE_USERNAME=your_username")

if api_key:
    print(f"[OK] COPYSCAPE_API_KEY is set (length: {len(api_key)} characters)")
    print(f"      First 3 chars: {api_key[:3]}...")
else:
    print("[ERROR] COPYSCAPE_API_KEY is NOT SET")
    print("        -> Add to .env: COPYSCAPE_API_KEY=your_api_key")

if username and api_key:
    print("\n[OK] Both credentials are configured!")
    print("\nTo test the connection, run:")
    print("  GET http://localhost:8000/api/analysis/check-plagiarism-status")
else:
    print("\n[ERROR] Credentials are not fully configured")
    print("\nMake sure your .env file has (without # comment):")
    print("  COPYSCAPE_USERNAME=your_actual_username")
    print("  COPYSCAPE_API_KEY=your_actual_api_key")
    print("\nThen restart your backend server.")

