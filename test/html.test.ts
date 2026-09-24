import { describe, expect, it } from "vitest";
import { escapeHtml, html, safe } from "../src/lib/html";

describe("html", () => {
  it("escapes interpolated values", () => {
    const rendered = html`<p>${'<script>alert("x")</script>'}</p>`;
    expect(rendered.value).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });

  it("renders null and undefined as empty", () => {
    expect(html`a${null}b${undefined}c`.value).toBe("abc");
  });

  it("passes SafeHtml through unescaped", () => {
    expect(html`<div>${safe("<b>ok</b>")}</div>`.value).toBe("<div><b>ok</b></div>");
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeHtml(`a&b'c"d`)).toBe("a&amp;b&#39;c&quot;d");
  });

  it("joins an array of SafeHtml without escaping", () => {
    const rows = [safe("<tr>1</tr>"), safe("<tr>2</tr>")];
    expect(html`<table>${rows}</table>`.value).toBe("<table><tr>1</tr><tr>2</tr></table>");
  });

  it("escapes array items that are not SafeHtml", () => {
    expect(html`${["<b>", "<i>"]}`.value).toBe("&lt;b&gt;&lt;i&gt;");
  });
});
