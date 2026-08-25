import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
print(f"Path: {sys.path[0]}")

try:
    import providers
    print(f"Providers package: {providers}")
    print(f"Dir(providers): {dir(providers)}")
    
    from providers import get_provider
    print(f"Get provider function: {get_provider}")
    
    p = get_provider("gemini", {"enabled": True, "api_key": "test"})
    print(f"Provider instance: {p}")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
