from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib.parse import quote, unquote, urljoin

import requests
from bs4 import BeautifulSoup

from .challenge_store import parse_cookie_bundle, serialize_cookie_bundle


DAY_MAP = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7}
GARBLE_PATTERNS = ("閿", "閳", "閻")


class EducationJwError(RuntimeError):
    def __init__(self, message: str, code: int = 400):
        super().__init__(message)
        self.code = code


@dataclass
class SemesterOption:
    semester_id: str
    semester_name: str


def build_semester_summary(semester: SemesterOption) -> dict[str, str]:
    return {
        "semesterId": semester.semester_id,
        "semesterName": semester.semester_name,
        "startDate": infer_semester_start_date(semester.semester_id, semester.semester_name),
    }


def _parse_semester_term(value: str) -> tuple[int | None, int | None]:
    normalized = clean_text(value)
    if not normalized:
        return None, None

    direct_match = re.search(r"(\d{4})\s*-\s*(\d{4})\s*-\s*([12])", normalized)
    if direct_match:
        first_year = int(direct_match.group(1))
        second_year = int(direct_match.group(2))
        term = int(direct_match.group(3))
        return (first_year if term == 1 else second_year), term

    named_match = re.search(r"(\d{4})\s*-\s*(\d{4}).*?([一二12])\s*学期", normalized)
    if named_match:
        first_year = int(named_match.group(1))
        second_year = int(named_match.group(2))
        raw_term = named_match.group(3)
        term = 1 if raw_term in {"一", "1"} else 2
        return (first_year if term == 1 else second_year), term

    short_match = re.search(r"(\d{4})([12])$", normalized)
    if short_match:
        base_year = int(short_match.group(1))
        term = int(short_match.group(2))
        return (base_year if term == 1 else base_year + 1), term

    return None, None


def infer_semester_start_date(semester_id: str, semester_name: str = "", today: date | None = None) -> str:
    for candidate in (semester_id, semester_name):
        start_year, term = _parse_semester_term(candidate)
        if start_year and term:
            month, day = (9, 1) if term == 1 else (3, 2)
            return date(start_year, month, day).isoformat()

    reference_date = today or date.today()
    fallback_term = 1 if reference_date.month >= 8 else 2
    fallback_year = reference_date.year
    month, day = (9, 1) if fallback_term == 1 else (3, 2)
    return date(fallback_year, month, day).isoformat()


def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n") and len(image_bytes) >= 24:
        width = int.from_bytes(image_bytes[16:20], "big")
        height = int.from_bytes(image_bytes[20:24], "big")
        return width, height

    if image_bytes.startswith((b"GIF87a", b"GIF89a")) and len(image_bytes) >= 10:
        width = int.from_bytes(image_bytes[6:8], "little")
        height = int.from_bytes(image_bytes[8:10], "little")
        return width, height

    if image_bytes.startswith(b"\xff\xd8"):
        offset = 2
        size = len(image_bytes)
        while offset + 9 < size:
            if image_bytes[offset] != 0xFF:
                offset += 1
                continue
            marker = image_bytes[offset + 1]
            offset += 2
            if marker in {0xD8, 0xD9}:
                continue
            if offset + 2 > size:
                break
            segment_length = int.from_bytes(image_bytes[offset:offset + 2], "big")
            if segment_length < 2 or offset + segment_length > size:
                break
            if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                height = int.from_bytes(image_bytes[offset + 3:offset + 5], "big")
                width = int.from_bytes(image_bytes[offset + 5:offset + 7], "big")
                return width, height
            offset += segment_length

    raise EducationJwError("无法识别验证码图片尺寸", 502)


def safe_float(value: str, default: float = 0.0) -> float:
    try:
        normalized = "" if value is None else str(value).strip()
        return float(normalized)
    except (TypeError, ValueError):
        return default


def safe_int(value: str, default: int = 0) -> int:
    try:
        normalized = "" if value is None else str(value).strip()
        return int(float(normalized))
    except (TypeError, ValueError):
        return default


def clean_text(value: str | None) -> str:
    text = str(value or "")
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def maybe_fix_garbled_text(text: str) -> str:
    cleaned = clean_text(text)
    if not cleaned:
        return ""
    if not any(pattern in cleaned for pattern in GARBLE_PATTERNS):
        return cleaned

    strategies = (
        lambda raw: raw.encode("iso-8859-1").decode("gbk"),
        lambda raw: raw.encode("iso-8859-1").decode("gb18030"),
        lambda raw: raw.encode("latin1").decode("gbk"),
        lambda raw: raw.encode("cp1252").decode("gbk"),
    )
    for strategy in strategies:
        try:
            fixed = clean_text(strategy(cleaned))
            if any("\u4e00" <= char <= "\u9fff" for char in fixed):
                return fixed
        except Exception:
            continue
    return cleaned


def extract_text(node: Any, separator: str = "") -> str:
    if node is None:
        return ""
    return maybe_fix_garbled_text(node.get_text(separator, strip=True))


def parse_error_message(html: str) -> str:
    normalized = str(html or "")
    if "验证码错误" in normalized:
        return "验证码错误"
    if "用户名或密码错误" in normalized:
        return "用户名或密码错误"
    if "验证码验证失败" in normalized:
        return "验证码验证失败"
    return "登录失败，请检查输入信息"


def split_semesters(soup: BeautifulSoup) -> list[SemesterOption]:
    select = soup.find("select", {"id": "tm_id"})
    if not select:
        return []
    semesters: list[SemesterOption] = []
    for option in select.find_all("option"):
        semester_id = clean_text(option.get("value"))
        semester_name = extract_text(option)
        if not semester_id:
            continue
        semesters.append(SemesterOption(semester_id=semester_id, semester_name=semester_name))
    return semesters


def extract_selected_semester_name(soup: BeautifulSoup, semester_id: str) -> str:
    select = soup.find("select", {"id": "tm_id"})
    if not select:
        return semester_id
    selected = select.find("option", selected=True)
    if selected:
        return extract_text(selected)
    for option in select.find_all("option"):
        if clean_text(option.get("value")) == semester_id:
            return extract_text(option)
    return semester_id


def expand_weeks(text: str) -> list[int]:
    normalized = clean_text(text)
    if not normalized:
        return []

    week_type = "all"
    if "单周" in normalized:
        week_type = "single"
    elif "双周" in normalized:
        week_type = "double"

    match = re.search(r"(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)\s*周", normalized)
    if not match:
        return []

    numbers: list[int] = []
    for part in match.group(1).split(","):
        chunk = clean_text(part)
        if not chunk:
            continue
        if "-" in chunk:
            start_raw, end_raw = chunk.split("-", 1)
            start = safe_int(start_raw, 0)
            end = safe_int(end_raw, 0)
            if start <= 0 or end <= 0 or end < start:
                continue
            sequence = list(range(start, end + 1))
        else:
            value = safe_int(chunk, 0)
            sequence = [value] if value > 0 else []

        if week_type == "single":
            sequence = [item for item in sequence if item % 2 == 1]
        elif week_type == "double":
            sequence = [item for item in sequence if item % 2 == 0]
        numbers.extend(sequence)

    return sorted(set(numbers))


def extract_location(segment_text: str) -> str:
    normalized = clean_text(segment_text)
    if not normalized:
        return ""

    location_hints = ("#", "楼", "馆", "室", "场", "中心", "实验", "理工", "主", "公", "经管", "文", "校外")

    trailing = re.split(r"[)）]", normalized)
    if len(trailing) > 1:
        candidate = clean_text(trailing[-1])
        if candidate and not re.search(r"(?:星期|周)|第\d|周", candidate):
            return candidate

    bracket_contents = re.findall(r"[（(]([^()（）]+)[)）]", normalized)
    candidates: list[str] = []
    for candidate in bracket_contents:
        value = clean_text(candidate)
        if value and not re.search(r"(?:星期|周)|第\d|单周|双周|每周", value):
            candidates.append(value)

    for candidate in candidates:
        if any(hint in candidate for hint in location_hints) or re.search(r"[A-Za-z0-9#-]", candidate):
            return candidate
    if candidates:
        return candidates[0]

    cleaned = re.sub(r"(?:星期|周)[一二三四五六日天]", "", normalized)
    cleaned = re.sub(r"(?:第)?(?:单|双)?\s*\d+(?:\s*-\s*(?:单|双)?\s*\d+)?\s*节", "", cleaned)
    cleaned = re.sub(r"[（(][^()（）]*周[^()（）]*[)）]", "", cleaned)
    cleaned = re.sub(r"[（(][^()（）]*单周[^()（）]*[)）]", "", cleaned)
    cleaned = re.sub(r"[（(][^()（）]*双周[^()（）]*[)）]", "", cleaned)
    return clean_text(cleaned).strip("，,;；")


def _parse_schedule_slot_range(segment: str) -> tuple[int, int]:
    noon_match = re.search(r"(?:午)\s*(\d+)(?:\s*-\s*(?:午)?\s*(\d+))?\s*节", segment)
    if noon_match:
        start_slot = safe_int(noon_match.group(1), 0)
        end_slot = safe_int(noon_match.group(2) or noon_match.group(1), 0)
        return start_slot + 10, end_slot + 10

    slot_match = re.search(r"(?:第)?(?:单|双)?\s*(\d+)(?:\s*-\s*(?:单|双)?\s*(\d+))?\s*节", segment)
    if not slot_match:
        return 0, 0

    return (
        safe_int(slot_match.group(1), 0),
        safe_int(slot_match.group(2) or slot_match.group(1), 0),
    )


def parse_schedule_segments(raw_text: str, weeks_text: str) -> list[dict[str, Any]]:
    normalized = str(raw_text or "").replace("<br/>", "\n").replace("<br>", "\n")
    segments = [clean_text(part) for part in re.split(r"[\r\n]+", normalized) if clean_text(part)]
    if not segments and clean_text(raw_text):
        segments = [clean_text(raw_text)]

    parsed_segments: list[dict[str, Any]] = []
    for segment in segments:
        day_match = re.search(r"(?:星期|周)([一二三四五六日天])", segment)
        start_slot, end_slot = _parse_schedule_slot_range(segment)
        week_source = segment if re.search(r"\d+\s*周|单周|双周|每周", segment) else weeks_text
        week_type = "all"
        if "单周" in week_source:
            week_type = "single"
        elif "双周" in week_source:
            week_type = "double"

        parsed_segments.append(
            {
                "day": DAY_MAP.get(day_match.group(1), 0) if day_match else 0,
                "startSlot": start_slot,
                "endSlot": end_slot,
                "weeks": expand_weeks(week_source),
                "location": extract_location(segment),
                "weekType": week_type,
                "raw": segment,
            }
        )

    return [item for item in parsed_segments if item["day"] or item["location"] or item["weeks"]]


def choose_default_semester(semesters: list[SemesterOption]) -> SemesterOption | None:
    if not semesters:
        return None

    today = date.today().isoformat()
    ordered = sorted(
        semesters,
        key=lambda item: (
            infer_semester_start_date(item.semester_id, item.semester_name),
            item.semester_id,
        ),
        reverse=True,
    )
    for semester in ordered:
        if infer_semester_start_date(semester.semester_id, semester.semester_name) <= today:
            return semester
    return ordered[0]


def parse_courses_page(html: str, semester_id: str) -> dict[str, Any]:
    soup = BeautifulSoup(html or "", "lxml")
    course_table = soup.find("table", {"id": "data_table"})
    if not course_table:
        raise EducationJwError("未找到课表数据", 500)

    semester_name = extract_selected_semester_name(soup, semester_id)
    courses: list[dict[str, Any]] = []

    rows = course_table.find_all("tr")[1:]
    for row in rows:
        if "style" in row.attrs and "display: none" in str(row.attrs.get("style", "")):
            continue

        cells = row.find_all("td")
        if len(cells) < 7:
            continue

        weeks_text = extract_text(cells[5] if len(cells) > 5 else None)
        base = {
            "name": extract_text(cells[1] if len(cells) > 1 else None),
            "credit": safe_float(extract_text(cells[2] if len(cells) > 2 else None), 0.0),
            "teacher": extract_text(cells[3] if len(cells) > 3 else None),
            "weeksText": weeks_text,
            "type": extract_text(cells[6] if len(cells) > 6 else None),
            "studentCount": safe_int(extract_text(cells[7] if len(cells) > 7 else None), 0),
            "semesterId": semester_id,
            "semesterName": semester_name,
        }

        schedule_text = cells[4].get_text("\n", strip=True) if len(cells) > 4 else ""
        time_locations = parse_schedule_segments(schedule_text, weeks_text)
        if time_locations:
            for time_location in time_locations:
                course = dict(base)
                course.update(
                    {
                        "day": time_location["day"],
                        "startSlot": time_location["startSlot"],
                        "endSlot": time_location["endSlot"],
                        "weeks": time_location["weeks"],
                        "location": time_location["location"],
                        "weekType": time_location["weekType"],
                        "timeLocation": time_location,
                    }
                )
                courses.append(course)
        else:
            course = dict(base)
            course.update(
                {
                    "day": 0,
                    "startSlot": 0,
                    "endSlot": 0,
                    "weeks": [],
                    "location": "",
                    "weekType": "all",
                    "timeLocation": None,
                }
            )
            courses.append(course)

    return {
        "semesterId": semester_id,
        "semesterName": semester_name,
        "startDate": infer_semester_start_date(semester_id, semester_name),
        "courses": courses,
    }


def parse_grades_page(html: str, semester_id: str, semester_name: str) -> dict[str, Any]:
    soup = BeautifulSoup(html or "", "lxml")
    table = soup.find("table", {"id": "data_table"})
    if not table:
        return {
            "semesterId": semester_id,
            "semesterName": semester_name,
            "courses": [],
            "summary": {
                "courseCount": 0,
                "creditTotal": 0.0,
                "averageScore": 0.0,
                "failedCount": 0,
            },
        }

    courses: list[dict[str, Any]] = []
    weighted_total = 0.0
    credit_total = 0.0
    failed_count = 0

    for row in table.find_all("tr")[1:]:
        columns = row.find_all("td")
        if len(columns) < 8:
            continue

        score_text = extract_text(columns[3])
        score = safe_float(score_text, 0.0)
        course = {
            "courseName": extract_text(columns[1]),
            "credit": safe_float(extract_text(columns[2]), 0.0),
            "score": score,
            "scoreText": score_text,
            "level": extract_text(columns[4]),
            "studyType": extract_text(columns[5]),
            "midtermStatus": extract_text(columns[6]),
            "finalStatus": extract_text(columns[7]),
            "semesterId": semester_id,
            "semesterName": semester_name,
        }
        courses.append(course)

        if course["credit"] > 0 and score > 0:
            credit_total += course["credit"]
            weighted_total += course["credit"] * score
        if (score > 0 and score < 60) or "不及格" in course["level"]:
            failed_count += 1

    average_score = round(weighted_total / credit_total, 2) if credit_total > 0 else 0.0
    return {
        "semesterId": semester_id,
        "semesterName": semester_name,
        "courses": courses,
        "summary": {
            "courseCount": len(courses),
            "creditTotal": round(credit_total, 2),
            "averageScore": average_score,
            "failedCount": failed_count,
        },
    }


def parse_personal_info_html(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html or "", "lxml")
    info_table = soup.find("table", class_="form")
    if not info_table:
        raise EducationJwError("未找到个人信息", 500)

    raw_info: dict[str, str] = {}
    for row in info_table.find_all("tr"):
        cells = row.find_all(["th", "td"])
        for index in range(0, max(len(cells) - 1, 0), 2):
            if index + 1 >= len(cells):
                continue
            key = extract_text(cells[index]).replace("\uff1a", "")
            value = extract_text(cells[index + 1])
            if key and value:
                raw_info[key] = value

    def pick_value(*keys: str) -> str:
        for key in keys:
            value = raw_info.get(key)
            if value:
                return value
        return ""

    return {
        "name": pick_value("\u59d3\u540d", "\u6fee\u64b3\u6095"),
        "studentId": pick_value("\u5b66\u53f7", "\u701b\ufe42\u5f7f"),
        "class": pick_value("\u884c\u653f\u73ed\u7ea7", "\u741b\u5c6f\u65c2\u941d\ue17c\u9a87", "\u73ed\u7ea7", "\u941d\u5c10\u6942"),
        "major": pick_value("\u4e13\u4e1a", "\u6d93\u6487\u7b1f"),
        "grade": pick_value("\u5e74\u7ea7", "\u9aa8\u5f67\u9aa8"),
        "gender": pick_value("\u6027\u522b", "\u93ac\u5a07\u713c"),
        "dormitory": pick_value("\u5bbf\u820d", "\u701b\u80ef\u57c3"),
    }


class EducationJwClient:
    def __init__(self, base_url: str = "http://jw.xujc.com", timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.default_headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Origin": self.base_url,
            "Referer": f"{self.base_url}/index.php?c=Login&a=login",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            ),
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        self.session.headers.update(self.default_headers)

    def set_cookie_bundle(self, cookie_bundle: str) -> None:
        cookie_dict = parse_cookie_bundle(cookie_bundle)
        self.session.cookies.clear()
        self.session.cookies.update(cookie_dict)

    def get_cookie_bundle(self) -> str:
        return serialize_cookie_bundle(self.session.cookies.get_dict())

    def _http_base_url(self) -> str:
        if self.base_url.startswith("http://"):
            return self.base_url
        if self.base_url.startswith("https://"):
            return f"http://{self.base_url[len('https://'):]}"
        return f"http://{self.base_url.lstrip('/')}"

    def _request(
        self,
        method: str,
        path_or_url: str,
        *,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> requests.Response:
        url = path_or_url if path_or_url.startswith("http") else urljoin(f"{self.base_url}/", path_or_url.lstrip("/"))
        response = self.session.request(
            method=method,
            url=url,
            params=params,
            data=data,
            headers={**self.default_headers, **(headers or {})},
            timeout=self.timeout,
            allow_redirects=True,
        )
        return response

    def get_captcha(self) -> dict[str, Any]:
        response = self._request(
            "GET",
            "/imginfo.php",
            headers={
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Referer": f"{self.base_url}/index.php?c=Login&a=login",
            },
        )
        if response.status_code != 200:
            raise EducationJwError("获取验证码失败", 502)

        captcha_text = unquote(response.cookies.get("clicaptcha_text", ""))
        captcha_info = response.cookies.get("clicaptcha_info", "")
        if not captcha_text or not captcha_info:
            raise EducationJwError("验证码响应不完整", 502)

        hints = [clean_text(item) for item in captcha_text.split(",") if clean_text(item)]
        image_width, image_height = get_image_dimensions(response.content)
        return {
            "captchaImageBase64": base64.b64encode(response.content).decode("utf-8"),
            "captchaTextHints": hints,
            "captchaInfo": captcha_info,
            "cookieBundle": self.get_cookie_bundle(),
            "imageWidth": image_width,
            "imageHeight": image_height,
        }

    def verify_captcha(self, imginfo: str) -> bool:
        response = self._request(
            "POST",
            "/imginfo.php",
            data={"do": "check", "info": imginfo},
            headers={"Accept": "*/*", "X-Requested-With": "XMLHttpRequest"},
        )
        return clean_text(response.text) == "1"

    def check_login_status(self) -> bool:
        homepage_response = self._request(
            "GET",
            self.base_url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Upgrade-Insecure-Requests": "1",
            },
        )
        if homepage_response.status_code != 200:
            return False

        response = self._request(
            "GET",
            "/student/index.php",
            params={"c": "Default", "a": "index"},
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Upgrade-Insecure-Requests": "1",
                "Cache-Control": "no-cache",
            },
        )
        response.encoding = "gbk"
        if "login" in response.url.lower():
            return False

        soup = BeautifulSoup(response.text, "lxml")
        if soup.find("div", {"id": "menuinf"}):
            return True
        welcome = soup.find("div", {"id": "inf"})
        if welcome and "欢迎" in extract_text(welcome):
            return True
        nav_menu = soup.find("ul", {"class": "nav"})
        if nav_menu and nav_menu.find_all("li"):
            return True
        if soup.find("input", {"name": "username"}):
            return False
        return False

    def submit_login(self, username: str, password: str, imginfo: str, captcha_info: str = "") -> dict[str, Any]:
        if captcha_info:
            self.session.cookies.set("clicaptcha_info", captcha_info)

        if not self.verify_captcha(imginfo):
            raise EducationJwError("验证码错误", 400)

        login_data = {
            "username": username,
            "password": password,
            "user_lb": "学生",
            "imginfo": imginfo,
        }
        encoded_data = {
            key: value.encode("gb2312") if isinstance(value, str) else value
            for key, value in login_data.items()
        }

        response = self._request(
            "POST",
            "/index.php",
            params={"c": "Login", "a": "login"},
            data=encoded_data,
            headers=self.default_headers,
        )
        response.encoding = "gbk"
        if "student/index.php" not in response.url:
            raise EducationJwError(parse_error_message(response.text), 401)
        if not self.check_login_status():
            raise EducationJwError("登录状态校验失败", 401)

        return {
            "cookieBundle": self.get_cookie_bundle(),
            "personalInfo": self.get_personal_info(),
        }

    def get_login_link(self) -> dict[str, Any]:
        http_base_url = self._http_base_url()
        response = self._request(
            "GET",
            f"{http_base_url}/imgqrcode.php",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Origin": http_base_url,
                "Referer": f"{http_base_url}/index.php?c=Login&a=login",
            },
        )
        if response.status_code != 200:
            raise EducationJwError("获取登录链接失败", 502)

        try:
            payload = response.json()
        except ValueError as error:
            raise EducationJwError("登录链接响应无效", 502) from error

        if safe_int(str(payload.get("code") or ""), 0) != 1:
            raise EducationJwError(clean_text(payload.get("info")) or "获取登录链接失败", 502)

        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        login_url = clean_text(data.get("url"))
        ticket = clean_text(data.get("ticket"))
        if not login_url or not ticket:
            raise EducationJwError("登录链接响应不完整", 502)

        return {
            "loginUrl": login_url,
            "ticket": ticket,
            "cookieBundle": self.get_cookie_bundle(),
        }

    def check_login_link_status(self, ticket: str) -> dict[str, str]:
        normalized_ticket = clean_text(ticket)
        if not normalized_ticket:
            raise EducationJwError("缺少 ticket 参数", 400)

        http_base_url = self._http_base_url()
        response = self._request(
            "GET",
            f"{http_base_url}/imgqrcode.php",
            params={"ticket": normalized_ticket},
            headers={
                "Accept": "text/plain, */*; q=0.01",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": f"{http_base_url}/index.php?c=Login&a=login",
            },
        )
        if response.status_code != 200:
            return {
                "status": "error",
                "message": f"HTTP 错误: {response.status_code}",
            }

        try:
            payload = response.json()
        except ValueError:
            return {
                "status": "error",
                "message": "解析登录状态失败",
            }

        if isinstance(payload, dict):
            raw_code = payload.get("code")
            code = safe_int(raw_code if raw_code is not None else "", -1)
            info = clean_text(payload.get("info"))
        elif isinstance(payload, int):
            code = payload
            info = ""
        else:
            return {
                "status": "error",
                "message": "登录状态响应格式无效",
            }

        if code == 1:
            return {
                "status": "confirmed",
                "message": info or "扫码完成，正在确认登录",
            }
        if code == 0:
            if "expired" in info.lower() or "过期" in info:
                return {
                    "status": "expired",
                    "message": info or "登录链接已过期",
                }
            return {
                "status": "waiting",
                "message": info or "等待扫码完成",
            }
        return {
            "status": "error",
            "message": info or "检查登录状态失败",
        }

    def confirm_login_link(self, ticket: str) -> dict[str, Any]:
        normalized_ticket = clean_text(ticket)
        if not normalized_ticket:
            raise EducationJwError("缺少 ticket 参数", 400)

        http_base_url = self._http_base_url()
        response = self._request(
            "POST",
            f"{http_base_url}/index.php?c=Login&a=qrlogin",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": f"{http_base_url}/index.php?c=Login&a=login",
            },
            data=f"ticket={normalized_ticket}&userlb={quote('学生', encoding='gb2312')}",
        )
        response.encoding = "gbk"
        if response.status_code != 200:
            raise EducationJwError(f"登录请求失败: HTTP {response.status_code}", 502)
        if not self.check_login_status():
            soup = BeautifulSoup(response.text or "", "lxml")
            error_node = soup.find(class_="error") or soup.find(class_="alert")
            message = extract_text(error_node) or parse_error_message(response.text) or "链接登录失败，请重试"
            raise EducationJwError(message, 401)

        return {
            "cookieBundle": self.get_cookie_bundle(),
            "personalInfo": self.get_personal_info(),
        }

    def get_personal_info(self) -> dict[str, Any]:
        response = self._request(
            "GET",
            "/student/index.php",
            params={"c": "Default", "a": "inf"},
        )
        if response.status_code != 200:
            raise EducationJwError("获取个人信息失败", 502)
        response.encoding = "gbk"
        return parse_personal_info_html(response.text)

    def _get_schedule_semester_options(self) -> list[SemesterOption]:
        if not self.check_login_status():
            raise EducationJwError("Cookie 已失效，请重新登录", 401)

        response = self._request(
            "GET",
            "/student/index.php",
            params={"c": "Default", "a": "Wdkc"},
            headers={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
        )
        response.encoding = "gb2312"
        soup = BeautifulSoup(response.text, "lxml")
        semesters = split_semesters(soup)
        if not semesters:
            raise EducationJwError("未找到学期选择器，可能登录已失效", 401)
        return semesters

    def get_schedule_semesters(self) -> list[dict[str, str]]:
        semesters = self._get_schedule_semester_options()
        return [build_semester_summary(semester) for semester in semesters]

    def get_schedule(self, semester_id: str | None = None) -> dict[str, Any]:
        semesters = self._get_schedule_semester_options()
        target_semester = None
        normalized_semester_id = clean_text(semester_id)
        if normalized_semester_id:
            target_semester = next((item for item in semesters if item.semester_id == normalized_semester_id), None)
            if target_semester is None:
                target_semester = SemesterOption(semester_id=normalized_semester_id, semester_name=normalized_semester_id)
        else:
            target_semester = choose_default_semester(semesters)

        if target_semester is None:
            raise EducationJwError("未找到可用学期", 404)

        semester_response = self._request(
            "GET",
            "/student/index.php",
            params={"c": "Default", "a": "Wdkc", "tm_id": target_semester.semester_id},
            headers={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
        )
        semester_response.encoding = "gbk"
        return parse_courses_page(semester_response.text, target_semester.semester_id)

    def get_grades(self) -> dict[str, Any]:
        if not self.check_login_status():
            raise EducationJwError("Cookie 已失效，请重新登录", 401)

        response = self._request("GET", "/student/index.php", params={"c": "Search", "a": "cj"})
        response.encoding = "gbk"
        soup = BeautifulSoup(response.text, "lxml")
        semesters = split_semesters(soup)
        if not semesters:
            raise EducationJwError("未找到成绩学期列表，可能登录已失效", 401)

        semester_results: list[dict[str, Any]] = []
        total_credits = 0.0
        total_weighted_score = 0.0
        total_courses = 0
        failed_courses: list[dict[str, Any]] = []

        for semester in semesters:
            semester_response = self._request(
                "GET",
                "/student/index.php",
                params={"c": "Search", "a": "cj", "tm_id": semester.semester_id},
            )
            semester_response.encoding = "gbk"
            semester_result = parse_grades_page(
                semester_response.text,
                semester.semester_id,
                semester.semester_name,
            )
            semester_results.append(semester_result)

            for course in semester_result["courses"]:
                score = float(course.get("score") or 0)
                credit = float(course.get("credit") or 0)
                if credit > 0 and score > 0:
                    total_credits += credit
                    total_weighted_score += score * credit
                if (score > 0 and score < 60) or "不及格" in str(course.get("level") or ""):
                    failed_courses.append(course)
            total_courses += len(semester_result["courses"])

        average_score = round(total_weighted_score / total_credits, 2) if total_credits > 0 else 0.0
        return {
            "semesters": semester_results,
            "summary": {
                "semesterCount": len(semester_results),
                "courseCount": total_courses,
                "creditTotal": round(total_credits, 2),
                "averageScore": average_score,
                "failedCount": len(failed_courses),
            },
            "failedCourses": failed_courses,
        }
