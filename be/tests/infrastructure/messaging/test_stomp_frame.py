import pytest

from beneviadsystem.infrastructure.messaging.stomp_frame import StompFrame, StompFrameReader, StompProtocolError


def test_a_frame_with_a_body_is_read_by_its_content_length_even_with_a_nul_inside():
    reader = StompFrameReader()
    raw = "SEND\ndestination:/app/x\ncontent-length:5\n\na\x00bđ\x00".encode()

    (frame,) = reader.feed(raw)

    assert frame.command == "SEND"
    assert frame.headers["destination"] == "/app/x"
    assert frame.body == "a\x00bđ".encode()[:5]


def test_heartbeats_and_frames_split_across_messages_are_handled():
    reader = StompFrameReader()

    assert reader.feed(b"\n\r\n") == []
    assert reader.feed(b"SUBSCRIBE\nid:sub-0\ndestination:/topic/a\n") == []
    (frame,) = reader.feed(b"\n\x00\nCONNECT\naccept-version:1.2\n\n\x00")[:1]

    assert frame.command == "SUBSCRIBE" and frame.headers == {"id": "sub-0", "destination": "/topic/a"}


def test_header_values_are_escaped_except_in_connect_frames():
    encoded = StompFrame("MESSAGE", {"destination": "/topic/a:b\nc"}, b"{}").encode()

    assert b"destination:/topic/a\\cb\\nc\n" in encoded
    (frame,) = StompFrameReader().feed(encoded)
    assert frame.headers["destination"] == "/topic/a:b\nc"
    (connect,) = StompFrameReader().feed(b"CONNECT\nhost:a\\b\n\n\x00")
    assert connect.headers["host"] == "a\\b"


def test_the_first_header_wins_and_the_body_length_is_written():
    (frame,) = StompFrameReader().feed(b"SEND\ndestination:/a\ndestination:/b\n\nhi\x00")

    assert frame.headers["destination"] == "/a"
    assert b"content-length:2\n" in StompFrame("MESSAGE", {}, b"hi").encode()


def test_a_frame_larger_than_the_limit_is_refused():
    with pytest.raises(StompProtocolError):
        StompFrameReader(max_frame_bytes=10).feed(b"SEND\ndestination:/a\n\n" + b"x" * 20 + b"\x00")
