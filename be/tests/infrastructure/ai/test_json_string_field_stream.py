from beneviadsystem.infrastructure.ai.json_string_field_stream import JsonStringFieldStream


def collect(text: str, chunk: int) -> str:
    stream = JsonStringFieldStream("content")
    return "".join(stream.feed(text[i:i + chunk]) for i in range(0, len(text), chunk))


def test_decodes_escapes_and_ignores_other_fields_at_every_chunk_size():
    text = '{"path":"simulation.html","content":"<p class=\\"a\\">x\\n\\ty\\\\z \\u00e9 \\u0111 \\ud83d\\ude00</p>","expectedHash":"content"}'
    expected = '<p class="a">x\n\ty\\z é đ \U0001F600</p>'
    for chunk in (1, 2, 3, 5, 7, 64, 1000):
        assert collect(text, chunk) == expected, f"chunk {chunk}"


def test_finds_the_field_after_nested_and_non_string_values():
    text = '{"meta":{"content":"no","list":[1,"}",{"a":"b"}]},"n":12,"flag":true,"content":"yes"}'
    for chunk in (1, 4, 100):
        assert collect(text, chunk) == "yes", f"chunk {chunk}"


def test_emits_partial_value_and_reports_finish_only_at_the_closing_quote():
    stream = JsonStringFieldStream("content")
    assert stream.feed('{"content":"ab') == "ab"
    assert not stream.finished()
    assert stream.feed('c","x":1}') == "c"
    assert stream.finished()
    assert stream.feed("") == ""


def test_absent_field_or_garbage_produces_nothing():
    assert collect('{"path":"a"}', 3) == ""
    assert collect("not json", 2) == ""
