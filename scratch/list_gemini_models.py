import os
import google.generativeai as genai
from dotenv import load_dotenv

def list_gemini_models():
    # Force load from backend/.env
    env_path = os.path.join(os.getcwd(), 'backend', '.env')
    load_dotenv(env_path)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: No GEMINI_API_KEY found in .env")
        return

    print(f"--- Gemini Model List (via google-generativeai) ---")
    try:
        genai.configure(api_key=api_key)
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"{m.name}")
                
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_gemini_models()
