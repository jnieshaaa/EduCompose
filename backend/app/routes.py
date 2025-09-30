from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not Found"})

@app.exception_handler(501)
async def not_implemented_handler(request: Request, exc):
    return JSONResponse(status_code=501, content={"detail": "Not Implemented"})

# ...existing code...