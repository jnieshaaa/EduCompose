import os
import httpx
import asyncio
from dotenv import load_dotenv

async def test_hf_connection():
    # Force load from backend/.env
    env_path = os.path.join(os.getcwd(), 'backend', '.env')
    load_dotenv(env_path)
    
    token = os.getenv("HUGGING_FACE_HUB_TOKEN")
    model_id = os.getenv("HUGGING_FACE_MODEL_ID")
    
    print(f"--- HF Connection Test ---")
    print(f"Model ID: {model_id}")
    print(f"Token Found: {'Yes' if token else 'No'}")
    
    if not token or not model_id:
        print("Error: Missing token or model_id in .env")
        return

    url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"inputs": "This is a test sentence to check classification."}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS! Model is accessible.")
            print(f"Response: {response.json()}")
        elif response.status_code == 503:
            print("Model is loading on Hugging Face. Please wait a few minutes and try again.")
        else:
            print(f"Failed. Error: {response.text}")
            
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_hf_connection())
