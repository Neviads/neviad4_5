from __future__ import annotations

import json
import logging
import re
from typing import Annotated

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, TextList
from beneviadsystem.service import json_fields as j
from beneviadsystem.service.source_library_service import SourceLibraryService
from beneviadsystem.service.text_format import fold_accents, one_line

log = logging.getLogger(__name__)
OBJECTS = "objects"
CATALOG = "catalog"
CATALOG_FILE = "object-catalog.md"
OTHER_TOPIC = 0
_META = re.compile(r"/\*\s*OBJECT-META\s*([\s\S]*?)\*/")
_GROUP = re.compile(r"^## (\d+)\.\s+(.+)$")
_SEPARATOR_ROW = re.compile(r"^\|[\s|:-]+\|$")


class Part(CamelModel):
    name: str
    label: str
    motion: str
    min: float
    max: float


class Summary(CamelModel):
    """``id`` is the file path in the collection, the one handle the tools use."""

    id: str
    name: str
    title: str
    topic: int
    topic_title: str
    width: float
    height: float
    anchor: str
    parts: Annotated[list[Part], EmptyIfNone] = []
    points: TextList = []
    use_when: TextList = []
    avoid_when: TextList = []


def fold(text: str) -> str:
    return fold_accents(text)


class ObjectLibraryService:
    """The drawn objects of ``/vat-the-mo-phong`` (collection ``objects``) seen as a catalogue an agent reads: a summary per object (no
    source) and the topic it belongs to. The topics are the numbered groups of ``docs/object-catalog.md`` (collection ``catalog``); an object
    is joined to its group by the ``catalog`` name of its OBJECT-META, and one that matches no row sits in :data:`OTHER_TOPIC`. Read-only."""

    def __init__(self, sources: SourceLibraryService):
        self._sources = sources

    def index(self) -> str:
        """The whole library as a short text an agent reads at once: a heading per topic (in catalogue order, :data:`OTHER_TOPIC` last), then
        one line per object with its id, name, title and useWhen. The text only changes when the library does, so a prompt that starts with
        it keeps a cacheable prefix."""
        out: list[str] = []
        current: int | None = None
        ordered = sorted(self._all(), key=lambda s: (float("inf") if s.topic == OTHER_TOPIC else s.topic, s.name, s.id))
        for s in ordered:
            if s.topic != current:
                current = s.topic
                out.append(("\n" if out else "") + f"## {s.topic_title}\n")
            line = f"- {s.id} | {one_line(s.name)} | {one_line(s.title)}"
            if s.use_when:
                line += " | Dùng khi: " + one_line("; ".join(s.use_when))
            out.append(line + "\n")
        return "".join(out)

    def find(self, object_id: str) -> Summary | None:
        return next((s for s in self._all() if s.id == object_id), None)

    def available(self) -> bool:
        """True when the library has at least one drawn object."""
        return bool(self._all())

    def _all(self) -> list[Summary]:
        row_topic, topic_titles = self._catalog_topics()
        out: list[Summary] = []
        for file in self._sources.files(OBJECTS):
            if not file.path.endswith(".ts"):
                continue
            meta = _META.search(file.content)
            if meta is None:
                continue
            try:
                root = json.loads(meta.group(1))
                if not isinstance(root, dict):
                    raise ValueError("OBJECT-META is not an object")
                name = j.text(root.get("catalog")).strip()
                topic = row_topic.get(fold(name), OTHER_TOPIC)
                parts = [Part(name=j.text(p.get("name")), label=j.text(p.get("label"), j.text(p.get("name"))), motion=j.text(p.get("motion")),
                              min=j.number(p.get("min")), max=j.number(p.get("max"))) for p in j.items(root.get("parts")) if isinstance(p, dict)]
                points = [j.text(p.get("name")) for p in j.items(root.get("points")) if isinstance(p, dict)]
                size = root.get("size") if isinstance(root.get("size"), dict) else {}
                out.append(Summary(id=file.path, name=name, title=j.text(root.get("title")), topic=topic, topic_title=topic_titles.get(topic, "Khác"),
                                   width=j.number(size.get("width")), height=j.number(size.get("height")), anchor=j.text(root.get("anchor")),
                                   parts=parts, points=points, use_when=_texts(root.get("useWhen")), avoid_when=_texts(root.get("avoidWhen"))))
            except (ValueError, AttributeError) as broken:
                log.warning("Object %s skipped: its OBJECT-META is not valid JSON (%s)", file.path, broken)
        out.sort(key=lambda s: (s.topic, s.name))
        return out

    def _catalog_topics(self) -> tuple[dict[str, int], dict[int, str]]:
        """Folded object name to topic index, from the numbered groups and table rows of the catalogue file; none when it was not loaded."""
        row_topic: dict[str, int] = {}
        topic_titles: dict[int, str] = {OTHER_TOPIC: "Khác"}
        file = self._sources.file(CATALOG, CATALOG_FILE)
        if file is None:
            return row_topic, topic_titles
        current, header = -1, False
        for raw in file.content.replace("\r\n", "\n").split("\n"):
            line = raw.strip()
            if line.startswith("## "):
                group = _GROUP.match(line)
                current = int(group.group(1)) if group else -1
                if current >= 0:
                    topic_titles[current] = re.sub(r"\s*\(.*\)\s*$", "", group.group(2).strip())
                header = False
                continue
            if current < 0 or not line.startswith("|") or _SEPARATOR_ROW.match(line):
                continue
            if not header:
                header = True
                continue
            name = line[1:].split("|")[0].strip()
            if name:
                row_topic.setdefault(fold(name), current)
        return row_topic, topic_titles


def _texts(node) -> list[str]:
    """The strings of a JSON array (a lone string counts as one); empty when absent."""
    if isinstance(node, str):
        return [node.strip()]
    return [item.strip() for item in j.items(node) if isinstance(item, str) and item.strip()]
