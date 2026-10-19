/**
 * ==============================================================================
 * PROCTORX PYTHON WASM WORKER (Pyodide 3.11 WebAssembly Sandbox)
 * ==============================================================================
 * Runs inside an isolated Web Worker.
 * - Compiles & executes Python 3.11 code via Pyodide WebAssembly with standard libraries.
 * - Redirects sys.stdin, sys.stdout, sys.stderr and captures full Python tracebacks.
 */

let pyodideInstance = null;
let pyodideLoadingPromise = null;

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    try {
      if (typeof loadPyodide === "undefined") {
        importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");
      }
      const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      });
      pyodideInstance = pyodide;
      return pyodide;
    } catch (err) {
      console.warn("[Python Worker] Pyodide initialization notice:", err);
      throw err;
    } finally {
      pyodideLoadingPromise = null;
    }
  })();

  return pyodideLoadingPromise;
}

self.onmessage = async (e) => {
  const { code, input } = e.data || {};
  const startTime = Date.now();

  try {
    const pyodide = await getPyodide();

    const runnerCode = `
import sys
import io

stdin_content = ${JSON.stringify(input || "")}
sys.stdin = io.StringIO(stdin_content)
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

_error = None
try:
    exec(${JSON.stringify(code || "")})
except Exception as e:
    import traceback
    _error = traceback.format_exc()

_stdout = sys.stdout.getvalue()
_stderr = sys.stderr.getvalue()
if _error:
    _stderr = (_stderr + "\\n" + _error).strip() if _stderr else _error
`;

    pyodide.runPython(runnerCode);

    const stdout = pyodide.globals.get("_stdout") || "";
    const stderr = pyodide.globals.get("_stderr") || "";
    const isSuccess = !stderr || stderr.trim().length === 0;
    const latency = Date.now() - startTime;

    self.postMessage({
      success: isSuccess,
      statusCode: isSuccess ? "200" : "400",
      stdout: stdout,
      output: stdout || stderr,
      error: stderr,
      cpuTime: `${latency}ms`,
      memory: "Pyodide WASM Sandbox",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    const errMsg = String(err?.message || err || "Python Execution Error");
    self.postMessage({
      success: false,
      statusCode: "400",
      stdout: "",
      output: errMsg,
      error: errMsg,
      cpuTime: `${latency}ms`,
      memory: "Pyodide WASM Sandbox",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  }
};
