from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


class AppwriteRequestError(RuntimeError):
    def __init__(self, message: str, code: int = 500, response: Any | None = None):
        super().__init__(message)
        self.code = code
        self.response = response


@dataclass
class AppwriteTablesClient:
    endpoint: str
    project_id: str
    api_key: str
    timeout: float = 10.0

    def __post_init__(self) -> None:
        self.endpoint = self.endpoint.rstrip("/")

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> Any:
        headers = {
            "X-Appwrite-Project": self.project_id,
            "X-Appwrite-Key": self.api_key,
            "content-type": "application/json",
        }
        response = requests.request(
            method=method,
            url=f"{self.endpoint}{path}",
            params=query,
            json=body,
            headers=headers,
            timeout=self.timeout,
        )

        payload: Any
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}

        if response.status_code >= 400:
            message = str(payload.get("message") or f"Appwrite request failed ({response.status_code})")
            raise AppwriteRequestError(message, response.status_code, payload)

        return payload

    def create_row(
        self,
        *,
        database_id: str,
        table_id: str,
        row_id: str,
        data: dict[str, Any],
        permissions: list[str] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"rowId": row_id, "data": data}
        if permissions is not None:
            body["permissions"] = permissions
        return self._request(
            "POST",
            f"/tablesdb/{database_id}/tables/{table_id}/rows",
            body=body,
        )

    def get_row(self, *, database_id: str, table_id: str, row_id: str) -> dict[str, Any]:
        return self._request(
            "GET",
            f"/tablesdb/{database_id}/tables/{table_id}/rows/{row_id}",
        )

    def update_row(
        self,
        *,
        database_id: str,
        table_id: str,
        row_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        return self._request(
            "PATCH",
            f"/tablesdb/{database_id}/tables/{table_id}/rows/{row_id}",
            body={"data": data},
        )
