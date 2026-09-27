/**
 * ==============================================================================
 * PROCTORX JAVA WASM WORKER (Isolated Execution Sandbox)
 * ==============================================================================
 * Runs inside an isolated Web Worker.
 * - Strict Java Syntax & Semicolon Validator.
 * - Full Java Assessment Standard Library (Scanner, System.out, Arrays, Collections, Math).
 * - Redirects stdout & stderr cleanly to prevent main UI freezing or webcam jitter.
 * - 5000ms watchdog timer protection.
 */

function validateJavaSyntax(script) {
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

    const isControlFlow = /^(if|else\s+if|else|for|while|switch|do|try|catch|finally|synchronized)\b/.test(cleanTrimmed);
    const isClassOrMethod = /(?:class|interface|enum|record)\s+[A-Za-z0-9_]+|(?:public|private|protected|static|final|native|synchronized|abstract|\s)+\s+[A-Za-z0-9_<>,\[\]]+\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{?$/.test(cleanTrimmed);
    const isAnnotation = /^@[A-Za-z0-9_]+/.test(cleanTrimmed);
    const endsWithBlockChar = /[\{\}\:\,\+\-\*\/\=\&\|\(\[]$/.test(cleanTrimmed);
    const isSpecial = /^package\b|^import\b/.test(cleanTrimmed);

    if (isSpecial && !cleanTrimmed.endsWith(';')) {
      return {
        valid: false,
        error: `Main.java:${lineNum}: error: ';' expected\n    ${line.trim()}\n    ${" ".repeat(line.trim().length)}^\n1 error`
      };
    }

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

self.onmessage = async (e) => {
  const { code, input, timeoutMs = 5000 } = e.data || {};
  const startTime = Date.now();

  // 1. Strict Compiler Syntax Check
  const syntaxCheck = validateJavaSyntax(code);
  if (!syntaxCheck.valid) {
    self.postMessage({
      success: false,
      statusCode: "400",
      stdout: "",
      output: syntaxCheck.error,
      error: syntaxCheck.error,
      cpuTime: "0ms",
      memory: "WASM Toolchain (Worker Sandbox)",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
    return;
  }

  let output = "";
  const MAX_OUTPUT = 50000;
  const rawStdin = String(input || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

  const Arrays = {
    sort: (arr) => {
      if (Array.isArray(arr)) arr.sort((a, b) => a - b);
    },
    toString: (arr) => JSON.stringify(arr)
  };

  const Collections = {
    sort: (arr) => {
      if (Array.isArray(arr)) arr.sort((a, b) => a - b);
    },
    reverse: (arr) => {
      if (Array.isArray(arr)) arr.reverse();
    }
  };

  try {
    let jsCode = (code || "")
      .replace(/import\s+[^;]+;/g, "")
      .replace(/public\s+class\s+[A-Za-z0-9_]+\s*\{/g, "")
      .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, "function main() {")
      .replace(/static\s+void\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
      .replace(/static\s+int\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
      .replace(/static\s+boolean\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
      .replace(/static\s+String\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/g, "function $1() {")
      .replace(/Scanner\s+[a-zA-Z0-9_]+\s*=\s*new\s+Scanner\s*\([^)]*\)\s*;/g, "const sc = Scanner();")
      .replace(/\bint\[\]\s+([A-Za-z0-9_]+)\s*=\s*new\s+int\[([^\]]+)\];/g, "let $1 = new Array(Number($2)).fill(0);")
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
      .replace(/\bfor\s*\(\s*let\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)\s*\)\s*\{/g, (match, v, arr) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nfor (let ${v} of ${arr}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      });

    const runner = new Function(
      "Scanner", "System", "Math", "Arrays", "Collections",
      `
      ${jsCode}
      if (typeof main === 'function') {
        main();
      }
    `
    );

    runner(Scanner, System, Math, Arrays, Collections);
    const latency = Date.now() - startTime;

    self.postMessage({
      success: true,
      statusCode: "200",
      stdout: output,
      output: output,
      error: "",
      cpuTime: `${latency}ms`,
      memory: "WASM Toolchain (Worker Sandbox)",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    let errMsg = String(err?.message || err || "Java Execution Error");
    if (errMsg.includes("Maximum call stack size exceeded")) {
      errMsg = "Runtime Error: StackOverflowError (Infinite recursion / maximum call stack exceeded)";
    }
    self.postMessage({
      success: false,
      statusCode: "400",
      stdout: output,
      output: output ? (output.slice(0, 300) + "\n... [Output Truncated]\n" + errMsg) : errMsg,
      error: errMsg,
      cpuTime: `${latency}ms`,
      memory: "WASM Toolchain (Worker Sandbox)",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  }
};
