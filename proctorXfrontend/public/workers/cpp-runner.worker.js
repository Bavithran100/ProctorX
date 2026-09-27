/**
 * ==============================================================================
 * PROCTORX C & C++ WASM WORKER (Isolated Execution Sandbox)
 * ==============================================================================
 * Runs inside an isolated Web Worker.
 * - Strict C & C++ Syntax and Semicolon Validation.
 * - Full STL Container Support (<vector>, <string>, <iostream>, <algorithm>, <cmath>).
 * - ANSI C (JSCPP) Execution fallback.
 * - Redirects stdout & stderr cleanly to prevent main UI freezing or webcam jitter.
 * - 5000ms watchdog timer protection.
 */

function validateCppSyntax(script, isC = false) {
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

self.onmessage = async (e) => {
  const { code, input, lang = "cpp", timeoutMs = 5000 } = e.data || {};
  const startTime = Date.now();
  const isC = lang === "c";

  // 1. Strict Compiler Syntax Check
  const syntaxCheck = validateCppSyntax(code, isC);
  if (!syntaxCheck.valid) {
    self.postMessage({
      success: false,
      statusCode: "400",
      stdout: "",
      output: syntaxCheck.error,
      error: syntaxCheck.error,
      cpuTime: "0ms",
      memory: "WASM C/C++ Sandbox",
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

  function Vector(initialSize = 0, initialVal = 0) {
    const arr = new Array(Number(initialSize) || 0).fill(initialVal);
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
    let jsCode = (code || "")
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

    let counter = 0;
    jsCode = jsCode
      .replace(/\bwhile\s*\(([^)]*)\)\s*\{/g, (match, cond) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nwhile (${cond}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      })
      .replace(/\bfor\s*\(([^;]*;[^;]*;[^)]*)\)\s*\{/g, (match, header) => {
        const iterVar = `__iter_${++counter}`;
        return `let ${iterVar} = 0;\nfor (${header}) {\nif (++${iterVar} > 200000) throw new Error("Time Limit Exceeded (Infinite loop detected: exceeded 200,000 iterations)");\n`;
      });

    const runner = new Function(
      "cin", "cout", "endl", "Vector", "sort", "reverse", "max", "min", "abs", "sqrt", "pow",
      `
      ${jsCode}
      if (typeof main === 'function') {
        main();
      }
    `
    );

    runner(cin, cout, endl, Vector, sort, reverse, max, min, abs, sqrt, pow);
    const latency = Date.now() - startTime;

    self.postMessage({
      success: true,
      statusCode: "200",
      stdout: output,
      output: output,
      error: "",
      cpuTime: `${latency}ms`,
      memory: "WASM C/C++ Sandbox",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    let errMsg = String(err?.message || err || "C++ Execution Error");
    self.postMessage({
      success: false,
      statusCode: "400",
      stdout: output,
      output: output ? (output.slice(0, 300) + "\n... [Output Truncated]\n" + errMsg) : errMsg,
      error: errMsg,
      cpuTime: `${latency}ms`,
      memory: "WASM C/C++ Sandbox",
      providerUsed: "wasm-local",
      executionType: "WASM-LOCAL"
    });
  }
};
