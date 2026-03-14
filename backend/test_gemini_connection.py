#!/usr/bin/env python3
"""
Test script to verify Gemini API connection using the new google-genai SDK.
This script tests the connection and lists available models.
"""

import os
import sys
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env from the backend directory
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
    print(f"📁 Loading .env from: {env_path}")
except ImportError:
    print("⚠️  python-dotenv not installed. Install it with: pip install python-dotenv")
except Exception as e:
    print(f"⚠️  Could not load .env file: {e}")

def test_gemini_connection():
    """Test Gemini API connection and list available models"""
    try:
        from google import genai
        print("✅ google-genai package is installed")
    except ImportError:
        print("❌ google-genai package is not installed")
        print("   Install it with: pip install google-genai")
        return False
    
    # Check for API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable is not set")
        return False
    
    print(f"✅ GEMINI_API_KEY is set (length: {len(api_key)} characters)")
    
    try:
        # Configure Gemini Client
        client = genai.Client(api_key=api_key)
        print("✅ Gemini API Client initialized successfully")
        
        # List available models
        print("\n📋 Listing common Gemini models...")
        common_models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        ]
        
        working_model = None
        for model_id in common_models:
            try:
                model = client.models.get(model=model_id)
                print(f"   ✅ Found model: {model_id}")
                
                # Test a simple generation
                print(f"      🧪 Testing generation...")
                response = client.models.generate_content(
                    model=model_id,
                    contents="Say hello in one word"
                )
                if response and response.text:
                    print(f"      ✨ Response: {response.text.strip()}")
                    working_model = model_id
                    break
            except Exception as e:
                print(f"   ❌ Model {model_id} failed or not found: {str(e)[:60]}")
        
        if working_model:
            print(f"\n✅ SUCCESS! Use model name: {working_model}")
            print(f"\n💡 Add this to your .env file:")
            print(f"   GEMINI_MODEL_NAME={working_model}")
            return True
        else:
            print("\n❌ None of the common model names worked")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to Gemini API: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Gemini API Connection Test (New SDK)")
    print("=" * 60)
    print()
    
    success = test_gemini_connection()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Tests failed. Check the errors above.")
        sys.exit(1)
