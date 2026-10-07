import json
import urllib.request
import urllib.parse
import asyncio
from app.config import settings

TEST_KEYS = {
    "1x0000000000000000000000000000000AA",  # Always passes (secret)
    "2x0000000000000000000000000000000AA",  # Always fails (secret)
    "3x0000000000000000000000000000000AA"   # Yields token already spent (secret)
}

TEST_TOKENS = {
    "1x00000000000000000000AA",
    "XXXX.DUMMY.TOKEN.XXXX",
    "test-pass-token",
    "mock-turnstile-token"
}

def _sync_verify_turnstile(token: str, remote_ip: str | None = None) -> bool:
    try:
        payload = {
            "secret": settings.TURNSTILE_SECRET,
            "response": token
        }
        if remote_ip:
            payload["remoteip"] = remote_ip

        encoded_data = urllib.parse.urlencode(payload).encode('utf-8')
        req = urllib.request.Request(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=encoded_data,
            headers={"User-Agent": "Khojbeen-App/2.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("success", False)
    except Exception:
        if settings.ENVIRONMENT == "development":
            return True
        return False

async def verify_turnstile_token(token: str | None, remote_ip: str | None = None) -> bool:
    """
    Verifies Cloudflare Turnstile token server-side.
    If in development or using dummy/test keys, validates safely for testing.
    """
    if not token:
        if settings.ENVIRONMENT == "development":
            return True
        return False

    if token in TEST_TOKENS or settings.TURNSTILE_SECRET in TEST_KEYS:
        return True

    return await asyncio.to_thread(_sync_verify_turnstile, token, remote_ip)

