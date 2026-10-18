package com.neviad.beneviadsystem.infrastructure.ai;

/**
 * Pulls one top-level string field out of a JSON object that arrives in fragments, such as the arguments of a
 * streamed tool call. {@link #feed} returns the newly decoded characters of that field (escapes resolved); other
 * fields are skipped. It never throws: input that is not the expected shape just stops producing text.
 */
public final class JsonStringFieldStream {
    private enum State { START, KEY_OR_END, IN_KEY, AFTER_KEY, VALUE_START, IN_TARGET, SKIP_VALUE, DONE }

    private final String target;
    private State state = State.START;
    private final StringBuilder key = new StringBuilder();
    private boolean escape;
    private int unicodeDigits = -1;
    private int unicodeValue;
    private int depth;
    private boolean skipInString;
    private boolean targetFinished;

    public JsonStringFieldStream(String targetField) { this.target = targetField; }

    /** True once the closing quote of the target field has been read. */
    public boolean finished() { return targetFinished; }

    public String feed(String fragment) {
        var out = new StringBuilder();
        for (int i = 0; i < fragment.length(); i++) step(fragment.charAt(i), out);
        // A lone high surrogate would be cut in half by a frame boundary; hold it for the next fragment.
        int n = out.length();
        if (n > 0 && Character.isHighSurrogate(out.charAt(n - 1))) {
            heldSurrogate = out.charAt(n - 1);
            out.setLength(n - 1);
        }
        return out.toString();
    }

    private char heldSurrogate;

    private void emit(StringBuilder out, char c) {
        if (heldSurrogate != 0) {
            out.append(heldSurrogate);
            heldSurrogate = 0;
        }
        out.append(c);
    }

    private void step(char c, StringBuilder out) {
        switch (state) {
            case START -> { if (c == '{') state = State.KEY_OR_END; }
            case KEY_OR_END -> {
                if (c == '"') { key.setLength(0); state = State.IN_KEY; }
                else if (c == '}') state = State.DONE;
            }
            case IN_KEY -> {
                if (escape) { key.append(c); escape = false; }
                else if (c == '\\') escape = true;
                else if (c == '"') state = State.AFTER_KEY;
                else key.append(c);
            }
            case AFTER_KEY -> { if (c == ':') state = State.VALUE_START; }
            case VALUE_START -> {
                if (Character.isWhitespace(c)) return;
                if (c == '"' && !targetFinished && key.toString().equals(target)) {
                    state = State.IN_TARGET;
                    escape = false;
                    unicodeDigits = -1;
                } else {
                    state = State.SKIP_VALUE;
                    depth = 0;
                    skipInString = false;
                    escape = false;
                    skipChar(c);
                }
            }
            case IN_TARGET -> target(c, out);
            case SKIP_VALUE -> skipChar(c);
            case DONE -> { }
        }
    }

    private void target(char c, StringBuilder out) {
        if (unicodeDigits >= 0) {
            int digit = Character.digit(c, 16);
            unicodeValue = unicodeValue * 16 + Math.max(digit, 0);
            if (++unicodeDigits == 4) {
                emit(out, (char) unicodeValue);
                unicodeDigits = -1;
            }
            return;
        }
        if (escape) {
            escape = false;
            switch (c) {
                case 'n' -> emit(out, '\n');
                case 't' -> emit(out, '\t');
                case 'r' -> emit(out, '\r');
                case 'b' -> emit(out, '\b');
                case 'f' -> emit(out, '\f');
                case 'u' -> { unicodeDigits = 0; unicodeValue = 0; }
                default -> emit(out, c); // \" \ \/
            }
            return;
        }
        if (c == '\\') escape = true;
        else if (c == '"') { targetFinished = true; state = State.KEY_OR_END; }
        else emit(out, c);
    }

    /** Skips one value of any type, tracking nesting so a ',' or '}' inside it does not end it early. */
    private void skipChar(char c) {
        if (skipInString) {
            if (escape) escape = false;
            else if (c == '\\') escape = true;
            else if (c == '"') { skipInString = false; if (depth == 0) state = State.KEY_OR_END; }
            return;
        }
        switch (c) {
            case '"' -> skipInString = true;
            case '{', '[' -> depth++;
            case '}', ']' -> {
                if (depth == 0) { state = State.DONE; return; }
                if (--depth == 0) state = State.KEY_OR_END;
            }
            case ',' -> { if (depth == 0) state = State.KEY_OR_END; }
            default -> { }
        }
    }
}
