import type { BindingContext } from './types';

// --- Path resolution ---

function getByPath(obj: any, path: string): any {
  if (obj == null) return undefined;
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

function resolveRootPath(expr: string, ctx: BindingContext): any {
  const trimmed = expr.trim();

  if (trimmed === '$data') return ctx.$data;
  if (trimmed === '$item') return ctx.$item;
  if (trimmed === '$index') return ctx.$index;
  if (trimmed === '$env') return ctx.$env;
  if (trimmed === '$sources') return ctx.$sources;
  if (trimmed === '$props') return ctx.$props;
  if (trimmed === '$layout') return ctx.$layout;
  if (trimmed === '$computed') return ctx.$computed;

  if (trimmed.startsWith('$data.')) return getByPath(ctx.$data, trimmed.slice(6));
  if (trimmed.startsWith('$item.')) return getByPath(ctx.$item, trimmed.slice(6));
  if (trimmed.startsWith('$env.')) return getByPath(ctx.$env, trimmed.slice(5));
  if (trimmed.startsWith('$sources.')) return getByPath(ctx.$sources, trimmed.slice(9));
  if (trimmed.startsWith('$props.')) return getByPath(ctx.$props, trimmed.slice(7));
  if (trimmed.startsWith('$layout.')) return getByPath(ctx.$layout, trimmed.slice(8));
  if (trimmed.startsWith('$computed.')) return getByPath(ctx.$computed, trimmed.slice(10));
  if (trimmed.startsWith('$data[')) return getByPath(ctx, trimmed.slice(1));

  return undefined;
}

// --- Tokenization helpers ---

function isQuoted(s: string): boolean {
  return (s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'));
}

function unquote(s: string): string {
  if (isQuoted(s)) return s.slice(1, -1);
  return s;
}

function findUnquoted(expr: string, target: string): number {
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  for (let i = 0; i <= expr.length - target.length; i++) {
    const ch = expr[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (depth > 0) continue;
    if (expr.substring(i, i + target.length) === target) return i;
  }
  return -1;
}

// --- Expression resolution cascade ---

function resolveExpression(expr: string, ctx: BindingContext): any {
  return resolveTernary(expr.trim(), ctx);
}

function resolveTernary(expr: string, ctx: BindingContext): any {
  const qPos = findUnquoted(expr, '?');
  if (qPos === -1) return resolveOr(expr, ctx);

  const rest = expr.slice(qPos + 1);
  const cPos = findUnquoted(rest, ':');
  if (cPos === -1) return resolveOr(expr, ctx);

  const condition = expr.slice(0, qPos).trim();
  const thenExpr = rest.slice(0, cPos).trim();
  const elseExpr = rest.slice(cPos + 1).trim();

  const condVal = resolveOr(condition, ctx);
  return condVal ? resolvePrimitive(thenExpr, ctx) : resolvePrimitive(elseExpr, ctx);
}

function resolveOr(expr: string, ctx: BindingContext): any {
  const pos = findUnquoted(expr, '||');
  if (pos === -1) return resolveComparison(expr, ctx);

  const left = resolveComparison(expr.slice(0, pos).trim(), ctx);
  if (left) return left;
  return resolvePrimitive(expr.slice(pos + 2).trim(), ctx);
}

function resolveComparison(expr: string, ctx: BindingContext): any {
  const ops: [string, (a: any, b: any) => boolean][] = [
    ['!==', (a, b) => a !== b],
    ['===', (a, b) => a === b],
    ['>=', (a, b) => a >= b],
    ['<=', (a, b) => a <= b],
    ['>', (a, b) => a > b],
    ['<', (a, b) => a < b],
  ];

  for (const [op, fn] of ops) {
    const pos = findUnquoted(expr, op);
    if (pos !== -1) {
      const left = resolveMath(expr.slice(0, pos).trim(), ctx);
      const right = resolveMath(expr.slice(pos + op.length).trim(), ctx);
      return fn(left, right);
    }
  }

  return resolveMath(expr, ctx);
}

function resolveMath(expr: string, ctx: BindingContext): any {
  // Handle + and - (lowest precedence, left-to-right)
  // But skip if it's a negative sign at the start
  for (let i = expr.length - 1; i > 0; i--) {
    const ch = expr[i];
    if (ch !== '+' && ch !== '-') continue;
    // Check it's not inside parens or quotes
    if (findUnquoted(expr.slice(0, i) + '☐' + expr.slice(i + 1), '☐') !== i) continue;
    // Check it's not an operator sign (e.g., after another operator)
    const prevCh = expr[i - 1]?.trim();
    if (!prevCh || '+-*/%('.includes(prevCh)) continue;

    const left = resolveMath(expr.slice(0, i).trim(), ctx);
    const right = resolveMulDiv(expr.slice(i + 1).trim(), ctx);
    if (typeof left === 'number' && typeof right === 'number') {
      return ch === '+' ? left + right : left - right;
    }
    // String concatenation for +
    if (ch === '+') return String(left ?? '') + String(right ?? '');
    return resolveUnary(expr, ctx);
  }

  return resolveMulDiv(expr, ctx);
}

function resolveMulDiv(expr: string, ctx: BindingContext): any {
  const ops = ['*', '/', '%'];
  for (let i = expr.length - 1; i > 0; i--) {
    const ch = expr[i];
    if (!ops.includes(ch)) continue;
    if (findUnquoted(expr.slice(0, i) + '☐' + expr.slice(i + 1), '☐') !== i) continue;

    const left = resolveMulDiv(expr.slice(0, i).trim(), ctx);
    const right = resolveUnary(expr.slice(i + 1).trim(), ctx);
    const l = Number(left);
    const r = Number(right);
    if (!isFinite(l) || !isFinite(r)) return 0;
    if (ch === '*') return l * r;
    if (ch === '/') return r === 0 ? 0 : l / r;
    if (ch === '%') return r === 0 ? 0 : l % r;
  }

  return resolveUnary(expr, ctx);
}

function resolveUnary(expr: string, ctx: BindingContext): any {
  const trimmed = expr.trim();

  // Negation: -(expr)
  if (trimmed.startsWith('-(') && trimmed.endsWith(')')) {
    const inner = resolveExpression(trimmed.slice(2, -1), ctx);
    return typeof inner === 'number' ? -inner : 0;
  }
  // Negative sign: -$data.x
  if (trimmed.startsWith('-$')) {
    const inner = resolveExpression(trimmed.slice(1), ctx);
    return typeof inner === 'number' ? -inner : 0;
  }
  // Negative number
  if (trimmed.startsWith('-') && !isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Math.xxx(args)
  const mathMatch = trimmed.match(/^Math\.(max|min|round|floor|ceil|abs)\((.+)\)$/);
  if (mathMatch) {
    const fn = mathMatch[1] as 'max' | 'min' | 'round' | 'floor' | 'ceil' | 'abs';
    const argsStr = mathMatch[2];
    // Split args on comma, but respect parens
    const args: number[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < argsStr.length; i++) {
      const ch = argsStr[i];
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        args.push(Number(resolveExpression(current.trim(), ctx)) || 0);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) args.push(Number(resolveExpression(current.trim(), ctx)) || 0);

    switch (fn) {
      case 'max': return Math.max(...args);
      case 'min': return Math.min(...args);
      case 'round': return Math.round(args[0] ?? 0);
      case 'floor': return Math.floor(args[0] ?? 0);
      case 'ceil': return Math.ceil(args[0] ?? 0);
      case 'abs': return Math.abs(args[0] ?? 0);
    }
  }

  // Parenthesized expression
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return resolveExpression(trimmed.slice(1, -1), ctx);
  }

  return resolvePrimitive(trimmed, ctx);
}

function resolvePrimitive(expr: string, ctx: BindingContext): any {
  const trimmed = expr.trim();
  if (trimmed === '') return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (isQuoted(trimmed)) return unquote(trimmed);
  if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
  if (trimmed.startsWith('$')) return resolveRootPath(trimmed, ctx);
  return trimmed;
}

// --- Public API ---

export function resolveValue(value: any, ctx: BindingContext): any {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) return value.map(v => resolveValue(v, ctx));

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      result[key] = resolveValue(value[key], ctx);
    }
    return result;
  }

  if (typeof value !== 'string') return value;

  // Template literal: "${$env.baseUrl}/path/${$item.code}.jpg"
  if (value.includes('${')) {
    return value.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const resolved = resolveExpression(expr, ctx);
      return resolved != null ? String(resolved) : '';
    });
  }

  // Binding expression: "$data.rates" or "$index % 2 === 0 ? '#fff' : '#f4f'"
  if (value.startsWith('$') || value.includes('$')) {
    // Check if it contains operators — if so, it's a complex expression
    if (/[?|<>=!+\-*/%]/.test(value) || value.includes('Math.')) {
      return resolveExpression(value, ctx);
    }
    // Simple path
    const result = resolveRootPath(value, ctx);
    return result;
  }

  return value;
}

export function resolveStyle(
  style: Record<string, any> | undefined,
  ctx: BindingContext,
): Record<string, any> | undefined {
  if (!style) return undefined;
  const resolved: Record<string, any> = {};
  for (const key of Object.keys(style)) {
    resolved[key] = resolveValue(style[key], ctx);
  }
  return resolved;
}

export function resolveProps(
  props: Record<string, any> | undefined,
  ctx: BindingContext,
): Record<string, any> | undefined {
  if (!props) return undefined;
  return resolveValue(props, ctx) as Record<string, any>;
}

export function evaluateCondition(expr: string, ctx: BindingContext): boolean {
  const result = resolveExpression(expr, ctx);
  return !!result;
}
