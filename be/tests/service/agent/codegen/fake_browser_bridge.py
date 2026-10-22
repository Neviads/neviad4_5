"""A browser in memory: answers the file operations of the code agent from a dict, and remembers every operation it was asked."""
from __future__ import annotations

from beneviadsystem.service.agent.codegen.code_store import SearchRules
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import LiveCodeProtocol, Result
from beneviadsystem.service.text_format import java_lines


class FakeBrowserBridge(LiveCodeBridge):
    def __init__(self):
        self.files: dict[str, str] = {}
        self.ops: list[str] = []
        self.down = False
        #: How many appends still succeed; the next one fails (the browser went away while a note was being written).
        self.appends_before_failure = 10**9

    def call(self, run_id, op, args, timeout_seconds):
        self.ops.append(op)
        if self.down:
            return Result.failure("c", run_id, LiveCodeProtocol.ERROR_BRIDGE, "chưa có phiên live code")
        if op == LiveCodeProtocol.OP_FS_READ:
            content = self.files.get(args["path"])
            return self._ok(run_id, {} if content is None else {"content": content})
        if op == LiveCodeProtocol.OP_FS_WRITE:
            self.files[args["path"]] = args["content"]
            return self._ok(run_id, {})
        if op == LiveCodeProtocol.OP_FS_LIST:
            prefix = args["folder"] + "/" if args.get("folder") else ""
            return self._ok(run_id, {"files": sorted(p for p in self.files if p.startswith(prefix))})
        if op == LiveCodeProtocol.OP_FS_APPEND:
            self.appends_before_failure -= 1
            if self.appends_before_failure < 0:
                return Result.failure("c", run_id, LiveCodeProtocol.ERROR_BRIDGE, "mất kết nối khi ghi ghi chú")
            self.files[args["path"]] = self.files.get(args["path"], "") + args["text"] + "\n"
            return self._ok(run_id, {})
        if op == LiveCodeProtocol.OP_FS_SEARCH:
            needle, limit = args["query"].lower(), args["max"]
            prefix = args["folder"] + "/" if args.get("folder") else ""
            matches: list[str] = []
            for path in sorted(self.files):
                if not path.startswith(prefix):
                    continue
                for number, line in enumerate(java_lines(self.files[path]), start=1):
                    if needle not in line.lower():
                        continue
                    if len(matches) >= limit:
                        matches.append(SearchRules.CUT_MARK)
                        return self._ok(run_id, {"matches": matches})
                    matches.append(f"{path}:{number}: {line.strip()}")
            return self._ok(run_id, {"matches": matches})
        return Result.failure("c", run_id, "UNKNOWN_OP", op)

    @staticmethod
    def _ok(run_id, data):
        return Result("c", run_id, True, data, None)
