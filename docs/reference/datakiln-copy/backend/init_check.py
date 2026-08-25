
import sys
import os

# Add the current directory to sys.path so we can import from app
sys.path.append(os.getcwd())

try:
    from app.main import app
    print("SUCCESS: app.main imported successfully.")
except Exception as e:
    print(f"FAILURE: Could not import app.main. Error: {e}")
    sys.exit(1)
