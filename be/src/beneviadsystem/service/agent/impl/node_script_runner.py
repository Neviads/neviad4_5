from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

from beneviadsystem.config.settings import REPOSITORY_ROOT

MAX_OUTPUT_BYTES = 2_000_000
_LINE_BREAK = re.compile(r"\r\n|[\n\r  \x0b\x0c\x85]")


class ScriptFailure(Exception):
    """The script could not give a result; the message says why, in words the model or the teacher reads."""


class NodeScriptRunner:
    """Runs one script of ``fe/scripts``: JSON in on stdin, the LAST JSON line of stdout out. Any failure is a :class:`ScriptFailure`,
    never a result."""

    def __init__(self, fe_root: str | os.PathLike[str], node_command: str, timeout_seconds: float):
        self._fe_root = Path(fe_root).resolve()
        self._node_command = node_command
        self._timeout = timeout_seconds

    @staticmethod
    def resolve_fe_root(setting: str | None) -> Path:
        """The configured frontend root: the setting when given, else ``fe`` or ``../fe`` relative to the working directory, else the ``fe``
        folder of this repository."""
        if setting and setting.strip():
            return Path(setting)
        for candidate in (Path("fe"), Path("../fe"), REPOSITORY_ROOT / "fe"):
            if (candidate / "neviadlike_structure").is_dir():
                return candidate
        return Path("fe")

    def run(self, script_name: str, payload: Any) -> Any:
        script = self._fe_root / "scripts" / script_name
        if not script.is_file():
            raise ScriptFailure(f"Không thấy script kiểm tra {script}")
        try:
            completed = subprocess.run([self._node_command, str(script)], input=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                                       stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, cwd=self._fe_root, timeout=self._timeout, check=False)
        except subprocess.TimeoutExpired:
            raise ScriptFailure(f"Kiểm tra chạy quá {int(self._timeout)} giây.") from None
        except OSError as failure:
            raise ScriptFailure(f"Không chạy được Node ({self._node_command}): {failure}") from failure
        stdout = completed.stdout[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
        line = None
        for candidate in _LINE_BREAK.split(stdout):
            if candidate.strip().startswith("{"):
                line = candidate.strip()
        if line is None:
            raise ScriptFailure("Script kiểm tra không in kết quả.")
        try:
            return json.loads(line)
        except json.JSONDecodeError as malformed:
            raise ScriptFailure(f"Script kiểm tra in kết quả không phải JSON: {malformed.msg}") from malformed
