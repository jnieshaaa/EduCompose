#!/usr/bin/env python3
"""
Revised diagnostic script for the NEW google-genai SDK.
"""

import os
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
except:
    pass

def diagnostic_test():
    try:
        from google import genai
    except ImportError:
        print("❌ google-genai not installed")
        return

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        return

    client = genai.Client(api_key=api_key)
    
    print("\n🔍 Fetching all available models for your API Key...")
    try:
        models = client.models.list()
        print(f"{'MODEL NAME':<40} | {'CAPABILITIES'}")
        print("-" * 70)
        
        for m in models:
            # Check for capabilities - in the new SDK, it might be in different fields
            # Let's check common ones or just print the name
            name = m.name if hasattr(m, 'name') else str(m)
            
            # Try to find generation methods safely
            methods = []
            if hasattr(m, 'supported_generation_methods'):
                methods = m.supported_generation_methods
            
            methods_str = ", ".join(methods) if methods else "Unknown"
            status = "✨" if "generateContent" in methods_str else "  "
            
            print(f"{status} {name:<38} | {methods_str}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print("\n💡 Tip: Since gemini-2.0-flash gave a 429 error earlier, it means the model IS available but your quota is empty.")

if __name__ == "__main__":
    diagnostic_test()
