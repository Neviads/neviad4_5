from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class RunDraft:
    """A live preview of the file the model is writing, published to ``/topic/agents/simulation/{runId}/draft`` while the model is still
    generating it. Display only: nothing here has been checked or saved. ``type`` is START, DELTA (append ``text``), ABORT or, only for
    runs that ask for it, END. ``path`` is the file being written once known; ``tool`` the tool whose argument streams (``write_file`` or
    ``edit_file``); ``title`` names the object when several agents draw at once on one run."""

    START: ClassVar[str] = "START"
    DELTA: ClassVar[str] = "DELTA"
    ABORT: ClassVar[str] = "ABORT"
    #: Only when asked for: the file has been completely received, so the preview is over and the real file is about to land.
    END: ClassVar[str] = "END"

    run_id: str
    type: str
    text: str
    seq: int
    path: str = ""
    tool: str = ""
    title: str = ""
