package com.neviad.beneviadsystem.infrastructure.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonStringFieldStreamTest {
    private static String collect(String json, int chunk) {
        var stream = new JsonStringFieldStream("content");
        var out = new StringBuilder();
        for (int i = 0; i < json.length(); i += chunk) out.append(stream.feed(json.substring(i, Math.min(json.length(), i + chunk))));
        return out.toString();
    }

    @Test
    void decodesEscapesAndIgnoresOtherFieldsAtEveryChunkSize() {
        String json = "{\"path\":\"simulation.html\",\"content\":\"<p class=\\\"a\\\">x\\n\\ty\\\\z \\u00e9 \\u0111 \\ud83d\\ude00</p>\",\"expectedHash\":\"content\"}";
        String expected = "<p class=\"a\">x\n\ty\\z \u00e9 \u0111 \ud83d\ude00</p>";
        for (int chunk : new int[] {1, 2, 3, 5, 7, 64, 1000}) assertEquals(expected, collect(json, chunk), "chunk " + chunk);
    }

    @Test
    void findsTheFieldAfterNestedAndNonStringValues() {
        String json = "{\"meta\":{\"content\":\"no\",\"list\":[1,\"}\",{\"a\":\"b\"}]},\"n\":12,\"flag\":true,\"content\":\"yes\"}";
        for (int chunk : new int[] {1, 4, 100}) assertEquals("yes", collect(json, chunk), "chunk " + chunk);
    }

    @Test
    void emitsPartialValueAndReportsFinishOnlyAtTheClosingQuote() {
        var stream = new JsonStringFieldStream("content");
        assertEquals("ab", stream.feed("{\"content\":\"ab"));
        assertFalse(stream.finished());
        assertEquals("c", stream.feed("c\",\"x\":1}"));
        assertTrue(stream.finished());
        assertEquals("", stream.feed(""));
    }

    @Test
    void absentFieldOrGarbageProducesNothing() {
        assertEquals("", collect("{\"path\":\"a\"}", 3));
        assertEquals("", collect("not json", 2));
    }
}
