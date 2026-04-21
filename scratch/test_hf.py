import os
import httpx
import asyncio
from dotenv import load_dotenv

async def test_hf_connectivity():
    load_dotenv()
    token = os.getenv("HUGGING_FACE_HUB_TOKEN")
    repo = os.getenv("HUGGING_FACE_MODEL_ID", "nt-prgrmr/my_finetuned_distilbert")
    
    models_to_test = [repo, "distilbert-base-uncased"]
    
    for m in models_to_test:
        print(f"\n--- Testing connectivity to: {m} ---")
        url = f"https://api-inference.huggingface.co/models/{m}"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"inputs": ["Testing model reachability."], "options": {"wait_for_model": True}}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print(f"SUCCESS: {m} is reachable!")
            else:
                print(f"FAILED: {response.text[:200]}")
        except Exception as e:
            print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_hf_connectivity())
