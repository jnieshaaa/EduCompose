
import sys
import os
from fastapi import FastAPI
from backend.app.main import app

for route in app.routes:
    print(f"{route.methods} {route.path}")
