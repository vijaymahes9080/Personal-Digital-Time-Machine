import re

class PrivacyAgent:
    def __init__(self):
        # Patterns for common sensitive credentials
        self.patterns = {
            "api_key": re.compile(r"\b(api[_-]?key|secret|token|password|passwd|auth[_-]?key)\b\s*[:=]\s*['\"]?[a-zA-Z0-9_\-]{12,}['\"]?", re.IGNORECASE),
            "jwt_token": re.compile(r"\beyJhbGciOi[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_\-\.]+\b"),
            "ipv4": re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"),
            "email": re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"),
            "db_conn": re.compile(r"\b[a-zA-Z0-9+.-]+://[^:]+:[^@]+@[^/]+/?[a-zA-Z0-9_]*\b")
        }

    def mask_text(self, text: str) -> str:
        """Masks detected sensitive patterns with [REDACTED_TYPE]."""
        if not text:
            return ""
        
        masked = text
        
        # Mask Database Connections
        masked = self.patterns["db_conn"].sub("[REDACTED_DATABASE_CONNECTION]", masked)
        
        # Mask JWT Tokens
        masked = self.patterns["jwt_token"].sub("[REDACTED_JWT_TOKEN]", masked)
        
        # Mask Key/Secret Key Assignment
        masked = self.patterns["api_key"].sub(lambda m: f"{m.group().split('=')[0] if '=' in m.group() else m.group().split(':')[0]}=[REDACTED_CREDENTIAL]", masked)
        
        # Mask Email Addresses
        masked = self.patterns["email"].sub("[REDACTED_EMAIL]", masked)
        
        # Mask IP Addresses
        masked = self.patterns["ipv4"].sub("[REDACTED_IP]", masked)
        
        return masked

# Singleton Privacy Agent Instance
privacy_agent = PrivacyAgent()
