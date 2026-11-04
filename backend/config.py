from dataclasses import dataclass, field
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    mode: str = "demo"
    ai: str = "onnx"
    db_path: str = field(default_factory=lambda: str(Path(os.environ.get("LOCALAPPDATA", str(Path.home() / ".local/share"))) / "ShieldPay" / "shieldpay.sqlite3"))
    paypal_client_id: str = field(default="", repr=False)
    paypal_client_secret: str = field(default="", repr=False)
    admin_token: str = field(default="", repr=False)

    def __post_init__(self):
        if self.mode not in {"demo", "sandbox"}:
            raise ValueError("SHIELDPAY_MODE must be demo or sandbox")
        if self.ai not in {"onnx", "lexical"}:
            raise ValueError("SHIELDPAY_AI must be onnx or lexical")

    @property
    def paypal_configured(self):
        return bool(self.paypal_client_id and self.paypal_client_secret)

    @classmethod
    def from_env(cls, env_file=None):
        from dotenv import load_dotenv
        # Only this application's explicit .env, never search parent directories.
        load_dotenv(env_file or Path(__file__).resolve().parents[1] / ".env", override=False)
        args = dict(mode=os.getenv("SHIELDPAY_MODE", "demo"), ai=os.getenv("SHIELDPAY_AI", "onnx"),
                    paypal_client_id=os.getenv("PAYPAL_CLIENT_ID", ""),
                    paypal_client_secret=os.getenv("PAYPAL_CLIENT_SECRET", ""),
                    admin_token=os.getenv("SHIELDPAY_ADMIN_TOKEN", ""))
        if os.getenv("SHIELDPAY_DB"):
            args["db_path"] = os.environ["SHIELDPAY_DB"]
        return cls(**args)
