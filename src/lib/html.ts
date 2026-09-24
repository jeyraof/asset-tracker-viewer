export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/** Marks an already-escaped string so `html` interpolates it without re-escaping. */
export function safe(value: string): SafeHtml {
  return new SafeHtml(value);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined) return "";
  return escapeHtml(value);
}

/** Tagged template that escapes interpolated values (SafeHtml is passed through). */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  const rendered = strings.reduce(
    (output, chunk, index) => output + chunk + (index < values.length ? render(values[index]) : ""),
    "",
  );
  return new SafeHtml(rendered);
}
