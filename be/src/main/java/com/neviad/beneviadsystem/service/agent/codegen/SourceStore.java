package com.neviad.beneviadsystem.service.agent.codegen;


import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * The source tree of {@code fe/neviadlike_structure}. Every path is relative to that root, plain ASCII, and cannot leave it.
 * Writing is further limited to TypeScript files; reading also allows the README and JSON contracts.
 */
public final class SourceStore implements CodeStore {
    private static final Pattern SAFE_PATH = Pattern.compile("^[A-Za-z0-9_./-]+$");
    private static final List<String> WRITABLE = List.of(".ts", ".tsx");
    private static final List<String> READABLE = List.of(".ts", ".tsx", ".md", ".json");
    /** Folder of the run notes (see {@link #appendNote}). */
    public static final String NOTES_DIR = "_notes/";

    private final Path root;

    public SourceStore(Path root) { this.root = root.toAbsolutePath().normalize(); }

    public Path root() { return root; }

    /**
     * The path with forward slashes, or an IllegalArgumentException when it is unsafe or has an extension that may not be read or
     * written. The same rules apply wherever the tree lives, so the browser store ({@code BridgedCodeStore}) uses this too.
     */
    public static String validatePath(String relative, boolean forWrite) {
        if (relative == null || relative.isBlank()) throw new IllegalArgumentException("path is required");
        String path = relative.replace('\\', '/');
        if (!SAFE_PATH.matcher(path).matches() || path.startsWith("/") || path.contains("..") || path.contains("//")) {
            throw new IllegalArgumentException("đường dẫn không hợp lệ: " + relative);
        }
        List<String> allowed = forWrite ? WRITABLE : READABLE;
        if (allowed.stream().noneMatch(path::endsWith)) {
            throw new IllegalArgumentException("đuôi file không được phép " + (forWrite ? "ghi" : "đọc") + ": " + relative);
        }
        return path;
    }

    /** The note path with forward slashes: only {@code _notes/<name>.md}, nothing deeper. */
    public static String validateNotePath(String relative) {
        String path = relative == null ? "" : relative.replace('\\', '/');
        if (!path.startsWith(NOTES_DIR) || !path.endsWith(".md") || path.indexOf('/', NOTES_DIR.length()) >= 0) {
            throw new IllegalArgumentException("ghi chú chỉ được nằm ở " + NOTES_DIR + "<tên>.md: " + relative);
        }
        return validatePath(path, false);
    }

    @Override
    public void checkPath(String path, boolean forWrite) { validatePath(path, forWrite); }

    /** The absolute path of a relative one, or an IllegalArgumentException when it is unsafe. */
    public Path resolve(String relative, boolean forWrite) {
        String path = validatePath(relative, forWrite);
        Path resolved = root.resolve(path).normalize();
        if (!resolved.startsWith(root)) throw new IllegalArgumentException("đường dẫn ra ngoài thư mục gốc: " + relative);
        return resolved;
    }

    public boolean exists(String relative) { return Files.isRegularFile(resolve(relative, false)); }

    public Optional<String> read(String relative) {
        Path file = resolve(relative, false);
        try {
            return Files.isRegularFile(file) ? Optional.of(Files.readString(file, StandardCharsets.UTF_8).replace("\r\n", "\n")) : Optional.empty();
        } catch (IOException exception) {
            throw new IllegalStateException("Không đọc được " + relative + ": " + exception.getMessage(), exception);
        }
    }

    public void write(String relative, String content) {
        Path file = resolve(relative, true);
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, content.endsWith("\n") ? content : content + "\n", StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Không ghi được " + relative + ": " + exception.getMessage(), exception);
        }
    }

    /**
     * Appends to a run note, {@code _notes/<name>.md}: the only place besides TypeScript files that an agent may write, and it can only
     * add to the end, so a later layer can never erase what an earlier one noted.
     */
    public void appendNote(String relative, String text) {
        String path = validateNotePath(relative);
        if (text == null || text.isBlank()) throw new IllegalArgumentException("nội dung ghi chú trống");
        Path file = resolve(path, false); // same checks as any path: safe characters, inside the root
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, text.endsWith("\n") ? text : text + "\n", StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException exception) {
            throw new IllegalStateException("Không ghi được " + relative + ": " + exception.getMessage(), exception);
        }
    }

    /** Relative paths of every file under a subfolder (or the whole tree), sorted. */
    public List<String> list(String subfolder) {
        Path start = subfolder == null || subfolder.isBlank() ? root : root.resolve(subfolder).normalize();
        if (!start.startsWith(root) || !Files.isDirectory(start)) return List.of();
        try (Stream<Path> walk = Files.walk(start)) {
            List<String> files = new ArrayList<>();
            walk.filter(Files::isRegularFile).forEach(p -> files.add(root.relativize(p).toString().replace('\\', '/')));
            files.sort(String::compareTo);
            return files;
        } catch (IOException exception) {
            throw new IllegalStateException("Không liệt kê được " + start + ": " + exception.getMessage(), exception);
        }
    }
}
