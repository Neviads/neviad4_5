package com.neviad.beneviadsystem.service.agent.codegen;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Where the files of {@code neviadlike_structure} live while an agent works on them: on disk ({@code SourceStore}) or in the
 * browser ({@link BridgedCodeStore}). Paths are relative to the root of the tree; an implementation refuses unsafe ones with
 * an {@link IllegalArgumentException} and reports any other trouble with an {@link IllegalStateException}.
 */
public interface CodeStore {
    /** The content, or empty when the file does not exist. */
    Optional<String> read(String path);

    void write(String path, String content);

    boolean exists(String path);

    /** Relative paths of every file under a folder ({@code ""} is the whole tree), sorted. */
    List<String> list(String folder);

    /** Appends to a run note ({@code _notes/<name>.md}); it can only add to the end. */
    void appendNote(String path, String text);

    /** Throws {@link IllegalArgumentException} when the path is not allowed to be read or written. */
    void checkPath(String path, boolean forWrite);

    /**
     * Case-insensitive search over the readable files, as {@code path:line: text} lines, at most {@code max} of them plus one
     * extra line when there were more (so the caller knows the result was cut). Override it when one call is cheaper than a read per file.
     */
    default List<String> search(String query, String folder, int max, int maxLineChars) {
        String needle = query.toLowerCase();
        List<String> matches = new ArrayList<>();
        for (String file : list(folder)) {
            if (!SearchRules.readable(file)) continue;
            int number = 0;
            for (String line : read(file).orElse("").lines().toList()) {
                number++;
                if (!line.toLowerCase().contains(needle)) continue;
                if (matches.size() >= max) { matches.add(SearchRules.CUT_MARK); return matches; }
                String shown = line.strip();
                matches.add(file + ":" + number + ": " + (shown.length() > maxLineChars ? shown.substring(0, maxLineChars) + "…" : shown));
            }
        }
        return matches;
    }

    /** Which files a search or listing looks at; shared by the stores. */
    final class SearchRules {
        /** The last element of a search result that was cut. */
        public static final String CUT_MARK = "…";
        private static final List<String> READABLE = List.of(".ts", ".tsx", ".md", ".json");

        private SearchRules() { }

        public static boolean readable(String path) { return READABLE.stream().anyMatch(path::endsWith); }
    }
}
