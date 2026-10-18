package com.neviad.beneviadsystem.service.agent.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Runs one script of {@code fe/scripts}: JSON in on stdin, the LAST JSON line of stdout out. Any failure is an exception, never a result. */
final class NodeScriptRunner {
    private static final int MAX_OUTPUT_BYTES = 2_000_000;

    static final class ScriptFailure extends Exception {
        ScriptFailure(String message) { super(message); }
    }

    private final Path feRoot;
    private final String nodeCommand;
    private final Duration timeout;
    private final ObjectMapper mapper;

    NodeScriptRunner(Path feRoot, String nodeCommand, Duration timeout, ObjectMapper mapper) {
        this.feRoot = feRoot.toAbsolutePath().normalize();
        this.nodeCommand = nodeCommand;
        this.timeout = timeout;
        this.mapper = mapper;
    }

    /** The configured frontend root: the setting when given, else {@code fe} or {@code ../fe} relative to the working directory. */
    static Path resolveFeRoot(String setting) {
        if (setting != null && !setting.isBlank()) return Path.of(setting);
        for (String candidate : List.of("fe", "../fe")) {
            if (Files.isDirectory(Path.of(candidate, "neviadlike_structure"))) return Path.of(candidate);
        }
        return Path.of("fe");
    }

    JsonNode run(String scriptName, JsonNode input) throws ScriptFailure {
        Path script = feRoot.resolve("scripts").resolve(scriptName);
        if (!Files.isRegularFile(script)) throw new ScriptFailure("Không thấy script kiểm tra " + script);
        Process process = null;
        try {
            process = new ProcessBuilder(nodeCommand, script.toString()).directory(feRoot.toFile())
                    .redirectError(ProcessBuilder.Redirect.DISCARD).start();
            final Process started = process;
            var reader = new FutureTask<>(() -> started.getInputStream().readNBytes(MAX_OUTPUT_BYTES));
            Thread readerThread = new Thread(reader, "node-script-reader");
            readerThread.setDaemon(true);
            readerThread.start();
            try (var stdin = process.getOutputStream()) { stdin.write(mapper.writeValueAsBytes(input)); }
            byte[] stdout;
            try {
                stdout = reader.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
            } catch (TimeoutException exception) {
                throw new ScriptFailure("Kiểm tra chạy quá " + timeout.toSeconds() + " giây.");
            } catch (ExecutionException exception) {
                throw new ScriptFailure("Không đọc được kết quả kiểm tra: " + exception.getCause());
            }
            String line = null;
            for (String candidate : new String(stdout, StandardCharsets.UTF_8).split("\\R")) if (candidate.trim().startsWith("{")) line = candidate.trim();
            if (line == null) throw new ScriptFailure("Script kiểm tra không in kết quả.");
            return mapper.readTree(line);
        } catch (IOException exception) {
            throw new ScriptFailure("Không chạy được Node (" + nodeCommand + "): " + exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ScriptFailure("Kiểm tra bị ngắt.");
        } finally {
            if (process != null && process.isAlive()) process.destroyForcibly();
        }
    }
}
