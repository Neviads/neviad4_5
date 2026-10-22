"""Exceptions shared by every layer.

Python has ``ValueError`` for a bad argument and ``NotImplementedError`` for an unsupported operation; this adds the third kind the
agents rely on: an operation that cannot be done in the current state (a store that is read-only, a browser that does not answer).
"""


class IllegalStateError(RuntimeError):
    """The operation is valid but cannot be carried out in the current state."""
