#!/usr/bin/env python3
"""
EduCompose Backend Startup Script
"""
import uvicorn
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fix Windows multiprocessing issue
if sys.platform == "win32":
    import multiprocessing
    multiprocessing.freeze_support()
    # Use 'spawn' method on Windows to avoid issues with uvicorn reload
    if hasattr(multiprocessing, 'set_start_method'):
        try:
            multiprocessing.set_start_method('spawn', force=True)
        except RuntimeError:
            pass  # Already set

if __name__ == "__main__":
    # Get configuration from environment variables
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    # ENABLE RELOAD FOR DEVELOPMENT
    reload = True
    
    print(f"Starting EduCompose API server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Reload: {reload} (Forcing true for live migration)")
    print(f"API Documentation: http://{host}:{port}/api/docs")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
