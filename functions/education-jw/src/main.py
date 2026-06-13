from __future__ import annotations

import json
import os
import uuid
from typing import Any

from .appwrite_tables import AppwriteRequestError, AppwriteTablesClient
from .challenge_store import ChallengeError, ChallengeStore, now_utc, parse_iso, validate_challenge_record
from .jw_client import EducationJwClient, EducationJwError


def env(key: str, fallback: str = "") -> str:
    value = os.environ.get(key, "")
    return value.strip() if value and value.strip() else fallback


def clean_string(value: Any) -> str:
    return str(value or "").strip()


def create_error(message: str, code: int = 400) -> RuntimeError:
    error = RuntimeError(message)
    setattr(error, "code", code)
    return error


def success(res: Any, data: Any, status_code: int = 200) -> Any:
    return res.json({"ok": True, "data": data}, status_code)


def fail(res: Any, error: Exception) -> Any:
    status_code = int(getattr(error, "code", 500) or 500)
    message = clean_string(error.args[0] if getattr(error, "args", None) else error)
    return res.json({"ok": False, "error": message or "Unknown error", "code": status_code}, status_code)


def get_header(headers: Any, key: str) -> str:
    if not isinstance(headers, dict):
        return ""
    return clean_string(headers.get(key) or headers.get(key.lower()) or headers.get(key.upper()))


def get_req_value(req: Any, *names: str) -> Any:
    for name in names:
        if hasattr(req, name):
            return getattr(req, name)
    return None


def require_authenticated_user(req: Any) -> str:
    user_id = get_header(get_req_value(req, "headers") or {}, "x-appwrite-user-id")
    if not user_id:
        raise create_error("User is not authenticated", 401)
    return user_id


def read_payload(req: Any) -> dict[str, Any]:
    body_json = get_req_value(req, "body_json", "bodyJson")
    if isinstance(body_json, dict):
        return body_json
    if isinstance(body_json, list):
        raise create_error("Request body must be a JSON object", 400)

    raw = clean_string(get_req_value(req, "body_text", "bodyText", "body"))
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as error:
        raise create_error(f"Invalid JSON body: {error.msg}", 400) from error
    if not isinstance(payload, dict):
        raise create_error("Request body must be a JSON object", 400)
    return payload


def require_text(payload: dict[str, Any], key: str) -> str:
    value = clean_string(payload.get(key))
    if not value:
        raise create_error(f"Missing required field: {key}", 400)
    return value


def create_tables_client(req: Any) -> tuple[AppwriteTablesClient, str, str]:
    endpoint = env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT", ""))
    project_id = env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID", ""))
    api_key = env("APPWRITE_API_KEY", get_header(get_req_value(req, "headers") or {}, "x-appwrite-key"))
    if not endpoint:
        raise create_error("Missing APPWRITE_ENDPOINT", 500)
    if not project_id:
        raise create_error("Missing APPWRITE_PROJECT_ID", 500)
    if not api_key:
        raise create_error("Missing APPWRITE_API_KEY", 500)

    database_id = env("APPWRITE_DATABASE_ID", "mindguard")
    table_id = env("APPWRITE_JW_LOGIN_CHALLENGES_TABLE_ID", "jw_login_challenges")
    timeout = float(env("APPWRITE_REQUEST_TIMEOUT", "10") or "10")
    return AppwriteTablesClient(endpoint, project_id, api_key, timeout), database_id, table_id


def create_challenge_store(req: Any) -> ChallengeStore:
    tables_client, database_id, table_id = create_tables_client(req)
    return ChallengeStore(tables_client, database_id, table_id)


def create_jw_client() -> EducationJwClient:
    base_url = env("JW_BASE_URL", "http://jw.xujc.com")
    timeout = float(env("JW_REQUEST_TIMEOUT", "15") or "15")
    return EducationJwClient(base_url=base_url, timeout=timeout)


def get_challenge_ttl_seconds() -> int:
    return int(env("JW_CHALLENGE_TTL_SECONDS", "300") or "300")


def get_owned_challenge(store: ChallengeStore, challenge_id: str, user_id: str):
    challenge = store.get(challenge_id)
    if challenge.user_id and challenge.user_id != user_id:
        raise ChallengeError("无权使用该 challenge", 403)
    return challenge


def handle_get_captcha(store: ChallengeStore, user_id: str) -> dict[str, Any]:
    client = create_jw_client()
    captcha = client.get_captcha()
    challenge_id = f"jwlc_{uuid.uuid4().hex[:27]}"
    ttl_seconds = get_challenge_ttl_seconds()
    store.create(
        challenge_id=challenge_id,
        user_id=user_id,
        cookie_bundle=captcha["cookieBundle"],
        captcha_info=captcha["captchaInfo"],
        ttl_seconds=ttl_seconds,
    )
    return {
        "challengeId": challenge_id,
        "captchaImageBase64": captcha["captchaImageBase64"],
        "captchaTextHints": captcha["captchaTextHints"],
        "imageWidth": captcha["imageWidth"],
        "imageHeight": captcha["imageHeight"],
    }


def handle_get_login_link(store: ChallengeStore, user_id: str) -> dict[str, Any]:
    client = create_jw_client()
    result = client.get_login_link()
    challenge_id = f"jwll_{uuid.uuid4().hex[:27]}"
    record = store.create(
        challenge_id=challenge_id,
        user_id=user_id,
        cookie_bundle=result["cookieBundle"],
        captcha_info="",
        ttl_seconds=get_challenge_ttl_seconds(),
    )
    return {
        "challengeId": challenge_id,
        "loginUrl": result["loginUrl"],
        "ticket": result["ticket"],
        "expiresAt": record.expires_at,
    }


def handle_submit_login(store: ChallengeStore, payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    challenge_id = require_text(payload, "challengeId")
    username = require_text(payload, "username")
    password = require_text(payload, "password")
    imginfo = require_text(payload, "imginfo")

    challenge = validate_challenge_record(store.get(challenge_id), user_id=user_id)
    client = create_jw_client()
    client.set_cookie_bundle(challenge.cookie_bundle)
    result = client.submit_login(username, password, imginfo, challenge.captcha_info)
    store.mark_used(challenge_id)
    return result


def handle_check_login_link(store: ChallengeStore, payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    challenge_id = require_text(payload, "challengeId")
    ticket = require_text(payload, "ticket")
    challenge = get_owned_challenge(store, challenge_id, user_id)

    if challenge.used:
        return {"status": "error", "message": "登录链接已处理，请重新获取"}
    if challenge.expires_at and parse_iso(challenge.expires_at) <= now_utc():
        return {"status": "expired", "message": "登录链接已过期"}

    client = create_jw_client()
    client.set_cookie_bundle(challenge.cookie_bundle)
    return client.check_login_link_status(ticket)


def handle_confirm_login_link(store: ChallengeStore, payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    challenge_id = require_text(payload, "challengeId")
    ticket = require_text(payload, "ticket")

    challenge = validate_challenge_record(store.get(challenge_id), user_id=user_id)
    client = create_jw_client()
    client.set_cookie_bundle(challenge.cookie_bundle)
    result = client.confirm_login_link(ticket)
    store.mark_used(challenge_id)
    return result


def handle_get_schedule(payload: dict[str, Any]) -> dict[str, Any]:
    cookie_bundle = require_text(payload, "cookieBundle")
    semester_id = clean_string(payload.get("semesterId"))
    client = create_jw_client()
    client.set_cookie_bundle(cookie_bundle)
    return {"schedule": client.get_schedule(semester_id or None)}


def handle_get_schedule_semesters(payload: dict[str, Any]) -> dict[str, Any]:
    cookie_bundle = require_text(payload, "cookieBundle")
    client = create_jw_client()
    client.set_cookie_bundle(cookie_bundle)
    return {"semesters": client.get_schedule_semesters()}


def handle_get_grades(payload: dict[str, Any]) -> dict[str, Any]:
    cookie_bundle = require_text(payload, "cookieBundle")
    client = create_jw_client()
    client.set_cookie_bundle(cookie_bundle)
    return {"grades": client.get_grades()}


def main(context: Any) -> Any:
    try:
        payload = read_payload(context.req)
        action = require_text(payload, "action")
        user_id = require_authenticated_user(context.req)

        if action == "getCaptcha":
            store = create_challenge_store(context.req)
            return success(context.res, handle_get_captcha(store, user_id))
        if action == "getLoginLink":
            store = create_challenge_store(context.req)
            return success(context.res, handle_get_login_link(store, user_id))
        if action == "submitLogin":
            store = create_challenge_store(context.req)
            return success(context.res, handle_submit_login(store, payload, user_id))
        if action == "checkLoginLink":
            store = create_challenge_store(context.req)
            return success(context.res, handle_check_login_link(store, payload, user_id))
        if action == "confirmLoginLink":
            store = create_challenge_store(context.req)
            return success(context.res, handle_confirm_login_link(store, payload, user_id))
        if action == "getScheduleSemesters":
            return success(context.res, handle_get_schedule_semesters(payload))
        if action == "getSchedule":
            return success(context.res, handle_get_schedule(payload))
        if action == "getGrades":
            return success(context.res, handle_get_grades(payload))

        raise create_error(f"Unsupported action: {action}", 400)
    except (EducationJwError, ChallengeError, AppwriteRequestError) as error:
        return fail(context.res, error)
    except Exception as error:  # pragma: no cover - runtime fallback
        if hasattr(context, "error"):
            context.error(str(error))
        return fail(context.res, error if isinstance(error, Exception) else Exception("Unknown error"))
