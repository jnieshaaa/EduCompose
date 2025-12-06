#!/usr/bin/env python3
"""
Test script to verify Gemini API connection without running the full application.
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
    print("   Or set GEMINI_API_KEY as an environment variable directly")
except Exception as e:
    print(f"⚠️  Could not load .env file: {e}")

def test_gemini_connection():
    """Test Gemini API connection and list available models"""
    try:
        import google.generativeai as genai
        print("✅ google-generativeai package is installed")
    except ImportError:
        print("❌ google-generativeai package is not installed")
        print("   Install it with: pip install google-generativeai")
        return False
    
    # Check for API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY environment variable is not set")
        print("   Set it in your .env file or export it:")
        print("   export GEMINI_API_KEY=your_api_key_here")
        return False
    
    print(f"✅ GEMINI_API_KEY is set (length: {len(api_key)} characters)")
    
    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        print("✅ Gemini API configured successfully")
        
        # List available models
        print("\n📋 Listing ALL available models...")
        models = genai.list_models()
        
        all_models = []
        available_models = []
        
        # Convert to list first (generator might be consumed)
        models_list = list(models)
        print(f"   Found {len(models_list)} total models\n")
        
        for model in models_list:
            all_models.append(model)
            methods = getattr(model, 'supported_generation_methods', None) or []
            
            # Check for generateContent (case-insensitive, check for variations)
            methods_lower = [str(m).lower() for m in methods] if methods else []
            supports_generate = (
                methods and (
                    'generateContent' in methods or 
                    'generate_content' in methods or
                    'generatecontent' in methods_lower or
                    'generate' in methods_lower
                )
            )
            
            if supports_generate:
                available_models.append(model.name)
                print(f"   ✅ {model.name}")
                print(f"      Generation methods: {methods}")
        
        # Show first 10 models that don't support generateContent for reference
        non_generate_models = [m for m in all_models if m.name not in available_models]
        if non_generate_models:
            print(f"\n   📋 Sample of other models (showing first 10):")
            for model in non_generate_models[:10]:
                methods = model.supported_generation_methods
                print(f"      - {model.name}")
                if methods:
                    print(f"        Methods: {methods}")
        
        if not available_models:
            print("\n   ⚠️  No models found that support generateContent")
            print("   Showing first 20 available models and their methods:")
            for model in all_models[:20]:
                methods = getattr(model, 'supported_generation_methods', None)
                print(f"      - {model.name}")
                if methods:
                    print(f"        Methods: {list(methods)}")
                else:
                    print(f"        Methods: None or not available")
            if len(all_models) > 20:
                print(f"      ... and {len(all_models) - 20} more models")
            
            # Try to find gemini models by name pattern
            print("\n   🔍 Searching for Gemini models by name pattern...")
            gemini_models = [m for m in all_models if 'gemini' in m.name.lower()]
            if gemini_models:
                print(f"   Found {len(gemini_models)} models with 'gemini' in name:")
                for model in gemini_models[:10]:
                    print(f"      - {model.name}")
                    methods = getattr(model, 'supported_generation_methods', None)
                    if methods:
                        print(f"        Methods: {list(methods)}")
                # Add these to available_models to try them
                available_models = [m.name for m in gemini_models]
            else:
                print("   No models with 'gemini' in name found")
            
            print("\n   💡 Trying to use models anyway (some APIs work differently)...")
            # Don't return False yet - try using the models anyway
        
        # Test with available models first (use exact names from API)
        print("\n🧪 Testing available models from API...")
        working_model = None
        
        # Try different formats of the model names from the API
        print("\n🧪 Testing model names in different formats...")
        for model_name in available_models:
            # Try multiple formats
            test_formats = [
                model_name,  # Original format from API
                model_name.replace('models/', ''),  # Without models/ prefix
                model_name.replace('models/', '').split('/')[-1],  # Just the last part
            ]
            
            # Remove duplicates while preserving order
            seen = set()
            test_formats = [f for f in test_formats if f not in seen and not seen.add(f)]
            
            for test_name in test_formats:
                try:
                    model = genai.GenerativeModel(test_name)
                    # Try a simple generation
                    response = model.generate_content("Say hello")
                    if response and response.text:
                        print(f"   ✅ {test_name} - WORKS!")
                        working_model = test_name
                        break
                except Exception as e:
                    error_msg = str(e)
                    # Only show non-404 errors to reduce noise
                    if "404" not in error_msg and "not found" not in error_msg.lower():
                        print(f"   ⚠️  {test_name} - Error: {error_msg[:60]}")
            
            if working_model:
                break
        
        # Fallback: try common model name variations
        if not working_model:
            print("\n🧪 Trying common model name variations...")
            test_models = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-pro',
            ]
            
            for model_name in test_models:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content("Say hello")
                    if response and response.text:
                        print(f"   ✅ {model_name} - WORKS!")
                        working_model = model_name
                        break
                except Exception as e:
                    print(f"   ❌ {model_name} - Error: {str(e)[:60]}")
        
        if working_model:
            print(f"\n✅ SUCCESS! Use model name: {working_model}")
            print(f"\n💡 Add this to your .env file:")
            print(f"   GEMINI_MODEL_NAME={working_model}")
            return True
        else:
            print("\n❌ None of the tested model names worked")
            print("\n💡 Available models from API:")
            for model_name in available_models:
                print(f"   - {model_name}")
            print("\n💡 Try setting GEMINI_MODEL_NAME in your .env to one of the above")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to Gemini API: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False


def test_simple_generation():
    """Test a simple text generation"""
    try:
        import google.generativeai as genai
        import os
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY not set")
            return False
        
        genai.configure(api_key=api_key)
        
        # Try with the model name that worked
        print("\n🧪 Testing simple text generation...")
        
        # Try common model names
        for model_name in ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-pro']:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Say hello in one word")
                print(f"✅ Model '{model_name}' works!")
                print(f"   Response: {response.text}")
                return True
            except Exception as e:
                print(f"❌ Model '{model_name}' failed: {str(e)[:60]}")
        
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Gemini API Connection Test")
    print("=" * 60)
    print()
    
    success = test_gemini_connection()
    
    if success:
        print("\n" + "=" * 60)
        test_simple_generation()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Tests failed. Check the errors above.")
        sys.exit(1)

