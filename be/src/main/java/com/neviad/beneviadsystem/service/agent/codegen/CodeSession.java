package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.ToolSchemaLock;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * The tools of ONE code agent that works without gates: it reads the source tree on its own initiative (read, list, search), writes
 * only the files assigned to it, keeps notes for the layers after it in a file of the frontend, and says when it is done.
 * Every call is budgeted (an exhausted budget returns TOOL_BUDGET_EXCEEDED to the model instead of throwing), and the agent
 * cannot write before it has read the files it must read. It cannot finish without at least one note of its own, and finishing
 * adds the session's ledger to the notes file, so the next layer always has the system's account as well as the agent's.
 */
public final class CodeSession {
    /** {@code maxReads} counts read_file, list_files and search together; {@code maxWrites} write_file and edit_file together. */
    public record Limits(int maxReads, int maxWrites, int maxNotes, int maxFileChars, int maxPatchChars) {
        public static Limits defaults() { return new Limits(60, 30, 20, 120_000, 20_000); }
    }

    /** Receives progress of every tool call. Implementations must not throw. */
    public interface Listener {
        default void started(String tool) { }
        default void finished(String tool, boolean success, String message) { }

        /** The model is still generating the arguments of a call to {@code tool}; {@code message} says how far it got. */
        default void progress(String tool, String message) { }
    }

    /** An extra reason to refuse {@code finish}, asked after the built-in checks pass; empty means the agent may finish. Called with the session lock held. */
    @FunctionalInterface
    public interface FinishGate {
        java.util.Optional<String> refuse(CodeSession session);
    }

    /**
     * An extra reason to refuse a write of {@code path} ({@code write_file} or {@code edit_file}), asked after the built-in checks pass;
     * empty means the write may go ahead. Called with the session lock held.
     */
    @FunctionalInterface
    public interface WriteGate {
        java.util.Optional<String> refuse(String path);
    }

    /** Immutable snapshot of what the agent has done. */
    public record State(int reads, int writes, int notes, boolean finished, String summary) { }

    /** For {@code offset} and {@code limit}, 0 means "from the first line" and "to the end". */
    public record ReadInput(String path, int offset, int limit) { }
    /** {@code folder} empty means the whole tree. */
    public record ListInput(String folder) { }
    public record SearchInput(String query, String folder) { }
    public record WriteInput(String path, String content) { }
    public record EditInput(String path, String expectedText, String replacement) { }
    public record NoteInput(String text) { }
    public record FinishInput(String summary) { }
    public record ToolResult(boolean success, String message, String content, List<String> items) {
        static ToolResult ok(String message) { return new ToolResult(true, message, "", List.of()); }
        static ToolResult fail(String message) { return new ToolResult(false, message, "", List.of()); }
    }

    static final int MAX_LISTED = 200;
    static final int MAX_MATCHES = 40;
    static final int MAX_MATCH_CHARS = 160;
    static final int MAX_NOTE_CHARS = 4_000;
    private static final List<String> READABLE = List.of(".ts", ".tsx", ".md", ".json");

    private enum Kind { READ, WRITE, NOTE, OTHER }

    private final CodeStore store;
    private final String layerName;
    private final String notesPath;
    private final Set<String> writable;
    private final Set<String> mustRead;
    private final Limits limits;
    private final Listener listener;
    private final Set<String> read = new LinkedHashSet<>();
    private final Set<String> written = new LinkedHashSet<>();
    private int calls;
    private int reads;
    private int writes;
    private int notes;
    private boolean finished;
    private String summary = "";
    private final List<ToolCallback> extraTools;
    private final FinishGate finishGate;
    private final WriteGate writeGate;
    private final boolean requireNote;
    private final List<ToolCallback> callbacks;

    /**
     * @param layerName name shown in the notes and the ledger
     * @param notesPath {@code _notes/<name>.md}, shared by every layer of a run
     * @param writable  the only files this agent may write
     * @param mustRead  files that must have been read before the first write
     */
    public CodeSession(CodeStore store, String layerName, String notesPath, Set<String> writable, Set<String> mustRead,
                       Limits limits, Listener listener) {
        this(store, layerName, notesPath, writable, mustRead, limits, listener, List.of(), null);
    }

    /**
     * @param extraTools tools added to the seven built-in ones; their calls are not counted by {@code limits}
     * @param finishGate an extra reason to refuse {@code finish} (checked after the built-in conditions), or null for none
     */
    public CodeSession(CodeStore store, String layerName, String notesPath, Set<String> writable, Set<String> mustRead,
                       Limits limits, Listener listener, List<ToolCallback> extraTools, FinishGate finishGate) {
        this(store, layerName, notesPath, writable, mustRead, limits, listener, extraTools, finishGate, true);
    }

    /** @param requireNote whether {@code finish} needs at least one note first */
    public CodeSession(CodeStore store, String layerName, String notesPath, Set<String> writable, Set<String> mustRead,
                       Limits limits, Listener listener, List<ToolCallback> extraTools, FinishGate finishGate, boolean requireNote) {
        this(store, layerName, notesPath, writable, mustRead, limits, listener, extraTools, finishGate, requireNote, null);
    }

    /** @param writeGate an extra reason to refuse a write (checked after the built-in conditions), or null for none */
    public CodeSession(CodeStore store, String layerName, String notesPath, Set<String> writable, Set<String> mustRead,
                       Limits limits, Listener listener, List<ToolCallback> extraTools, FinishGate finishGate, boolean requireNote,
                       WriteGate writeGate) {
        this.store = store;
        this.layerName = layerName;
        this.notesPath = notesPath;
        this.writable = Set.copyOf(writable);
        this.mustRead = Set.copyOf(mustRead);
        this.limits = limits;
        this.listener = listener == null ? new Listener() { } : listener;
        this.extraTools = extraTools == null ? List.of() : List.copyOf(extraTools);
        this.finishGate = finishGate;
        this.writeGate = writeGate;
        this.requireNote = requireNote;
        this.callbacks = List.copyOf(ToolSchemaLock.build(this::buildTools));
    }

    public List<ToolCallback> callbacks() { return callbacks; }

    public Limits limits() { return limits; }

    public synchronized State state() { return new State(reads, writes, notes, finished, summary); }

    /** The files this session has written, in the order they were first written. */
    public synchronized List<String> writtenFiles() { return List.copyOf(written); }

    /** The agent's own account of what it did, short enough to put at the top of a later agent's task. */
    public synchronized String ledger() {
        StringBuilder out = new StringBuilder("## Sổ cái của lớp ").append(layerName).append('\n');
        out.append("- Đã đọc: ").append(read.isEmpty() ? "(chưa)" : String.join(", ", read)).append('\n');
        out.append("- Đã ghi: ").append(written.isEmpty() ? "(chưa)" : String.join(", ", written)).append('\n');
        out.append("- Số ghi chú: ").append(notes).append('\n');
        out.append("- Trạng thái: ").append(finished ? "đã xong" + (summary.isBlank() ? "" : " — " + summary) : "chưa xong").append('\n');
        return out.toString();
    }

    private List<ToolCallback> buildTools() {
        ToolCallback readFile = FunctionToolCallback.builder("read_file", (Function<ReadInput, ToolResult>) input -> {
                    if (input == null) return fail("path is required");
                    return run("read_file", Kind.READ, () -> readFile(input));
                })
                .description("Read a source file of fe/neviadlike_structure (any layer, README.md, the run notes). Input: {path, offset, limit}: offset is the first line (1-based) and limit the number of lines; use 0 and 0 for the whole file. Returns the lines, the total line count and whether it was cut.")
                .inputType(ReadInput.class)
                .build();

        ToolCallback list = FunctionToolCallback.builder("list_files", (Function<ListInput, ToolResult>) input ->
                        run("list_files", Kind.READ, () -> listFiles(input == null ? "" : input.folder())))
                .description("List the files under a folder of fe/neviadlike_structure. Input: {folder}: a relative folder such as \"engines\" or \"shared\", or \"\" for the whole tree. Look here first to learn what exists before you read or write.")
                .inputType(ListInput.class)
                .build();

        ToolCallback search = FunctionToolCallback.builder("search", (Function<SearchInput, ToolResult>) input -> {
                    if (input == null) return fail("query is required");
                    return run("search", Kind.READ, () -> search(input));
                })
                .description("Find a piece of text (case-insensitive) in the readable files. Input: {query, folder}: folder \"\" searches the whole tree. Returns lines as \"path:line: text\"; use it to see how a component or function is used elsewhere.")
                .inputType(SearchInput.class)
                .build();

        ToolCallback write = FunctionToolCallback.builder("write_file", (Function<WriteInput, ToolResult>) input -> {
                    if (input == null) return fail("path and content are required");
                    return run("write_file", Kind.WRITE, () -> writeFile(input.path(), input.content()));
                })
                .description("Create or fully replace one of YOUR files. Input: {path, content: the complete file}. Only the paths assigned to you are accepted, and only after you have read the files you were told to read first.")
                .inputType(WriteInput.class)
                .build();

        ToolCallback edit = FunctionToolCallback.builder("edit_file", (Function<EditInput, ToolResult>) input -> {
                    if (input == null) return fail("path, expectedText and replacement are required");
                    return run("edit_file", Kind.WRITE, () -> editFile(input));
                })
                .description("Replace ONE exact piece of one of YOUR files. Input: {path, expectedText: text that appears exactly once, replacement}. Prefer this to write_file for a small change.")
                .inputType(EditInput.class)
                .build();

        ToolCallback note = FunctionToolCallback.builder("append_note", (Function<NoteInput, ToolResult>) input -> {
                    if (input == null) return fail("text is required");
                    return run("append_note", Kind.NOTE, () -> appendNote(input.text()));
                })
                .description("Add a note for the layers that come after you, to the shared notes file of this run. Input: {text}. Note decisions the next layer cannot read from your code: names you chose, which engine value feeds which input of which object, assumptions. It only adds to the end; read the notes file with read_file. At least one note is required before finish.")
                .inputType(NoteInput.class)
                .build();

        ToolCallback finish = FunctionToolCallback.builder("finish", (Function<FinishInput, ToolResult>) input ->
                        run("finish", Kind.OTHER, () -> finish(input == null ? "" : input.summary())))
                .description("Say that your layer is done. Input: {summary}: one or two sentences on what you wrote. Refused while any file assigned to you still does not exist, and until you have written at least one note with append_note. When it succeeds, the system adds its own ledger of what you read and wrote to the notes file.")
                .inputType(FinishInput.class)
                .build();
        List<ToolCallback> all = new ArrayList<>(List.of(readFile, list, search, write, edit, note, finish));
        all.addAll(extraTools);
        return all;
    }

    /** Counts the call against its budget, runs it, and reports the outcome to the listener. */
    private ToolResult run(String tool, Kind kind, java.util.function.Supplier<ToolResult> action) {
        try { listener.started(tool); } catch (RuntimeException ignored) { /* a listener must never break a run */ }
        ToolResult result;
        synchronized (this) {
            String denied = budget(kind);
            if (denied != null) result = ToolResult.fail(denied);
            else {
                calls++;
                try {
                    result = action.get();
                } catch (IllegalArgumentException | IllegalStateException exception) {
                    result = ToolResult.fail(exception.getMessage());
                }
            }
        }
        try { listener.finished(tool, result.success(), result.message()); } catch (RuntimeException ignored) { /* ignore */ }
        return result;
    }

    private String budget(Kind kind) {
        return switch (kind) {
            case READ -> reads >= limits.maxReads() ? "TOOL_BUDGET_EXCEEDED: đã dùng hết " + limits.maxReads() + " lần đọc, tìm và liệt kê" : null;
            case WRITE -> writes >= limits.maxWrites() ? "TOOL_BUDGET_EXCEEDED: đã dùng hết " + limits.maxWrites() + " lần ghi" : null;
            case NOTE -> notes >= limits.maxNotes() ? "TOOL_BUDGET_EXCEEDED: đã dùng hết " + limits.maxNotes() + " ghi chú" : null;
            case OTHER -> null;
        };
    }

    private static ToolResult fail(String message) { return ToolResult.fail(message); }

    private ToolResult readFile(ReadInput input) {
        String path = normalize(input.path());
        reads++;
        String text = store.read(path).orElse(null);
        if (text == null) return ToolResult.fail("FILE_NOT_FOUND: chưa có file " + path);
        read.add(path);
        List<String> lines = text.lines().toList();
        int total = lines.size();
        int from = Math.max(1, input.offset());
        if (from > total && total > 0) return ToolResult.fail("OFFSET_OUT_OF_RANGE: file chỉ có " + total + " dòng");
        int to = input.limit() > 0 ? Math.min(total, from + input.limit() - 1) : total;
        String content = String.join("\n", lines.subList(Math.min(from - 1, total), Math.min(to, total)));
        boolean cut = false;
        if (content.length() > limits.maxFileChars()) {
            content = content.substring(0, limits.maxFileChars());
            cut = true;
        }
        if (cut || to < total) cut = true;
        return new ToolResult(true, "Dòng " + from + " đến " + to + " trên tổng " + total + " dòng" + (cut ? " (còn nữa: đọc tiếp bằng offset)" : ""), content, List.of());
    }

    private ToolResult listFiles(String folder) {
        reads++;
        List<String> files = store.list(folder == null ? "" : folder.replace('\\', '/')).stream().filter(CodeSession::readable).toList();
        boolean cut = files.size() > MAX_LISTED;
        List<String> shown = cut ? files.subList(0, MAX_LISTED) : files;
        return new ToolResult(true, shown.size() + " file" + (cut ? " (đã cắt ở " + MAX_LISTED + ", hãy chỉ rõ thư mục con)" : ""), "", List.copyOf(shown));
    }

    private ToolResult search(SearchInput input) {
        String query = input.query() == null ? "" : input.query().strip();
        if (query.isEmpty()) return ToolResult.fail("query is required");
        reads++;
        List<String> matches = new ArrayList<>(store.search(query, input.folder() == null ? "" : input.folder().replace('\\', '/'), MAX_MATCHES, MAX_MATCH_CHARS));
        // A store marks a cut result with a last element that is not a match.
        boolean cut = !matches.isEmpty() && CodeStore.SearchRules.CUT_MARK.equals(matches.get(matches.size() - 1));
        if (cut) matches.remove(matches.size() - 1);
        return new ToolResult(true, matches.size() + " kết quả" + (cut ? " (đã cắt ở " + MAX_MATCHES + ", hãy thu hẹp từ khoá hoặc thư mục)" : ""), "", List.copyOf(matches));
    }

    private ToolResult writeFile(String path, String content) {
        String denied = denyWrite(path);
        if (denied != null) return ToolResult.fail(denied);
        if (content == null || content.isBlank()) return ToolResult.fail("content is required");
        if (content.length() > limits.maxFileChars()) return ToolResult.fail("FILE_TOO_LARGE: tối đa " + limits.maxFileChars() + " ký tự");
        String normalized = normalize(path);
        store.write(normalized, content);
        writes++;
        written.add(normalized);
        return ToolResult.ok("Đã ghi " + normalized + " (" + content.length() + " ký tự).");
    }

    private ToolResult editFile(EditInput input) {
        String denied = denyWrite(input.path());
        if (denied != null) return ToolResult.fail(denied);
        if (input.expectedText() == null || input.expectedText().isEmpty() || input.replacement() == null) {
            return ToolResult.fail("expectedText and replacement are required");
        }
        if (input.expectedText().length() + input.replacement().length() > limits.maxPatchChars()) {
            return ToolResult.fail("PATCH_TOO_LARGE: sửa tối đa " + limits.maxPatchChars() + " ký tự, hãy dùng write_file cho thay đổi lớn");
        }
        String path = normalize(input.path());
        String current = store.read(path).orElse(null);
        if (current == null) return ToolResult.fail("FILE_NOT_FOUND: chưa có file " + path);
        int first = current.indexOf(input.expectedText());
        if (first < 0) return ToolResult.fail("EXPECTED_TEXT_NOT_FOUND: đoạn expectedText không có trong file (hãy read_file để lấy đúng nguyên văn)");
        if (current.indexOf(input.expectedText(), first + 1) >= 0) return ToolResult.fail("EXPECTED_TEXT_NOT_UNIQUE: đoạn expectedText xuất hiện nhiều lần, hãy kèm thêm ngữ cảnh");
        String next = current.substring(0, first) + input.replacement() + current.substring(first + input.expectedText().length());
        if (next.length() > limits.maxFileChars()) return ToolResult.fail("FILE_TOO_LARGE: tối đa " + limits.maxFileChars() + " ký tự");
        store.write(path, next);
        writes++;
        written.add(path);
        return ToolResult.ok("Đã sửa " + path + ".");
    }

    private ToolResult appendNote(String text) {
        if (text == null || text.isBlank()) return ToolResult.fail("text is required");
        if (text.length() > MAX_NOTE_CHARS) return ToolResult.fail("NOTE_TOO_LARGE: mỗi ghi chú tối đa " + MAX_NOTE_CHARS + " ký tự");
        store.appendNote(notesPath, "\n## Lớp " + layerName + "\n" + text.strip());
        notes++;
        return ToolResult.ok("Đã thêm ghi chú vào " + notesPath + ".");
    }

    private ToolResult finish(String text) {
        if (finished) return ToolResult.ok("Lớp " + layerName + " đã xong từ trước.");
        if (written.isEmpty()) return ToolResult.fail("NOT_DONE: bạn chưa ghi file nào.");
        List<String> missing = new ArrayList<>();
        for (String path : new LinkedHashSet<>(writable)) if (!store.exists(path)) missing.add(path);
        if (!missing.isEmpty()) return ToolResult.fail("NOT_DONE: còn thiếu file được giao: " + String.join(", ", missing));
        if (requireNote && notes == 0) {
            return ToolResult.fail("NOTE_REQUIRED: hãy gọi append_note ít nhất một lần để ghi các quyết định mà lớp sau không đọc được từ code "
                    + "(tên bạn đã đặt, giá trị nào nối với đầu vào nào của vật), rồi gọi lại finish.");
        }
        if (finishGate != null) {
            java.util.Optional<String> refused = finishGate.refuse(this);
            if (refused.isPresent()) return ToolResult.fail("NOT_DONE: " + refused.get());
        }
        finished = true;
        summary = text == null ? "" : text.strip();
        // The ledger is the system's own account, so a later layer has it even if the agent's notes are thin. It does not use up the note budget.
        try {
            store.appendNote(notesPath, "\n" + ledger());
        } catch (IllegalArgumentException | IllegalStateException failure) {
            finished = false;
            summary = "";
            return ToolResult.fail("NOT_DONE: không ghi được sổ cái vào ghi chú: " + failure.getMessage());
        }
        return ToolResult.ok("Đã ghi nhận lớp " + layerName + " xong; sổ cái đã được thêm vào " + notesPath + ".");
    }

    /** Null when the write is allowed, otherwise the reason. Called with the session lock held. */
    private String denyWrite(String path) {
        try {
            store.checkPath(path, true);
        } catch (IllegalArgumentException exception) {
            return exception.getMessage();
        }
        String normalized = normalize(path);
        if (!writable.contains(normalized)) return "PATH_NOT_ALLOWED: lớp " + layerName + " chỉ được ghi " + String.join(", ", writable);
        List<String> unread = mustRead.stream().filter(p -> !read.contains(p)).sorted().toList();
        if (!unread.isEmpty()) return "MUST_READ_FIRST: hãy read_file các file sau trước khi ghi: " + String.join(", ", unread);
        return writeGate == null ? null : writeGate.refuse(normalized).orElse(null);
    }

    private static String normalize(String path) { return path == null ? "" : path.replace('\\', '/'); }

    private static boolean readable(String path) { return READABLE.stream().anyMatch(path::endsWith); }
}
