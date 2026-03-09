export interface SanitizeTextOptions {
  trim?: boolean;
  collapseWhitespace?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  maxLength?: number;
}

function stripControlChars(value: string) {
  let next = '';

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const isVisibleAscii = code >= 32 && code !== 127;
    const isCommonWhitespace = code === 9 || code === 10 || code === 13;

    if (isVisibleAscii || isCommonWhitespace) {
      next += value[index];
    }
  }

  return next;
}

export function sanitizeText(value: unknown, options: SanitizeTextOptions = {}): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trim = options.trim !== false;
  const collapseWhitespace = options.collapseWhitespace === true;
  const lowercase = options.lowercase === true;
  const uppercase = options.uppercase === true;
  const maxLength =
    typeof options.maxLength === 'number' && Number.isFinite(options.maxLength) && options.maxLength > 0
      ? Math.floor(options.maxLength)
      : null;

  let next = stripControlChars(value);

  if (trim) {
    next = next.trim();
  }

  if (collapseWhitespace) {
    next = next.replace(/\s+/g, ' ');
  }

  if (lowercase) {
    next = next.toLowerCase();
  }

  if (uppercase) {
    next = next.toUpperCase();
  }

  if (maxLength !== null && next.length > maxLength) {
    next = next.slice(0, maxLength);
  }

  return next.length ? next : undefined;
}

export function sanitizeNullableText(value: unknown, options: SanitizeTextOptions = {}) {
  return sanitizeText(value, options) ?? null;
}

export function sanitizeUnknownDeep<T>(input: T, maxDepth = 8): T {
  if (maxDepth <= 0) {
    return input;
  }

  if (typeof input === 'string') {
    return (sanitizeText(input) ?? '') as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUnknownDeep(item, maxDepth - 1)) as T;
  }

  if (input && typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>);
    const sanitized = Object.fromEntries(
      entries.map(([key, value]) => [key, sanitizeUnknownDeep(value, maxDepth - 1)]),
    );
    return sanitized as T;
  }

  return input;
}

export async function readSanitizedJsonBody(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return null;
  }

  return sanitizeUnknownDeep(body);
}
