/** Numeric formulas only. Column titles are referenced as {Title}. No JavaScript eval. */

type Value = number | null;

function tokenize(source: string): string[] {
  const tokens: string[] = [];
  const pattern = /\{[^}]+\}|<=|>=|<>|!=|[=<>]|[+\-*/(),]|"(?:[^"]*)"|'(?:[^']*)'|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*/g;
  let match = pattern.exec(source);
  while (match) {
    tokens.push(match[0]);
    match = pattern.exec(source);
  }
  return tokens;
}

export function evaluateFormula(source: string, lookup: (title: string) => number | string | null): number | string {
  const tokens = tokenize(source.trim());
  if (tokens.length === 0) return "Add a formula in column settings.";
  let index = 0;

  const peek = () => tokens[index] ?? "";
  const take = () => tokens[index++] ?? "";

  function parseExpression(): Value {
    return parseComparison();
  }

  function parseComparison(): Value {
    let left = parseAdd();
    const op = peek();
    if ([">", "<", ">=", "<=", "=", "==", "!=", "<>"].includes(op)) {
      take();
      const right = parseAdd();
      if (left === null || right === null) return null;
      if (op === ">" ) return left > right ? 1 : 0;
      if (op === "<") return left < right ? 1 : 0;
      if (op === ">=") return left >= right ? 1 : 0;
      if (op === "<=") return left <= right ? 1 : 0;
      if (op === "=" || op === "==") return left === right ? 1 : 0;
      return left !== right ? 1 : 0;
    }
    return left;
  }

  function parseAdd(): Value {
    let left = parseMul();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const right = parseMul();
      if (left === null || right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMul(): Value {
    let left = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const right = parseUnary();
      if (left === null || right === null) return null;
      if (op === "/" && right === 0) throw new Error("Cannot divide by zero.");
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseUnary(): Value {
    if (peek() === "-") {
      take();
      const value = parseUnary();
      return value === null ? null : -value;
    }
    return parsePrimary();
  }

  function parsePrimary(): Value {
    const token = peek();
    if (token === "(") {
      take();
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing ).");
      return value;
    }
    if (/^[A-Za-z_]/.test(token)) {
      const name = take().toUpperCase();
      if (take() !== "(") throw new Error(`${name} needs parentheses.`);
      const args: Value[] = [];
      if (peek() !== ")") {
        args.push(parseExpression());
        while (peek() === ",") {
          take();
          args.push(parseExpression());
        }
      }
      if (take() !== ")") throw new Error(`Missing ) after ${name}.`);
      if (name === "IF") {
        if (args.length !== 3) throw new Error("IF needs three values.");
        return args[0] ? args[1] : args[2];
      }
      if (name === "ROUND") {
        const digits = args[1] ?? 0;
        if (args[0] === null || digits === null) return null;
        const factor = 10 ** Math.trunc(digits);
        return Math.round(args[0] * factor) / factor;
      }
      if (name === "DATEDIFF") {
        if (args[0] === null || args[1] === null) return null;
        return args[0] - args[1];
      }
      throw new Error(`${name} is not a supported function.`);
    }
    if (token.startsWith("{")) {
      take();
      const title = token.slice(1, -1).trim();
      const raw = lookup(title);
      if (raw === null || raw === "") return null;
      if (typeof raw === "number") return raw;
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return numeric;
      const date = Date.parse(`${raw}T12:00:00`);
      if (!Number.isNaN(date)) return Math.floor(date / 86400000);
      return null;
    }
    if (/^\d/.test(token)) {
      take();
      return Number(token);
    }
    throw new Error(`Cannot read “${token || "end"}”.`);
  }

  try {
    const value = parseExpression();
    if (index < tokens.length) throw new Error(`Unexpected “${peek()}”.`);
    if (value === null) return "";
    return value;
  } catch (error) {
    return error instanceof Error ? error.message : "Formula error.";
  }
}
