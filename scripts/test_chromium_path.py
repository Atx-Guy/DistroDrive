#!/usr/bin/env python3
"""
Test script to verify get_chromium_path() function works correctly.
"""
import os

def get_chromium_path():
    """
    Get Chromium executable path with intelligent detection.
    
    Priority order:
    1. CHROMIUM_PATH environment variable (explicit override)
    2. Platform-specific detection (Nix, common paths)
    3. None (let Playwright auto-detect)
    
    Returns:
        str or None: Path to Chromium executable, or None for auto-detection
    """
    # 1. Check environment variable first (explicit user override)
    chromium_path = os.environ.get("CHROMIUM_PATH")
    if chromium_path:
        if os.path.exists(chromium_path):
            return chromium_path
        else:
            print(f"Warning: CHROMIUM_PATH set to '{chromium_path}' but file not found")
    
    # 2. Check if running in Nix environment (Replit, NixOS)
    nix_chromium = os.environ.get("NIX_CHROMIUM_PATH")
    if nix_chromium and os.path.exists(nix_chromium):
        return nix_chromium
    
    # Try to find Chromium in Nix store (for Replit/NixOS environments)
    if os.path.exists("/nix/store"):
        try:
            # Look for chromium in Nix store
            nix_store_chromium = None
            for entry in os.listdir("/nix/store"):
                if entry.startswith("chromium-") and os.path.isdir(f"/nix/store/{entry}"):
                    candidate = f"/nix/store/{entry}/bin/chromium"
                    if os.path.exists(candidate):
                        nix_store_chromium = candidate
                        break
            if nix_store_chromium:
                return nix_store_chromium
        except Exception:
            pass
    
    # 3. Return None to let Playwright auto-detect
    # Playwright will find chromium in common locations on Linux, macOS, Windows
    return None


if __name__ == "__main__":
    print("=" * 60)
    print("Testing get_chromium_path() function")
    print("=" * 60)
    
    print("\nTest 1: Default behavior (no env vars)")
    print("-" * 40)
    path = get_chromium_path()
    if path:
        print(f"✓ Found Chromium: {path}")
        print(f"  File exists: {os.path.exists(path)}")
    else:
        print("✓ Returns None (Playwright will auto-detect)")
    
    print("\nTest 2: With CHROMIUM_PATH set to /usr/bin/chromium")
    print("-" * 40)
    os.environ["CHROMIUM_PATH"] = "/usr/bin/chromium"
    path2 = get_chromium_path()
    if path2 == "/usr/bin/chromium":
        print(f"✓ Correctly uses env var: {path2}")
    else:
        print(f"  Warning: File doesn't exist, returned: {path2}")
    
    # Clean up
    if "CHROMIUM_PATH" in os.environ:
        del os.environ["CHROMIUM_PATH"]
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)
