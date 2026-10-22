from __future__ import annotations

import logging
import re
import time
from typing import Annotated

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.service import json_fields as j
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .agent_json import MalformedJson, parse

log = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
MAX_MATCHES = 3

INSTRUCTIONS = """Bạn đối chiếu yêu cầu của một giáo viên vật lý phổ thông Việt Nam với THƯ VIỆN các thí nghiệm mô phỏng đã làm sẵn, để xem điều họ muốn có sẵn rồi không. Trả JSON {"matches":[{"id","reason"}]}.
- Chọn một thí nghiệm khi điều giáo viên muốn về cơ bản LÀ thí nghiệm đó: cùng hiện tượng và cùng cách bố trí chính (cùng dụng cụ, cùng điều học sinh quan sát). So theo NGHĨA, không cần trùng chữ: cách nói khác, tả dụng cụ thay vì gọi tên, nêu mục tiêu bài học hay đại lượng muốn đổi đều tính.
- KHÔNG chọn thí nghiệm chỉ cùng chủ đề hay cùng chương mà khác hiện tượng hoặc khác bố trí (ví dụ yêu cầu về con lắc lò xo thì không chọn con lắc đơn).
- Tối đa 3, xếp theo mức khớp giảm dần; chỉ đưa thêm thí nghiệm thứ hai, thứ ba khi chúng cũng khớp thật. Không có thí nghiệm nào khớp thì matches = [].
- id: đúng như trong mục lục. reason: một câu ngắn tiếng Việt nói vì sao thí nghiệm đó đúng là điều giáo viên muốn.

MỤC LỤC THƯ VIỆN (id | tên | lĩnh vực | lớp | mô tả | mục tiêu):
"""


class CatalogEntry(CamelModel):
    """One experiment of the library, as the frontend sends it."""

    id: str | None = None
    title: str | None = None
    domain: str | None = None
    grade: int = 0
    desc: str | None = None
    objective: str | None = None


class Match(CamelModel):
    id: str
    reason: Text = ""


class MatchResult(CamelModel):
    matches: Annotated[list[Match], EmptyIfNone] = []


def _clean(text: str | None) -> str:
    """One line per experiment: newlines and the separator inside a field would break the index."""
    return "" if text is None else re.sub(r"\s+", " ", text).replace("|", "/").strip()


def _line(entry: CatalogEntry) -> str:
    return " | ".join([entry.id.strip(), _clean(entry.title), _clean(entry.domain), str(entry.grade), _clean(entry.desc), _clean(entry.objective)])


class ExperimentMatchAgent:
    """One call before the lite flow: is what the teacher asks for already one of the ready-made experiments of the library? The catalog
    comes with the request (the frontend owns the presets); the answer is up to :data:`MAX_MATCHES` of its ids, best first, matched on
    meaning rather than wording. None means the lite flow builds a new one."""

    def __init__(self, ai_client: AiClient):
        self._ai_client = ai_client

    def match(self, teacher_request: str, catalog: list[CatalogEntry]) -> MatchResult:
        by_id: dict[str, CatalogEntry] = {}
        for entry in catalog:
            if entry.id and entry.id.strip():
                by_id.setdefault(entry.id.strip(), entry)
        # The instructions and the catalog come before the teacher's request, so the provider can cache them as one prefix.
        index = "\n".join(_line(e) for e in by_id.values())
        user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacher_request
        issue: str | None = None
        last: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = INSTRUCTIONS + index + "\n\n" + user + ("" if issue is None else f"\n\nLần trước bị từ chối vì: {issue}\nHãy trả lại toàn bộ JSON đã sửa.")
            started = time.monotonic()
            try:
                result = self.parse(parse(self._ai_client.generate_structured_text(prompt, StructuredOutputSchemaRegistry.EXPERIMENT_MATCH_RESPONSE)),
                                    set(by_id))
                log.info("ExperimentMatchAgent accepted: attempt=%d/%d, matches=%s, elapsedMs=%d", attempt, MAX_ATTEMPTS, [m.id for m in result.matches],
                         int((time.monotonic() - started) * 1000))
                return result
            except InvalidAgentResponseError as rejected:
                issue, last = str(rejected), rejected
                log.warning("ExperimentMatchAgent rejected: attempt=%d/%d, issue=%s", attempt, MAX_ATTEMPTS, issue)
            except MalformedJson as malformed:
                issue, last = "JSON không hợp lệ: " + malformed.reason, InvalidAgentResponseError("AI trả về JSON không hợp lệ")
                log.warning("ExperimentMatchAgent malformed JSON: attempt=%d/%d", attempt, MAX_ATTEMPTS)
        raise InvalidAgentResponseError(f"Không đối chiếu được với thư viện sau {MAX_ATTEMPTS} lần: {last or ''}") from last

    @staticmethod
    def parse(root, ids: set[str]) -> MatchResult:
        entries = j.field(root, "matches")
        if not isinstance(entries, list):
            raise InvalidAgentResponseError("thiếu mảng matches")
        problems: list[str] = []
        seen: set[str] = set()
        matches: list[Match] = []
        for node in entries:
            match_id = j.text(j.field(node, "id")).strip()
            if match_id not in ids:
                problems.append(f"id '{match_id}' không có trong mục lục; dùng đúng id trong mục lục")
            elif match_id not in seen:
                seen.add(match_id)
                matches.append(Match(id=match_id, reason=j.text(j.field(node, "reason")).strip()))
        if problems:
            raise InvalidAgentResponseError("; ".join(problems))
        # Best first: past the limit only the weakest are dropped, not worth another attempt.
        return MatchResult(matches=matches[:MAX_MATCHES])
