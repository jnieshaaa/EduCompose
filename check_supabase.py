
import os
import httpx
import asyncio

async def check_table():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing config")
        return
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{url}/rest/v1/?select=*", headers={"apikey": key, "Authorization": f"Bearer {key}"})
        print(resp.status_code)
        # print(resp.json()) # Too much output probably

asyncio.run(check_table())
