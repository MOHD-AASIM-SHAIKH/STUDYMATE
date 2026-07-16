"""Rate limiting setup (protects the free Groq quota from abuse).

Limits are per-client-IP by default via slowapi. Values are env-driven
(see Settings) so they can be tuned per deployment without a code change.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
