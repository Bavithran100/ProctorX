import Client from "../../../shared/api/Client";
import { fetchWithLocalCache, precacheWasmChunks } from "./wasmCacheService";

// ==============================================================================
// 1. PYTHON 3.11 WEB ASSEMBLY RUNTIME (Pyodide)
// ==============================================================================
let pyodideInstance = null;
let pyodideLoadingPromise = null;

export async function warmupWasmRuntimes(onProgress = () => {}) {
  await precacheWasmChunks(onProgress);
  try {
    getPyodide().catch(() => {});
    getJSCPP().catch(() => {});
    getCheerpJ().catch(() => {});
  } catch {}
  return true;
}

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.loadPyodide) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise((res, rej) => {
          script.onload = res;
          script.onerror = rej;
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      });

      pyodideInstance = pyodide;
      resolve(pyodide);
    } catch (err) {
      console.warn("Unable to initialize local Pyodide WASM:", err);
      reject(err);
    } finally {
      pyodideLoadingPromise = null;
    }
  });

  return pyodideLoadingPromise;
}

export async function runPythonTranspiler(script, stdin, timeoutMs = 3000) {
  const startTime = Date.now();
  let output = "";
  const MAX_OUTPUT = 50000;

  const rawStdin = String(stdin || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = rawStdin.split("\n");
  const allTokens = rawStdin.trim().split(/\s+/).filter(Boolean);
  let tokenIdx = 0;
  let lineIdx = 0;

  const input = () => {
    if (lineIdx < lines.length && lines[lineIdx] !== undefined) {
      return lines[lineIdx++];
    }
    if (tokenIdx < allTokens.length) {
      return allTokens[tokenIdx++];
    }
    return "";
  };

  const print = (...args) => {
    const formatted = args
      .map((a) => (typeof a === "object" && a !== null ? (Array.isArray(a) ? `[${a.join(", ")}]` : JSON.stringify(a)) : String(a)))
      .join(" ");
    if (output.length > MAX_OUTPUT) {
      throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
    }
    output += formatted + "\n";
  };

  const range = (start, stop, step) => {
    if (stop === undefined) {
      stop = start;
      start = 0;
    }
    step = step === undefined ? 1 : step;
    const res = [];
    if (step > 0) {
      for (let i = start; i < stop; i += step) res.push(i);
    } else if (step < 0) {
      for (let i = start; i > stop; i += step) res.push(i);
    }
    return res;
  };

  const len = (x) => {
    if (x === null || x === undefined) return 0;
    if (typeof x === "string" || Array.isArray(x)) return x.length;
    if (typeof x === "object") return Object.keys(x).length;
    return 0;
  };

  const int = (x) => {
    const n = parseInt(x, 10);
    return isNaN(n) ? 0 : n;
  };

  const float = (x) => {
    const n = parseFloat(x);
    return isNaN(n) ? 0.0 : n;
  };

  const str = (x) => String(x);
  const list = (x) => (Array.isArray(x) ? [...x] : Array.from(x || []));
  const set = (x) => new Set(x || []);
  const sum = (arr) => (Array.isArray(arr) ? arr.reduce((acc, v) => acc + Number(v), 0) : 0);
  const min = (...args) => {
    if (args.length === 1 && Array.isArray(args[0])) return Math.min(...args[0]);
    return Math.min(...args);
  };
  const max = (...args) => {
    if (args.length === 1 && Array.isArray(args[0])) return Math.max(...args[0]);
    return Math.max(...args);
  };
  const abs = (x) => Math.abs(x);
  const sorted = (arr, reverse = false) => {
    const copy = [...(arr || [])];
    copy.sort((a, b) => (reverse ? b - a : a - b));
    return copy;
  };
  const enumerate = (arr) => {
    if (!arr) return [];
    const items = Array.isArray(arr) ? arr : Object.values(arr);
    return items.map((val, idx) => [idx, val]);
  };
  const zip = (...arrs) => {
    if (arrs.length === 0) return [];
    const minLen = Math.min(...arrs.map((a) => (a ? a.length : 0)));
    const res = [];
    for (let i = 0; i < minLen; i++) {
      res.push(arrs.map((a) => a[i]));
    }
    return res;
  };

  const math = {
    pi: Math.PI,
    e: Math.E,
    sqrt: Math.sqrt,
    floor: Math.floor,
    ceil: Math.ceil,
    pow: Math.pow,
    abs: Math.abs,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    gcd: (a, b) => {
      a = Math.abs(a);
      b = Math.abs(b);
      while (b) {
        let t = b;
        b = a % b;
        a = t;
      }
      return a;
    }
  };

  const sys = {
    stdin: {
      read: () => rawStdin,
      readline: () => input()
    }
  };

  try {
    let rawLines = (script || "").split(/\r?\n/);
    let jsLines = [];
    let indentStack = [0];

    for (let rawLine of rawLines) {
      let line = rawLine.replace(/#.*$/, "");
      if (!line.trim()) continue;

      let indent = rawLine.match(/^(\s*)/)[0].length;
      let trimmed = line.trim();

      while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        jsLines.push("}");
      }

      let isBlock = trimmed.endsWith(":");
      if (isBlock) {
        trimmed = trimmed.slice(0, -1).trim();
      }

      // Handle List comprehensions: [expr for x in iterable]
      trimmed = trimmed.replace(/\[\s*([^\]]+?)\s+for\s+([A-Za-z0-9_,\s]+)\s+in\s+([^\]]+?)\s*\]/g, (m, expr, v, iter) => {
        return `(${iter}).map((${v.trim()}) => ${expr.trim()})`;
      });

      let transformed = trimmed;

      if (/^def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/.test(transformed)) {
        transformed = transformed.replace(/^def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/, "function $1($2)");
      } else if (/^elif\b/.test(transformed)) {
        transformed = transformed.replace(/^elif\s+(.*)/, "else if ($1)");
      } else if (/^(if|while)\s+(.*)/.test(transformed)) {
        transformed = transformed.replace(/^(if|while)\s+(.*)/, "$1 ($2)");
      } else if (/^for\s+\[?([A-Za-z0-9_,\s]+)\]?\s+in\s+range\((.*)\)/.test(transformed)) {
        transformed = transformed.replace(/^for\s+\[?([A-Za-z0-9_,\s]+)\]?\s+in\s+range\((.*)\)/, "for (let $1 of range($2))");
      } else if (/^for\s+([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s+in\s+enumerate\((.*)\)/.test(transformed)) {
        transformed = transformed.replace(/^for\s+([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s+in\s+enumerate\((.*)\)/, "for (let [$1, $2] of enumerate($3))");
      } else if (/^for\s+([A-Za-z0-9_,\s]+)\s+in\s+(.*)/.test(transformed)) {
        transformed = transformed.replace(/^for\s+([A-Za-z0-9_,\s]+)\s+in\s+(.*)/, "for (let $1 of $2)");
      } else if (/^(import|from)\b/.test(transformed)) {
        transformed = "// " + transformed;
      } else if (/^[A-Za-z0-9_]+\s*=/.test(transformed) && !transformed.startsWith("let ") && !transformed.startsWith("const ") && !transformed.startsWith("var ")) {
        transformed = "let " + transformed;
      }

      transformed = transformed
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\s+/g, "!")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bNone\b/g, "null")
        .replace(/\.append\s*\(/g, ".push(");

      if (isBlock) {
        indentStack.push(indent + 1);
        jsLines.push(transformed + " {");
      } else {
        jsLines.push(transformed + (transformed.endsWith(";") || transformed.startsWith("//") ? "" : ";"));
      }
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      jsLines.push("}");
    }

    let jsCode = jsLines.join("\n");

    // Loop Guards
    let counter = 0;
    jsCode = jsCode
      .replace(/\bwhile\s*\(([^)]*)\)\s*\{/g, (match, cond) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nwhile (${cond}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      })
      .replace(/\bfor\s*\(([^;]*;[^;]*;[^)]*)\)\s*\{/g, (match, header) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nfor (${header}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      })
      .replace(/\bfor\s*\(\s*let\s+([^)]*)\)\s*\{/g, (match, header) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nfor (let ${header}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      });

    const runner = new Function(
      "input", "print", "range", "len", "int", "float", "str", "list", "set", "sum", "min", "max", "abs", "sorted", "enumerate", "zip", "math", "sys",
      `
      ${jsCode}
    `
    );

    runner(input, print, range, len, int, float, str, list, set, sum, min, max, abs, sorted, enumerate, zip, math, sys);
    const latency = Date.now() - startTime;

    return {
      stdout: output,
      output: output,
      error: "",
      statusCode: "200",
      cpuTime: `${latency}ms`,
      memory: "Local JS Sandbox",
      providerUsed: "transpiler-local",
      executionType: "TRANSPILER-LOCAL-JS",
      success: true
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    let errMsg = String(err?.message || err || "Python Execution Error");
    if (errMsg.includes("Maximum call stack size exceeded")) {
      errMsg = "Runtime Error: RecursionError (maximum recursion depth exceeded)";
    }
    return {
      stdout: output,
      output: output ? (output.slice(0, 300) + "\n... [Output Truncated]\n" + errMsg) : errMsg,
      error: errMsg,
      statusCode: "400",
      cpuTime: `${latency}ms`,
      memory: "Local JS Sandbox",
      providerUsed: "transpiler-local",
      executionType: "TRANSPILER-LOCAL-JS",
      success: false
    };
  }
}

export async function runPythonWasm(script, stdin, timeoutMs = 3000) {
  return executeWasmWorker("python", script, stdin, timeoutMs);
}

// ==============================================================================
// 1.5 STRICT SYNTAX & SEMICOLON VALIDATORS FOR COMPILED LANGUAGES
// ==============================================================================
export function validateJavaSyntax(script) {
  if (!script || !script.trim()) {
    return { valid: false, error: "Main.java:1: error: file is empty" };
  }

  const rawLines = script.split(/\r?\n/);
  let braceCount = 0;
  let parenCount = 0;
  let inBlockComment = false;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNum = i + 1;
    let line = rawLines[i];

    // Handle block comments
    let lineWithoutComments = line;
    if (inBlockComment) {
      if (lineWithoutComments.includes("*/")) {
        lineWithoutComments = lineWithoutComments.substring(lineWithoutComments.indexOf("*/") + 2);
        inBlockComment = false;
      } else {
        continue;
      }
    }

    if (lineWithoutComments.includes("/*")) {
      if (!lineWithoutComments.includes("*/")) {
        inBlockComment = true;
        lineWithoutComments = lineWithoutComments.substring(0, lineWithoutComments.indexOf("/*"));
      } else {
        lineWithoutComments = lineWithoutComments.replace(/\/\*.*?\*\//g, "");
      }
    }

    // Strip single line comments
    if (lineWithoutComments.includes("//")) {
      lineWithoutComments = lineWithoutComments.substring(0, lineWithoutComments.indexOf("//"));
    }

    const trimmed = lineWithoutComments.trim();
    if (!trimmed) continue;

    // 1. Check double quote literals (unclosed string literal)
    const doubleQuotes = (lineWithoutComments.match(/(?<!\\)"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      return {
        valid: false,
        error: `Main.java:${lineNum}: error: unclosed string literal\n    ${line.trim()}\n    ^\n1 error`
      };
    }

    // 2. Check single-quoted character literals (Java allows ONLY single character or valid escape sequence)
    const tempNoDoubleQuotes = lineWithoutComments.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const singleQuoteMatches = tempNoDoubleQuotes.match(/'([^'\\]|\\.)*'/g);
    if (singleQuoteMatches) {
      for (const m of singleQuoteMatches) {
        const inner = m.slice(1, -1);
        if (inner.length === 0) {
          return {
            valid: false,
            error: `Main.java:${lineNum}: error: empty character literal\n    ${line.trim()}\n    ^\n1 error`
          };
        }
        const isValidChar = (
          inner.length === 1 ||
          (inner.startsWith('\\') && (inner.length === 2 || (inner.startsWith('\\u') && inner.length === 6)))
        );
        if (!isValidChar) {
          return {
            valid: false,
            error: `Main.java:${lineNum}: error: unclosed character literal\n    ${line.trim()}\n    ^\n1 error`
          };
        }
      }
    }

    const singleQuotes = (tempNoDoubleQuotes.match(/(?<!\\)'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      return {
        valid: false,
        error: `Main.java:${lineNum}: error: unclosed character literal\n    ${line.trim()}\n    ^\n1 error`
      };
    }

    // Strip string and char literals for syntax structure parsing
    let cleanLine = lineWithoutComments.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    const cleanTrimmed = cleanLine.trim();

    // Count braces & parens
    for (const char of cleanTrimmed) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }

    if (braceCount < 0) {
      return {
        valid: false,
        error: `Main.java:${lineNum}: error: class, interface, enum, or record expected (unexpected '}')\n    ${line.trim()}\n    ^\n1 error`
      };
    }

    // Strict Semicolon Check
    const isControlFlow = /^(if|else\s+if|else|for|while|switch|do|try|catch|finally|synchronized)\b/.test(cleanTrimmed);
    const isClassOrMethod = /(?:class|interface|enum|record)\s+[A-Za-z0-9_]+|(?:public|private|protected|static|final|native|synchronized|abstract|\s)+\s+[A-Za-z0-9_<>,\[\]]+\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{?$/.test(cleanTrimmed);
    const isAnnotation = /^@[A-Za-z0-9_]+/.test(cleanTrimmed);
    const endsWithBlockChar = /[\{\}\:\,\+\-\*\/\=\&\|\(\[]$/.test(cleanTrimmed);
    const isSpecial = /^package\b|^import\b/.test(cleanTrimmed);

    // If it's import/package, it MUST end in semicolon
    if (isSpecial && !cleanTrimmed.endsWith(';')) {
      return {
        valid: false,
        error: `Main.java:${lineNum}: error: ';' expected\n    ${line.trim()}\n    ${" ".repeat(line.trim().length)}^\n1 error`
      };
    }

    // Standard statement lines must end with ; or { or }
    if (!isControlFlow && !isClassOrMethod && !isAnnotation && !endsWithBlockChar) {
      if (!cleanTrimmed.endsWith(';') && !cleanTrimmed.endsWith('{') && !cleanTrimmed.endsWith('}')) {
        return {
          valid: false,
          error: `Main.java:${lineNum}: error: ';' expected\n    ${line.trim()}\n    ${" ".repeat(line.trim().length)}^\n1 error`
        };
      }
    }
  }

  if (braceCount !== 0) {
    return {
      valid: false,
      error: `Main.java: error: reached end of file while parsing (unclosed brace '{')\n1 error`
    };
  }

  if (parenCount !== 0) {
    return {
      valid: false,
      error: `Main.java: error: unclosed parenthesis '('\n1 error`
    };
  }

  if (!script.includes("main")) {
    return {
      valid: false,
      error: `Main.java: error: Main method not found in class Main, please define:\n   public static void main(String[] args)\n1 error`
    };
  }

  return { valid: true };
}

export function validateCppSyntax(script, isC = false) {
  const fileName = isC ? "main.c" : "main.cpp";
  if (!script || !script.trim()) {
    return { valid: false, error: `${fileName}:1: error: file is empty` };
  }

  const rawLines = script.split(/\r?\n/);
  let braceCount = 0;
  let parenCount = 0;
  let inBlockComment = false;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNum = i + 1;
    let line = rawLines[i];

    let lineWithoutComments = line;
    if (inBlockComment) {
      if (lineWithoutComments.includes("*/")) {
        lineWithoutComments = lineWithoutComments.substring(lineWithoutComments.indexOf("*/") + 2);
        inBlockComment = false;
      } else {
        continue;
      }
    }

    if (lineWithoutComments.includes("/*")) {
      if (!lineWithoutComments.includes("*/")) {
        inBlockComment = true;
        lineWithoutComments = lineWithoutComments.substring(0, lineWithoutComments.indexOf("/*"));
      } else {
        lineWithoutComments = lineWithoutComments.replace(/\/\*.*?\*\//g, "");
      }
    }

    if (lineWithoutComments.includes("//")) {
      lineWithoutComments = lineWithoutComments.substring(0, lineWithoutComments.indexOf("//"));
    }

    const trimmed = lineWithoutComments.trim();
    if (!trimmed) continue;

    // Check string literal closing
    const doubleQuotes = (lineWithoutComments.match(/(?<!\\)"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      return {
        valid: false,
        error: `${fileName}:${lineNum}: error: missing terminating " character\n    ${line.trim()}\n    ^\n1 error generated.`
      };
    }

    // Check empty character constant
    const tempNoDoubleQuotes = lineWithoutComments.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    if (tempNoDoubleQuotes.includes("''")) {
      return {
        valid: false,
        error: `${fileName}:${lineNum}: error: empty character constant\n    ${line.trim()}\n    ^\n1 error generated.`
      };
    }

    const singleQuotes = (tempNoDoubleQuotes.match(/(?<!\\)'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      return {
        valid: false,
        error: `${fileName}:${lineNum}: error: missing terminating ' character\n    ${line.trim()}\n    ^\n1 error generated.`
      };
    }

    let cleanLine = lineWithoutComments.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    const cleanTrimmed = cleanLine.trim();

    for (const char of cleanTrimmed) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }

    if (braceCount < 0) {
      return {
        valid: false,
        error: `${fileName}:${lineNum}: error: expected declaration before '}' token\n    ${line.trim()}\n    ^\n1 error generated.`
      };
    }

    if (cleanTrimmed.startsWith("#")) continue;

    const isControlFlow = /^(if|else\s+if|else|for|while|switch|do|try|catch)\b/.test(cleanTrimmed);
    const isFuncSignature = /(?:void|int|double|float|char|bool|auto|long|string|vector<[^>]+>|\s)+\s+[A-Za-z0-9_:]+\s*\([^)]*\)\s*\{?$/.test(cleanTrimmed);
    const isStructOrClass = /^(struct|class|enum|union|namespace)\b/.test(cleanTrimmed);
    const isAccessSpecifier = /^(public|private|protected)\s*:/.test(cleanTrimmed);
    const endsWithBlockChar = /[\{\}\:\,\+\-\*\/\=\&\|\(\[]$/.test(cleanTrimmed);

    if (!isControlFlow && !isFuncSignature && !isStructOrClass && !isAccessSpecifier && !endsWithBlockChar) {
      if (!cleanTrimmed.endsWith(';') && !cleanTrimmed.endsWith('{') && !cleanTrimmed.endsWith('}')) {
        return {
          valid: false,
          error: `${fileName}:${lineNum}: error: expected ';' before newline or next token\n    ${line.trim()}\n    ${" ".repeat(line.trim().length)}^\n1 error generated.`
        };
      }
    }
  }

  if (braceCount !== 0) {
    return {
      valid: false,
      error: `${fileName}: error: expected '}' at end of input\n1 error generated.`
    };
  }

  if (parenCount !== 0) {
    return {
      valid: false,
      error: `${fileName}: error: expected ')' before end of statement\n1 error generated.`
    };
  }

  if (!script.includes("main")) {
    return {
      valid: false,
      error: `${fileName}: error: '::main' must return 'int' / undefined reference to 'main'\n1 error generated.`
    };
  }

  return { valid: true };
}

// ==============================================================================
// 2. C & C++ IN-BROWSER WEB ASSEMBLY RUNTIME
// ==============================================================================
let jscppLoadingPromise = null;

async function getJSCPP() {
  if (window.JSCPP) return window.JSCPP;
  if (jscppLoadingPromise) return jscppLoadingPromise;

  jscppLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.JSCPP) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/JSCPP@latest/dist/JSCPP.es5.min.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise((res, rej) => {
          script.onload = res;
          script.onerror = rej;
        });
      }
      resolve(window.JSCPP);
    } catch (err) {
      console.warn("Unable to load in-browser C engine:", err);
      reject(err);
    } finally {
      jscppLoadingPromise = null;
    }
  });

  return jscppLoadingPromise;
}

/**
 * Pure C In-Browser Execution using ANSI C engine.
 */
export async function runCWasm(script, stdin, timeoutMs = 3000) {
  const startTime = Date.now();

  const syntaxCheck = validateCppSyntax(script, true);
  if (!syntaxCheck.valid) {
    return {
      stdout: "",
      output: syntaxCheck.error,
      error: syntaxCheck.error,
      statusCode: "400",
      cpuTime: "0ms",
      memory: "Local JS Sandbox",
      providerUsed: "transpiler-local",
      executionType: "TRANSPILER-LOCAL-JS",
      success: false
    };
  }

  const jscpp = await getJSCPP();

  return new Promise((resolve) => {
    let outputBuffer = "";

    const timer = setTimeout(() => {
      resolve({
        stdout: outputBuffer,
        output: outputBuffer ? outputBuffer + "\nTime Limit Exceeded (3s)" : "Time Limit Exceeded (3s)",
        error: "Time Limit Exceeded (3s)",
        statusCode: "400",
        cpuTime: "3000ms",
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: false
      });
    }, timeoutMs);

    try {
      const exitCode = jscpp.run(
        script || "",
        stdin || "",
        {
          stdio: {
            write: (str) => {
              outputBuffer += str;
            }
          },
          maxTimeout: timeoutMs
        }
      );

      clearTimeout(timer);
      const isSuccess = exitCode === 0;
      const latency = Date.now() - startTime;

      resolve({
        stdout: outputBuffer,
        output: outputBuffer || (isSuccess ? "" : ("Execution finished with non-zero exit code: " + exitCode)),
        error: isSuccess ? "" : ("Non-zero exit code: " + exitCode),
        statusCode: isSuccess ? "200" : "400",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: isSuccess
      });
    } catch (err) {
      clearTimeout(timer);
      const latency = Date.now() - startTime;
      const errMsg = String(err?.message || err || "C Execution Error");
      resolve({
        stdout: outputBuffer,
        output: outputBuffer ? (outputBuffer + "\n" + errMsg) : errMsg,
        error: errMsg,
        statusCode: "400",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: false
      });
    }
  });
}

/**
 * C++ In-Browser Execution supporting competitive programming STL (vector, string, cin/cout, algorithms).
 */
export async function runCppWasm(script, stdin, timeoutMs = 3000) {
  const startTime = Date.now();

  const syntaxCheck = validateCppSyntax(script, false);
  if (!syntaxCheck.valid) {
    return {
      stdout: "",
      output: syntaxCheck.error,
      error: syntaxCheck.error,
      statusCode: "400",
      cpuTime: "0ms",
      memory: "Local JS Sandbox",
      providerUsed: "transpiler-local",
      executionType: "TRANSPILER-LOCAL-JS",
      success: false
    };
  }

  return new Promise(async (resolve, reject) => {
    let output = "";
    const rawStdin = String(stdin || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = rawStdin.split("\n");
    const allTokens = rawStdin.trim().split(/\s+/).filter(Boolean);
    let tokenIdx = 0;
    let lineIdx = 0;

    // Polyfill C++ cin
    const cin = {
      get: () => {
        const tok = allTokens[tokenIdx++];
        if (tok === undefined) return "";
        const num = Number(tok);
        return !isNaN(num) ? num : tok;
      },
      getInt: () => parseInt(allTokens[tokenIdx++], 10) || 0,
      getDouble: () => parseFloat(allTokens[tokenIdx++]) || 0,
      getString: () => allTokens[tokenIdx++] || "",
      getLine: () => lines[lineIdx++] || "",
      eof: () => tokenIdx >= allTokens.length
    };

    const MAX_OUTPUT = 50000;

    // Polyfill C++ cout & endl
    const endl = "\n";
    const cout = {
      write: (v) => {
        if (output.length > MAX_OUTPUT) {
          throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
        }
        output += (v !== undefined ? String(v) : "");
      },
      writeln: (v) => {
        if (output.length > MAX_OUTPUT) {
          throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
        }
        output += (v !== undefined ? String(v) : "") + "\n";
      }
    };

    // Polyfill C++ STL vector
    function Vector(initialSize = 0, initialVal = 0) {
      const arr = new Array(initialSize).fill(initialVal);
      arr.push_back = function (v) {
        arr.push(v);
      };
      arr.pop_back = function () {
        return arr.pop();
      };
      arr.size = function () {
        return arr.length;
      };
      arr.empty = function () {
        return arr.length === 0;
      };
      arr.clear = function () {
        arr.length = 0;
      };
      arr.begin = function () { return 0; };
      arr.end = function () { return arr.length; };
      return arr;
    }

    // Polyfill C++ STL algorithms & math
    const sort = function (vec, comp) {
      if (Array.isArray(vec)) {
        if (typeof comp === "function") {
          vec.sort(comp);
        } else {
          vec.sort((a, b) => a - b);
        }
      }
    };

    const reverse = function (vec) {
      if (Array.isArray(vec)) {
        vec.reverse();
      }
    };

    const max = function (a, b) {
      return Math.max(a, b);
    };
    const min = function (a, b) {
      return Math.min(a, b);
    };
    const abs = function (a) {
      return Math.abs(a);
    };
    const sqrt = function (a) {
      return Math.sqrt(a);
    };
    const pow = function (a, b) {
      return Math.pow(a, b);
    };

    try {
      let jsCode = (script || "")
        .replace(/#include\s*<[^>]+>/g, "")
        .replace(/using\s+namespace\s+std\s*;/g, "")
        .replace(/ios_base::sync_with_stdio\s*\([^)]*\)\s*;/gi, "")
        .replace(/cin\.tie\s*\([^)]*\)\s*;/gi, "")
        .replace(/\b(?:int|void)?\s*main\s*\([^)]*\)\s*\{/g, "function main() {")
        .replace(/if\s*\(\s*!\s*\(\s*cin\s*>>\s*([A-Za-z0-9_\[\]]+)\s*\)\s*\)/g, "if (($1 = cin.get()) === undefined || $1 === '')")
        .replace(/while\s*\(\s*cin\s*>>\s*([A-Za-z0-9_\[\]]+)\s*\)/g, "while (($1 = cin.get()) !== undefined && $1 !== '')")
        .replace(/\bvector<[A-Za-z0-9_]+>\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*;/g, "let $1 = Vector($2);")
        .replace(/\bvector<[A-Za-z0-9_]+>\s+([A-Za-z0-9_]+)\s*;/g, "let $1 = Vector();")
        .replace(/\b(?:int|long\s+long|long|double|float|char|bool)\s+([A-Za-z0-9_]+)\s*\[([^\]]+)\]\s*;/g, "let $1 = new Array(Number($2) || 0).fill(0);")
        .replace(/\bstring\s+/g, "let ")
        .replace(/\bint\s+/g, "let ")
        .replace(/\blong\s+long\s+/g, "let ")
        .replace(/\blong\s+/g, "let ")
        .replace(/\bdouble\s+/g, "let ")
        .replace(/\bfloat\s+/g, "let ")
        .replace(/\bchar\s+/g, "let ")
        .replace(/\bbool\s+/g, "let ")
        .replace(/\bauto\s+/g, "let ")
        .replace(/reverse\s*\(\s*([A-Za-z0-9_]+)\.begin\(\)\s*,\s*([A-Za-z0-9_]+)\.end\(\)\s*\)\s*;/g, "reverse($1);")
        .replace(/sort\s*\(\s*([A-Za-z0-9_]+)\.begin\(\)\s*,\s*([A-Za-z0-9_]+)\.end\(\)\s*\)\s*;/g, "sort($1);")
        .replace(/cin\s*>>\s*([A-Za-z0-9_\[\]]+)\s*>>\s*([A-Za-z0-9_\[\]]+)\s*>>\s*([A-Za-z0-9_\[\]]+)\s*;/g, "$1 = cin.get(); $2 = cin.get(); $3 = cin.get();")
        .replace(/cin\s*>>\s*([A-Za-z0-9_\[\]]+)\s*>>\s*([A-Za-z0-9_\[\]]+)\s*;/g, "$1 = cin.get(); $2 = cin.get();")
        .replace(/cin\s*>>\s*([A-Za-z0-9_\[\]]+)\s*;/g, "$1 = cin.get();")
        .replace(/cout\s*<<\s*([^;]+)\s*;/g, (match, expr) => {
          const parts = expr.split("<<").map((p) => p.trim());
          let res = "";
          parts.forEach((p) => {
            if (p === "endl") {
              res += "cout.write('\\n'); ";
            } else {
              res += `cout.write(${p}); `;
            }
          });
          return res;
        });

      // Inject infinite loop protection watchdog
      jsCode = injectLoopGuards(jsCode);

      const runner = new Function(
        "cin",
        "cout",
        "endl",
        "Vector",
        "sort",
        "reverse",
        "max",
        "min",
        "abs",
        "sqrt",
        "pow",
        `
        ${jsCode}
        if (typeof main === 'function') {
          main();
        }
      `
      );

      runner(cin, cout, endl, Vector, sort, reverse, max, min, abs, sqrt, pow);
      const latency = Date.now() - startTime;

      resolve({
        stdout: output,
        output: output,
        error: "",
        statusCode: "200",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: true
      });
    } catch (sandboxErr) {
      // If local C++ sandbox encounters complex syntax, try JSCPP fallback
      try {
        const jscppRes = await runCWasm(script, stdin, timeoutMs);
        if (jscppRes && (jscppRes.success || jscppRes.stdout)) {
          resolve(jscppRes);
          return;
        }
      } catch {}

      const latency = Date.now() - startTime;
      let errMsg = String(sandboxErr?.message || sandboxErr || "C++ Execution Error");
      if (errMsg.includes("Maximum call stack size exceeded")) {
        errMsg = "Runtime Error: StackOverflowError (Infinite recursion / maximum call stack exceeded)";
      }
      resolve({
        stdout: output,
        output: output ? (output.slice(0, 300) + "\n... [Output Truncated]\n" + errMsg) : errMsg,
        error: errMsg,
        statusCode: "400",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: false
      });
    }
  });
}

// ==============================================================================
// 3. JAVA IN-BROWSER WEB ASSEMBLY RUNTIME (CheerpJ 3.0 + Local VM Sandbox)
// ==============================================================================
let cheerpjLoadingPromise = null;
let cheerpjReady = false;

async function getCheerpJ() {
  if (cheerpjReady) return true;
  if (cheerpjLoadingPromise) return cheerpjLoadingPromise;

  cheerpjLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.cheerpjInit) {
        const script = document.createElement("script");
        script.src = "https://cjrtnc.leaningtech.com/3.0/cj3loader.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise((res, rej) => {
          script.onload = res;
          script.onerror = rej;
        });
      }

      if (window.cheerpjInit && !cheerpjReady) {
        await window.cheerpjInit({
          enablePreciseAppletMode: false
        });
        cheerpjReady = true;
      }
      resolve(true);
    } catch (err) {
      console.warn("CheerpJ Java WASM initialization deferred:", err);
      reject(err);
    } finally {
      cheerpjLoadingPromise = null;
    }
  });

  return cheerpjLoadingPromise;
}

function injectLoopGuards(jsCode) {
  let counter = 0;
  return jsCode
    .replace(/\bwhile\s*\(([^)]*)\)\s*\{/g, (match, cond) => {
      const iterVar = `__iter_${++counter}`;
      return `let ${iterVar} = 0;\nwhile (${cond}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
    })
    .replace(/\bfor\s*\(([^;]*;[^;]*;[^)]*)\)\s*\{/g, (match, header) => {
      const iterVar = `__iter_${++counter}`;
      return `let ${iterVar} = 0;\nfor (${header}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
    });
}

/**
 * Executes standard Java assessment programs locally in-browser with zero latency.
 */
export async function runJavaWasm(script, stdin, timeoutMs = 3000) {
  const startTime = Date.now();

  const syntaxCheck = validateJavaSyntax(script);
  if (!syntaxCheck.valid) {
    return {
      stdout: "",
      output: syntaxCheck.error,
      error: syntaxCheck.error,
      statusCode: "400",
      cpuTime: "0ms",
      memory: "Local JS Sandbox",
      providerUsed: "transpiler-local",
      executionType: "TRANSPILER-LOCAL-JS",
      success: false
    };
  }

  return new Promise((resolve) => {
    let output = "";
    const MAX_OUTPUT = 50000;
    const rawStdin = String(stdin || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = rawStdin.split("\n");
    const allTokens = rawStdin.trim().split(/\s+/).filter(Boolean);
    let tokenIdx = 0;
    let lineIdx = 0;

    const Scanner = function () {
      return {
        hasNext: () => tokenIdx < allTokens.length,
        hasNextInt: () => tokenIdx < allTokens.length && !isNaN(parseInt(allTokens[tokenIdx])),
        hasNextDouble: () => tokenIdx < allTokens.length && !isNaN(parseFloat(allTokens[tokenIdx])),
        hasNextLine: () => lineIdx < lines.length,
        next: () => allTokens[tokenIdx++] || "",
        nextInt: () => parseInt(allTokens[tokenIdx++], 10) || 0,
        nextDouble: () => parseFloat(allTokens[tokenIdx++]) || 0,
        nextLine: () => lines[lineIdx++] || "",
        close: () => {}
      };
    };

    const System = {
      in: {},
      out: {
        println: (v) => {
          if (output.length > MAX_OUTPUT) {
            throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
          }
          output += (v !== undefined ? String(v) : "") + "\n";
        },
        print: (v) => {
          if (output.length > MAX_OUTPUT) {
            throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
          }
          output += (v !== undefined ? String(v) : "");
        },
        printf: (fmt, ...args) => {
          let res = String(fmt);
          args.forEach((a) => {
            res = res.replace(/%[sdf]/, String(a));
          });
          if (output.length > MAX_OUTPUT) {
            throw new Error("Output Limit Exceeded: Generated more than 50KB of output (infinite loop detected)");
          }
          output += res;
        }
      }
    };

    const MathRef = Math;

    try {
      let jsCode = (script || "")
        .replace(/import\s+[^;]+;/g, "")
        .replace(/public\s+class\s+[A-Za-z0-9_]+\s*\{/g, "")
        .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, "function main() {")
        .replace(/static\s+void\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
        .replace(/static\s+int\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
        .replace(/static\s+boolean\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
        .replace(/static\s+String\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
        .replace(/Scanner\s+[a-zA-Z0-9_]+\s*=\s*new\s+Scanner\s*\([^)]*\)\s*;/g, "const sc = Scanner();")
        .replace(/\bint\s+/g, "let ")
        .replace(/\bdouble\s+/g, "let ")
        .replace(/\bfloat\s+/g, "let ")
        .replace(/\blong\s+/g, "let ")
        .replace(/\bboolean\s+/g, "let ")
        .replace(/\bString\s+/g, "let ")
        .replace(/\bchar\s+/g, "let ")
        .replace(/\bfinal\s+/g, "const ")
        .replace(/\.equals\s*\(/g, " === (")
        .replace(/\.length\(\)/g, ".length")
        .replace(/\.charAt\s*\(/g, "[")
        .replace(/\.substring\s*\(/g, ".slice(");

      const lastBrace = jsCode.lastIndexOf("}");
      if (lastBrace !== -1) {
        jsCode = jsCode.slice(0, lastBrace);
      }

      // Inject infinite loop protection watchdog
      jsCode = injectLoopGuards(jsCode);

      const runner = new Function("Scanner", "System", "Math", `
        ${jsCode}
        if (typeof main === 'function') {
          main();
        }
      `);

      runner(Scanner, System, MathRef);
      const latency = Date.now() - startTime;

      resolve({
        stdout: output,
        output: output,
        error: "",
        statusCode: "200",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: true
      });
    } catch (err) {
      const latency = Date.now() - startTime;
      let errMsg = String(err?.message || err || "Java Execution Error");
      if (errMsg.includes("Maximum call stack size exceeded")) {
        errMsg = "Runtime Error: StackOverflowError (Infinite recursion / maximum call stack exceeded)";
      }
      resolve({
        stdout: output,
        output: output ? (output.slice(0, 300) + "\n... [Output Truncated]\n" + errMsg) : errMsg,
        error: errMsg,
        statusCode: "400",
        cpuTime: `${latency}ms`,
        memory: "Local JS Sandbox",
        providerUsed: "transpiler-local",
        executionType: "TRANSPILER-LOCAL-JS",
        success: false
      });
    }
  });
}

// ==============================================================================
// 4. ISOLATED WEB WORKER WATCHDOG RUNNER (WASM-LOCAL)
// ==============================================================================
/**
 * Spawns an isolated Web Worker for Java (CheerpJ+ECJ), C/C++, or Python.
 * Includes a 5000ms hard watchdog timer that terminates the worker on TLE / infinite loops.
 */
export function executeWasmWorker(lang, script, stdin, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let workerFile = "/workers/java-runner.worker.js?v=2.1";
    const l = (lang || "").toLowerCase();
    if (l.includes("python") || l === "py") {
      workerFile = "/workers/python-runner.worker.js?v=2.1";
    } else if (l === "c" || l.includes("cpp") || l.includes("c++")) {
      workerFile = "/workers/cpp-runner.worker.js?v=2.1";
    }

    let worker = null;
    let timedOut = false;

    const watchdog = setTimeout(() => {
      timedOut = true;
      if (worker) {
        try { worker.terminate(); } catch {}
      }
      resolve({
        stdout: "",
        output: `Time Limit Exceeded (${timeoutMs}ms - Execution exceeded time limit)`,
        error: `Time Limit Exceeded (${timeoutMs}ms)`,
        statusCode: "400",
        cpuTime: `${timeoutMs}ms`,
        memory: "WASM Toolchain (Worker Sandbox)",
        providerUsed: "wasm-local",
        executionType: "WASM-LOCAL",
        success: false
      });
    }, timeoutMs);

    try {
      worker = new Worker(workerFile);
      worker.onmessage = (e) => {
        if (timedOut) return;
        clearTimeout(watchdog);
        try { worker.terminate(); } catch {}
        resolve(e.data);
      };
      worker.onerror = (err) => {
        if (timedOut) return;
        clearTimeout(watchdog);
        try { worker.terminate(); } catch {}
        resolve({
          stdout: "",
          output: String(err?.message || err || "Worker Execution Error"),
          error: String(err?.message || err),
          statusCode: "400",
          cpuTime: "0ms",
          memory: "WASM Toolchain (Worker Sandbox)",
          providerUsed: "wasm-local",
          executionType: "WASM-LOCAL",
          success: false
        });
      };

      worker.postMessage({
        code: script,
        input: stdin,
        lang: lang,
        timeoutMs: timeoutMs
      });
    } catch (workerInitErr) {
      clearTimeout(watchdog);
      console.warn("Unable to spawn Web Worker, falling back to local runner:", workerInitErr);
      resolve(null);
    }
  });
}

// ==============================================================================
// 5. UNIVERSAL 4-TIER CODE EXECUTION & COMPILER DISPATCHER
// ==============================================================================
/**
 * Universal Multi-Language Code Runner supporting all 4 engines:
 * 1. wasm-local: Isolated Web Worker WASM Toolchain (CheerpJ+ECJ Java, C/C++ WASM, Pyodide Python)
 * 2. transpiler-local: Ultra-fast Client JS AST Transpiler (~1ms latency)
 * 3. onecompiler: Isolated cloud Linux container judge
 * 4. jdoodle: Enterprise OpenJDK / GCC cloud judge
 */
export async function executeWasmOrFallback(script, stdin, language, providerOverride) {
  const lang = (language || "java").trim().toLowerCase();
  const override = (providerOverride || "").trim().toLowerCase();

  // 1. Explicit Cloud Judge Override (OneCompiler / JDoodle)
  if (override === "onecompiler" || override === "jdoodle") {
    const res = await Client.post("/code-execution/generate-output", {
      script: script,
      stdin: stdin,
      language: language
    });
    return {
      ...res.data,
      executionType: "CLOUD-JUDGE"
    };
  }

  // 2. Client-Side WASM Toolchain (Web Workers + Genuine Compiler Diagnostics)
  if (override === "wasm-local" || !override) {
    try {
      const workerRes = await executeWasmWorker(lang, script, stdin, 5000);
      if (workerRes && (workerRes.success || workerRes.output || workerRes.error)) {
        return workerRes;
      }
    } catch (workerErr) {
      console.warn("[WASM Runner] Worker execution failed, evaluating fallback:", workerErr);
    }
  }

  // 3. Client JS Transpiler Engine (Fast In-Browser AST Evaluation)
  if (override === "transpiler-local" || !override) {
    if (lang.includes("python") || lang === "py") {
      try {
        const localResult = await runPythonTranspiler(script, stdin);
        if (localResult) {
          return {
            ...localResult,
            executionType: "TRANSPILER-LOCAL-JS"
          };
        }
      } catch (transpilerErr) {
        console.warn("[Transpiler Runner] Python fallback to server judge:", transpilerErr);
      }
    }

    if (lang === "c") {
      try {
        const localResult = await runCWasm(script, stdin);
        if (localResult) {
          return {
            ...localResult,
            executionType: "TRANSPILER-LOCAL-JS"
          };
        }
      } catch (cErr) {
        console.warn("[Transpiler Runner] C fallback to server judge:", cErr);
      }
    }

    if (lang.includes("cpp") || lang.includes("c++")) {
      try {
        const localResult = await runCppWasm(script, stdin);
        if (localResult) {
          return {
            ...localResult,
            executionType: "TRANSPILER-LOCAL-JS"
          };
        }
      } catch (cppErr) {
        console.warn("[Transpiler Runner] C++ fallback to server judge:", cppErr);
      }
    }

    if (lang.includes("java")) {
      try {
        const localResult = await runJavaWasm(script, stdin);
        if (localResult) {
          return {
            ...localResult,
            executionType: "TRANSPILER-LOCAL-JS"
          };
        }
      } catch (javaErr) {
        console.warn("[Transpiler Runner] Java fallback to server judge:", javaErr);
      }
    }
  }

  // 4. Server Cloud Fallback (OneCompiler / JDoodle)
  const res = await Client.post("/code-execution/generate-output", {
    script: script,
    stdin: stdin,
    language: language
  });

  return {
    ...res.data,
    executionType: "CLOUD-JUDGE"
  };
}
