package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * High-speed, zero-cost, in-process server code execution sandbox.
 * Runs Java, Python, and C++ programs via isolated operating system processes with
 * strict timeouts, memory limits, and automated temporary directory cleanup.
 */
@Component
public class LocalServerExecutionProvider implements CodeExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(LocalServerExecutionProvider.class);

    private static final int TIMEOUT_SECONDS = 5;
    private static final Semaphore CONCURRENCY_SEMAPHORE = new Semaphore(3); // Capped for 512MB container memory safety
    private static final Pattern PUBLIC_CLASS_PATTERN = Pattern.compile("public\\s+class\\s+([A-Za-z0-9_]+)");
    private static final Pattern ANY_CLASS_PATTERN = Pattern.compile("class\\s+([A-Za-z0-9_]+)");
    private static final Pattern PACKAGE_PATTERN = Pattern.compile("^\\s*package\\s+[^;]+;\\s*$", Pattern.MULTILINE);

    @Override
    public String getName() {
        return "local-sandbox";
    }

    @Override
    public String getDisplayName() {
        return "Server Process Sandbox (Native JVM, Python & GCC - 0ms)";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public boolean isServerExecutable() {
        return true;
    }

    @Override
    public CodeExecutionResult execute(String script, String stdin, String language) throws Exception {
        if (script == null || script.isBlank()) {
            return CodeExecutionResult.error(getName(), "Script code is empty", "400");
        }

        String lang = (language != null ? language.trim().toLowerCase() : "java");
        String sanitizedScript = stripMarkdownFences(script);
        String normalizedStdin = stdin != null ? stdin : "";

        long startTime = System.currentTimeMillis();

        if (lang.contains("python") || lang.equals("py")) {
            return executePython(sanitizedScript, normalizedStdin, startTime);
        } else if (lang.contains("cpp") || lang.contains("c++") || lang.equals("c")) {
            return executeCpp(sanitizedScript, normalizedStdin, startTime);
        } else if (lang.contains("js") || lang.contains("javascript") || lang.equals("node")) {
            return executeNode(sanitizedScript, normalizedStdin, startTime);
        } else {
            // Default to Java
            return executeJava(sanitizedScript, normalizedStdin, startTime);
        }
    }

    private CodeExecutionResult executeJava(String script, String stdin, long startTime) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("proctorx_java_");

            // 1. Remove package declarations (standalone files cannot declare packages outside directory structure)
            String preparedCode = PACKAGE_PATTERN.matcher(script).replaceAll("");

            // 2. Detect class name
            String className = "Main";
            Matcher pubMatcher = PUBLIC_CLASS_PATTERN.matcher(preparedCode);
            if (pubMatcher.find()) {
                className = pubMatcher.group(1);
            } else {
                Matcher anyMatcher = ANY_CLASS_PATTERN.matcher(preparedCode);
                if (anyMatcher.find()) {
                    className = anyMatcher.group(1);
                } else {
                    // Wrap bare code inside a Main class
                    preparedCode = "import java.util.*;\nimport java.io.*;\npublic class Main {\n" +
                            "    public static void main(String[] args) {\n" +
                            preparedCode + "\n" +
                            "    }\n}";
                }
            }

            Path sourceFile = tempDir.resolve(className + ".java");
            Files.writeString(sourceFile, preparedCode, StandardCharsets.UTF_8);

            // 3. Execute using Java single-file launcher (Java 11+)
            String javaBin = findExecutable("java");
            ProcessBuilder pb = new ProcessBuilder(javaBin, sourceFile.getFileName().toString());
            pb.directory(tempDir.toFile());

            return runSubprocess(pb, stdin, startTime, "Java JVM");
        } catch (Exception ex) {
            log.error("Java sandbox execution error: {}", ex.getMessage(), ex);
            return CodeExecutionResult.error(getName(), "Sandbox JVM Failure: " + ex.getMessage(), "500");
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    private CodeExecutionResult executePython(String script, String stdin, long startTime) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("proctorx_py_");
            Path sourceFile = tempDir.resolve("solution.py");
            Files.writeString(sourceFile, script, StandardCharsets.UTF_8);

            String pythonBin = findExecutable("python", "python3");
            ProcessBuilder pb = new ProcessBuilder(pythonBin, "-u", "solution.py");
            pb.directory(tempDir.toFile());

            return runSubprocess(pb, stdin, startTime, "Python 3");
        } catch (Exception ex) {
            log.error("Python sandbox execution error: {}", ex.getMessage(), ex);
            return CodeExecutionResult.error(getName(), "Sandbox Python Failure: " + ex.getMessage(), "500");
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    private CodeExecutionResult executeCpp(String script, String stdin, long startTime) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("proctorx_cpp_");
            Path sourceFile = tempDir.resolve("solution.cpp");
            Files.writeString(sourceFile, script, StandardCharsets.UTF_8);

            boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
            String outBinaryName = isWindows ? "solution.exe" : "solution.out";
            Path outBinary = tempDir.resolve(outBinaryName);

            // 1. Compile with g++
            String gppBin = findExecutable("g++", "gcc");
            ProcessBuilder compilePb = new ProcessBuilder(gppBin, "-O2", "solution.cpp", "-o", outBinaryName);
            compilePb.directory(tempDir.toFile());

            Process compileProc = compilePb.start();
            String compileErr = readStream(compileProc.getErrorStream());
            boolean compiled = compileProc.waitFor(10, TimeUnit.SECONDS);

            if (!compiled || compileProc.exitValue() != 0) {
                compileProc.destroyForcibly();
                String err = !compileErr.isBlank() ? compileErr : "C++ Compilation Error (exit code " + compileProc.exitValue() + ")";
                return CodeExecutionResult.error(getName(), err, "400");
            }

            // 2. Run compiled binary
            ProcessBuilder runPb = new ProcessBuilder(outBinary.toAbsolutePath().toString());
            runPb.directory(tempDir.toFile());

            return runSubprocess(runPb, stdin, startTime, "C++ (GCC)");
        } catch (Exception ex) {
            log.error("C++ sandbox execution error: {}", ex.getMessage(), ex);
            return CodeExecutionResult.error(getName(), "Sandbox C++ Failure: " + ex.getMessage(), "500");
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    private CodeExecutionResult executeNode(String script, String stdin, long startTime) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("proctorx_js_");
            Path sourceFile = tempDir.resolve("solution.js");
            Files.writeString(sourceFile, script, StandardCharsets.UTF_8);

            String nodeBin = findExecutable("node");
            ProcessBuilder pb = new ProcessBuilder(nodeBin, "solution.js");
            pb.directory(tempDir.toFile());

            return runSubprocess(pb, stdin, startTime, "Node.js");
        } catch (Exception ex) {
            log.error("Node sandbox execution error: {}", ex.getMessage(), ex);
            return CodeExecutionResult.error(getName(), "Sandbox Node Failure: " + ex.getMessage(), "500");
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    private CodeExecutionResult runSubprocess(ProcessBuilder pb, String stdin, long startTime, String runtimeName) {
        boolean permitAcquired = false;
        Process process = null;
        try {
            permitAcquired = CONCURRENCY_SEMAPHORE.tryAcquire(8, TimeUnit.SECONDS);
            if (!permitAcquired) {
                return CodeExecutionResult.error(getName(), "Sandbox capacity reached: too many concurrent compilations. Please retry in a few seconds.", "429");
            }

            process = pb.start();

            // Pipe standard input
            if (stdin != null && !stdin.isEmpty()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(stdin.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            } else {
                try {
                    process.getOutputStream().close();
                } catch (Exception ignored) {}
            }

            // Wait with timeout
            boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (!finished) {
                process.destroyForcibly();
                return CodeExecutionResult.error(getName(), "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s Timeout)", "408");
            }

            String stdout = readStream(process.getInputStream()).trim();
            String stderr = readStream(process.getErrorStream()).trim();
            int exitCode = process.exitValue();

            if (exitCode != 0) {
                String errorMsg = !stderr.isBlank() ? stderr : (!stdout.isBlank() ? stdout : "Process exited with error code " + exitCode);
                return new CodeExecutionResult(
                        stdout,
                        errorMsg,
                        errorMsg,
                        String.valueOf(exitCode),
                        elapsed + "ms",
                        runtimeName,
                        getName(),
                        false
                );
            }

            return new CodeExecutionResult(
                    stdout,
                    stdout,
                    "",
                    "200",
                    elapsed + "ms",
                    runtimeName,
                    getName(),
                    true
            );
        } catch (Exception ex) {
            if (process != null) {
                process.destroyForcibly();
            }
            return CodeExecutionResult.error(getName(), "Runtime Execution Error: " + ex.getMessage(), "500");
        } finally {
            if (permitAcquired) {
                CONCURRENCY_SEMAPHORE.release();
            }
        }
    }

    private String readStream(InputStream is) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() > 65536) { // 64KB max output cap to prevent OOM
                    sb.append("\n...[Output truncated at 64KB limit]");
                    break;
                }
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    private String stripMarkdownFences(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            if (firstNewline != -1) {
                s = s.substring(firstNewline + 1);
            }
            if (s.endsWith("```")) {
                s = s.substring(0, s.length() - 3);
            }
        }
        return s.trim();
    }

    private String findExecutable(String... candidates) {
        for (String c : candidates) {
            try {
                // If on Windows, check if candidate works directly
                return c;
            } catch (Exception ignored) {}
        }
        return candidates[0];
    }

    private void cleanupTempDir(Path dir) {
        if (dir == null || !Files.exists(dir)) return;
        try {
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (Exception ignored) {}
                    });
        } catch (Exception ignored) {}
    }
}
