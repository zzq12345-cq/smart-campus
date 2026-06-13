from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from typing import Mapping

from .appwrite_tables import AppwriteRequestError, AppwriteTablesClient


class ChallengeError(RuntimeError):
    def __init__(self, message: str, code: int = 400):
        super().__init__(message)
        self.code = code


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value: str) -> datetime:
    normalized = str(value or "").strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    return datetime.fromisoformat(normalized)


def serialize_cookie_bundle(raw: str | Mapping[str, str] | None) -> str:
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw.strip()
    parts = []
    for key, value in raw.items():
        name = str(key or "").strip()
        if not name:
            continue
        parts.append(f"{name}={str(value or '').strip()}")
    return "; ".join(parts)


def parse_cookie_bundle(cookie_bundle: str | None) -> dict[str, str]:
    cookie = SimpleCookie()
    cookie.load(str(cookie_bundle or ""))
    return {name: morsel.value for name, morsel in cookie.items()}


@dataclass
class ChallengeRecord:
    challenge_id: str
    user_id: str
    cookie_bundle: str
    captcha_info: str
    created_at: str
    expires_at: str
    used: bool

    @classmethod
    def from_row(cls, row: Mapping[str, object]) -> "ChallengeRecord":
        return cls(
            challenge_id=str(row.get("$id") or row.get("challengeId") or ""),
            user_id=str(row.get("userId") or ""),
            cookie_bundle=str(row.get("cookieBundle") or ""),
            captcha_info=str(row.get("captchaInfo") or ""),
            created_at=str(row.get("createdAt") or row.get("$createdAt") or ""),
            expires_at=str(row.get("expiresAt") or ""),
            used=bool(row.get("used")),
        )


def validate_challenge_record(
    record: ChallengeRecord,
    *,
    user_id: str,
    current_time: datetime | None = None,
) -> ChallengeRecord:
    if not record.challenge_id:
        raise ChallengeError("Challenge 不存在", 404)
    if record.user_id and record.user_id != user_id:
        raise ChallengeError("无权使用该 challenge", 403)
    if record.used:
        raise ChallengeError("Challenge 已使用", 409)

    current = current_time or now_utc()
    if record.expires_at and parse_iso(record.expires_at) <= current:
        raise ChallengeError("Challenge 已过期", 410)

    return record


class ChallengeStore:
    def __init__(self, client: AppwriteTablesClient, database_id: str, table_id: str):
        self.client = client
        self.database_id = database_id
        self.table_id = table_id

    def create(
        self,
        *,
        challenge_id: str,
        user_id: str,
        cookie_bundle: str,
        captcha_info: str,
        ttl_seconds: int,
    ) -> ChallengeRecord:
        created_at = now_utc()
        expires_at = created_at + timedelta(seconds=max(ttl_seconds, 1))
        row = self.client.create_row(
            database_id=self.database_id,
            table_id=self.table_id,
            row_id=challenge_id,
            data={
                "userId": user_id,
                "cookieBundle": serialize_cookie_bundle(cookie_bundle),
                "captchaInfo": str(captcha_info or ""),
                "createdAt": to_iso(created_at),
                "expiresAt": to_iso(expires_at),
                "used": False,
            },
        )
        return ChallengeRecord.from_row(row)

    def get(self, challenge_id: str) -> ChallengeRecord:
        try:
            row = self.client.get_row(
                database_id=self.database_id,
                table_id=self.table_id,
                row_id=challenge_id,
            )
        except AppwriteRequestError as error:
            if error.code == 404:
                raise ChallengeError("Challenge 不存在", 404) from error
            raise
        return ChallengeRecord.from_row(row)

    def mark_used(self, challenge_id: str) -> ChallengeRecord:
        row = self.client.update_row(
            database_id=self.database_id,
            table_id=self.table_id,
            row_id=challenge_id,
            data={"used": True},
        )
        return ChallengeRecord.from_row(row)
