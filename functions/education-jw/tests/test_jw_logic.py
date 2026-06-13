from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import Mock, patch


FUNCTION_ROOT = Path(__file__).resolve().parents[1]
if str(FUNCTION_ROOT) not in sys.path:
    sys.path.insert(0, str(FUNCTION_ROOT))

from src.challenge_store import (  # noqa: E402
    ChallengeError,
    ChallengeRecord,
    now_utc,
    parse_cookie_bundle,
    serialize_cookie_bundle,
    to_iso,
    validate_challenge_record,
)
from src.jw_client import (  # noqa: E402
    EducationJwClient,
    get_image_dimensions,
    infer_semester_start_date,
    parse_courses_page,
    parse_grades_page,
    parse_schedule_segments,
    parse_personal_info_html,
)
from src.main import (  # noqa: E402
    create_error,
    handle_check_login_link,
    handle_confirm_login_link,
    handle_get_login_link,
    main,
    read_payload,
    require_text,
)


FIXTURES = Path(__file__).resolve().parent / "fixtures"


def read_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class ChallengeStoreLogicTests(unittest.TestCase):
    def test_cookie_bundle_roundtrip(self) -> None:
        bundle = serialize_cookie_bundle({"PHPSESSID": "abc", "clicaptcha_info": "_xyz"})
        parsed = parse_cookie_bundle(bundle)
        self.assertEqual(parsed["PHPSESSID"], "abc")
        self.assertEqual(parsed["clicaptcha_info"], "_xyz")

    def test_validate_challenge_rejects_expired_or_used(self) -> None:
        expired = ChallengeRecord(
            challenge_id="jwlc_demo",
            user_id="user-1",
            cookie_bundle="PHPSESSID=abc",
            captcha_info="_xyz",
            created_at=to_iso(now_utc() - timedelta(minutes=10)),
            expires_at=to_iso(now_utc() - timedelta(minutes=1)),
            used=False,
        )
        with self.assertRaises(ChallengeError) as expired_error:
            validate_challenge_record(expired, user_id="user-1")
        self.assertEqual(expired_error.exception.code, 410)

        used = ChallengeRecord(
            challenge_id="jwlc_demo",
            user_id="user-1",
            cookie_bundle="PHPSESSID=abc",
            captcha_info="_xyz",
            created_at=to_iso(now_utc()),
            expires_at=to_iso(now_utc() + timedelta(minutes=5)),
            used=True,
        )
        with self.assertRaises(ChallengeError) as used_error:
            validate_challenge_record(used, user_id="user-1")
        self.assertEqual(used_error.exception.code, 409)


class ParserTests(unittest.TestCase):
    def test_infer_semester_start_date_uses_reference_rules(self) -> None:
        self.assertEqual(infer_semester_start_date("2025-2026-1"), "2025-09-01")
        self.assertEqual(infer_semester_start_date("2025-2026-2"), "2026-03-02")
        self.assertEqual(
            infer_semester_start_date("unknown", today=date(2026, 3, 7)),
            "2026-03-02",
        )

    def test_detect_png_dimensions(self) -> None:
        png_bytes = (
            b"\x89PNG\r\n\x1a\n"
            b"\x00\x00\x00\rIHDR"
            b"\x00\x00\x00\x02"
            b"\x00\x00\x00\x03"
            b"\x08\x02\x00\x00\x00"
            b"\x12\x34\x56\x78"
        )
        self.assertEqual(get_image_dimensions(png_bytes), (2, 3))

    def test_parse_schedule_fixture(self) -> None:
        parsed = parse_courses_page(read_fixture("schedule_page.html"), "2025-2026-2")
        self.assertEqual(parsed["semesterName"], "2025-2026-2")
        self.assertEqual(parsed["startDate"], "2026-03-02")
        self.assertEqual(len(parsed["courses"]), 2)
        first = parsed["courses"][0]
        self.assertEqual(first["name"], "高等数学")
        self.assertEqual(first["day"], 1)
        self.assertEqual(first["startSlot"], 1)
        self.assertEqual(first["endSlot"], 2)
        self.assertEqual(first["location"], "主楼101")
        self.assertEqual(first["weeks"][0], 1)
        self.assertEqual(first["weeks"][-1], 16)

    def test_parse_schedule_segments_supports_compact_weekday_format(self) -> None:
        parsed = parse_schedule_segments("周一5-6节(每周)(理工#511)(1-15周)", "1-15周")
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["day"], 1)
        self.assertEqual(parsed[0]["startSlot"], 5)
        self.assertEqual(parsed[0]["endSlot"], 6)
        self.assertEqual(parsed[0]["location"], "理工#511")
        self.assertEqual(parsed[0]["weeks"][0], 1)
        self.assertEqual(parsed[0]["weeks"][-1], 15)

    def test_parse_schedule_segments_supports_single_double_slot_prefix(self) -> None:
        parsed = parse_schedule_segments("周三单1-单2节(双周)(主2#301)(4周)", "1-15周")
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["day"], 3)
        self.assertEqual(parsed[0]["startSlot"], 1)
        self.assertEqual(parsed[0]["endSlot"], 2)
        self.assertEqual(parsed[0]["weekType"], "double")
        self.assertEqual(parsed[0]["weeks"], [4])

    def test_parse_schedule_segments_supports_noon_slot_prefix(self) -> None:
        parsed = parse_schedule_segments("周三午1-午2节(双周)(主2#301)(2-4周)", "1-16周")
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["day"], 3)
        self.assertEqual(parsed[0]["startSlot"], 11)
        self.assertEqual(parsed[0]["endSlot"], 12)
        self.assertEqual(parsed[0]["location"], "主2#301")
        self.assertEqual(parsed[0]["weekType"], "double")
        self.assertEqual(parsed[0]["weeks"], [2, 4])

    def test_parse_grades_fixture(self) -> None:
        parsed = parse_grades_page(read_fixture("grades_page.html"), "2025-2026-2", "2025-2026-2")
        self.assertEqual(parsed["summary"]["courseCount"], 2)
        self.assertEqual(parsed["summary"]["failedCount"], 1)
        self.assertAlmostEqual(parsed["summary"]["creditTotal"], 5.0)
        self.assertAlmostEqual(parsed["summary"]["averageScore"], 70.8)

    def test_parse_personal_info_fixture(self) -> None:
        html = """
        <html><body>
          <table class="form">
            <tr><th>姓名</th><td>张三</td><th>学号</th><td>20250001</td></tr>
            <tr><th>行政班级</th><td>计算机1班</td><th>专业</th><td>软件工程</td></tr>
            <tr><th>年级</th><td>2025</td><th>性别</th><td>男</td></tr>
            <tr><th>宿舍</th><td>梅园1-101</td></tr>
          </table>
        </body></html>
        """
        parsed = parse_personal_info_html(html)
        self.assertEqual(parsed["studentId"], "20250001")
        self.assertEqual(parsed["major"], "软件工程")
        self.assertEqual(parsed["dormitory"], "梅园1-101")


class LinkLoginClientTests(unittest.TestCase):
    def test_get_schedule_semesters_returns_summary_only(self) -> None:
        client = EducationJwClient()
        response = Mock()
        response.status_code = 200
        response.text = '<select id="tm_id"><option value="20252" selected>2025-2026学年第二学期</option></select>'

        with (
            patch.object(client, "check_login_status", return_value=True),
            patch.object(client, "_request", return_value=response),
        ):
            result = client.get_schedule_semesters()

        self.assertEqual(result[0]["semesterId"], "20252")
        self.assertEqual(result[0]["semesterName"], "2025-2026学年第二学期")
        self.assertEqual(result[0]["startDate"], "2026-03-02")

    def test_get_schedule_fetches_single_semester(self) -> None:
        client = EducationJwClient()
        list_response = Mock()
        list_response.status_code = 200
        list_response.text = '<select id="tm_id"><option value="20252" selected>2025-2026学年第二学期</option></select>'

        detail_response = Mock()
        detail_response.status_code = 200
        detail_response.text = read_fixture("schedule_page.html")

        with (
            patch.object(client, "check_login_status", return_value=True),
            patch.object(client, "_request", side_effect=[list_response, detail_response]),
        ):
            result = client.get_schedule("20252")

        self.assertEqual(result["semesterId"], "20252")
        self.assertEqual(result["startDate"], "2026-03-02")
        self.assertEqual(len(result["courses"]), 2)

    def test_get_login_link_returns_url_ticket_and_cookie_bundle(self) -> None:
        client = EducationJwClient()
        client.session.cookies.set("PHPSESSID", "abc")
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            "code": 1,
            "data": {"url": "https://example.com/login", "ticket": "ticket_123"},
        }

        with patch.object(client, "_request", return_value=response):
            result = client.get_login_link()

        self.assertEqual(result["loginUrl"], "https://example.com/login")
        self.assertEqual(result["ticket"], "ticket_123")
        self.assertEqual(result["cookieBundle"], "PHPSESSID=abc")

    def test_check_login_link_status_maps_states(self) -> None:
        client = EducationJwClient()
        waiting_response = Mock()
        waiting_response.status_code = 200
        waiting_response.json.return_value = {"code": 0, "info": "等待扫码"}

        confirmed_response = Mock()
        confirmed_response.status_code = 200
        confirmed_response.json.return_value = {"code": 1, "info": "已扫码"}

        expired_response = Mock()
        expired_response.status_code = 200
        expired_response.json.return_value = {"code": 0, "info": "二维码已过期"}

        error_response = Mock()
        error_response.status_code = 200
        error_response.json.return_value = {"code": 2, "info": "未知错误"}

        with patch.object(client, "_request", side_effect=[waiting_response, confirmed_response, expired_response, error_response]):
            self.assertEqual(client.check_login_link_status("ticket_1")["status"], "waiting")
            self.assertEqual(client.check_login_link_status("ticket_1")["status"], "confirmed")
            self.assertEqual(client.check_login_link_status("ticket_1")["status"], "expired")
            self.assertEqual(client.check_login_link_status("ticket_1")["status"], "error")

    def test_confirm_login_link_returns_existing_login_shape(self) -> None:
        client = EducationJwClient()
        client.session.cookies.set("PHPSESSID", "linked")
        response = Mock()
        response.status_code = 200
        response.text = ""

        with (
            patch.object(client, "_request", return_value=response),
            patch.object(client, "check_login_status", return_value=True),
            patch.object(client, "get_personal_info", return_value={"studentId": "20250001", "name": "张三"}),
        ):
            result = client.confirm_login_link("ticket_123")

        self.assertEqual(result["cookieBundle"], "PHPSESSID=linked")
        self.assertEqual(result["personalInfo"]["studentId"], "20250001")


class LinkLoginHandlerTests(unittest.TestCase):
    def test_handle_get_login_link_creates_challenge(self) -> None:
        store = Mock()
        store.create.return_value = ChallengeRecord(
            challenge_id="jwll_demo",
            user_id="user-1",
            cookie_bundle="PHPSESSID=abc",
            captcha_info="",
            created_at=to_iso(now_utc()),
            expires_at=to_iso(now_utc() + timedelta(minutes=5)),
            used=False,
        )
        client = Mock()
        client.get_login_link.return_value = {
            "loginUrl": "https://example.com/login",
            "ticket": "ticket_123",
            "cookieBundle": "PHPSESSID=abc",
        }

        with patch("src.main.create_jw_client", return_value=client):
            result = handle_get_login_link(store, "user-1")

        self.assertTrue(result["challengeId"].startswith("jwll_"))
        self.assertEqual(result["ticket"], "ticket_123")
        self.assertIn("expiresAt", result)

    def test_handle_check_login_link_requires_ticket(self) -> None:
        with self.assertRaises(RuntimeError) as error:
            handle_check_login_link(Mock(), {"challengeId": "jwll_demo"}, "user-1")
        self.assertEqual(getattr(error.exception, "code", None), 400)

    def test_handle_check_login_link_returns_expired_status(self) -> None:
        store = Mock()
        store.get.return_value = ChallengeRecord(
            challenge_id="jwll_demo",
            user_id="user-1",
            cookie_bundle="PHPSESSID=abc",
            captcha_info="",
            created_at=to_iso(now_utc() - timedelta(minutes=10)),
            expires_at=to_iso(now_utc() - timedelta(minutes=1)),
            used=False,
        )

        result = handle_check_login_link(store, {"challengeId": "jwll_demo", "ticket": "ticket_123"}, "user-1")
        self.assertEqual(result["status"], "expired")

    def test_handle_confirm_login_link_rejects_expired_challenge(self) -> None:
        store = Mock()
        store.get.return_value = ChallengeRecord(
            challenge_id="jwll_demo",
            user_id="user-1",
            cookie_bundle="PHPSESSID=abc",
            captcha_info="",
            created_at=to_iso(now_utc() - timedelta(minutes=10)),
            expires_at=to_iso(now_utc() - timedelta(minutes=1)),
            used=False,
        )

        with self.assertRaises(ChallengeError) as error:
            handle_confirm_login_link(store, {"challengeId": "jwll_demo", "ticket": "ticket_123"}, "user-1")
        self.assertEqual(error.exception.code, 410)


class MainHelperTests(unittest.TestCase):
    def test_main_get_schedule_semesters_skips_challenge_store_setup(self) -> None:
        client = Mock()
        client.get_schedule_semesters.return_value = [
            {"semesterId": "20252", "semesterName": "2025-2026学年第二学期", "startDate": "2026-03-02"}
        ]

        class Req:
            headers = {"x-appwrite-user-id": "user-1"}
            body_json = {"action": "getScheduleSemesters", "cookieBundle": "PHPSESSID=abc"}
            body_text = ""

        class Res:
            def json(self, body, status_code):
                return {"body": body, "statusCode": status_code}

        context = type("Context", (), {"req": Req(), "res": Res(), "error": Mock()})()

        with (
            patch("src.main.create_tables_client") as create_tables_client_mock,
            patch("src.main.create_jw_client", return_value=client),
        ):
            result = main(context)

        create_tables_client_mock.assert_not_called()
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(result["body"]["data"]["semesters"][0]["semesterId"], "20252")

    def test_main_get_schedule_skips_challenge_store_setup(self) -> None:
        client = Mock()
        client.get_schedule.return_value = {
            "semesterId": "20252",
            "semesterName": "2025-2026学年第二学期",
            "startDate": "2026-03-02",
            "courses": [],
        }

        class Req:
            headers = {"x-appwrite-user-id": "user-1"}
            body_json = {"action": "getSchedule", "cookieBundle": "PHPSESSID=abc", "semesterId": "20252"}
            body_text = ""

        class Res:
            def json(self, body, status_code):
                return {"body": body, "statusCode": status_code}

        context = type("Context", (), {"req": Req(), "res": Res(), "error": Mock()})()

        with (
            patch("src.main.create_tables_client") as create_tables_client_mock,
            patch("src.main.create_jw_client", return_value=client),
        ):
            result = main(context)

        create_tables_client_mock.assert_not_called()
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(result["body"]["data"]["schedule"]["semesterId"], "20252")

    def test_main_get_grades_skips_challenge_store_setup(self) -> None:
        client = Mock()
        client.get_grades.return_value = {"semesters": [], "summary": {}, "failedCourses": []}

        class Req:
            headers = {"x-appwrite-user-id": "user-1"}
            body_json = {"action": "getGrades", "cookieBundle": "PHPSESSID=abc"}
            body_text = ""

        class Res:
            def json(self, body, status_code):
                return {"body": body, "statusCode": status_code}

        context = type("Context", (), {"req": Req(), "res": Res(), "error": Mock()})()

        with (
            patch("src.main.create_tables_client") as create_tables_client_mock,
            patch("src.main.create_jw_client", return_value=client),
        ):
            result = main(context)

        create_tables_client_mock.assert_not_called()
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(result["body"]["data"]["grades"]["semesters"], [])

    def test_require_text_and_create_error(self) -> None:
        self.assertEqual(require_text({"action": "getCaptcha"}, "action"), "getCaptcha")
        with self.assertRaises(RuntimeError) as error:
            require_text({}, "action")
        self.assertEqual(getattr(error.exception, "code", None), 400)

        created = create_error("boom", 418)
        self.assertEqual(str(created), "boom")
        self.assertEqual(getattr(created, "code", None), 418)

    def test_read_payload_supports_python_runtime_snake_case_fields(self) -> None:
        class Req:
            body_json = {"action": "getCaptcha"}
            body_text = ""

        self.assertEqual(read_payload(Req()), {"action": "getCaptcha"})


if __name__ == "__main__":
    unittest.main()
