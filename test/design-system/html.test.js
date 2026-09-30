import assert from "node:assert/strict";
import test from "node:test";
import { SafeHtml, attrs, cx, escapeHtml, html, raw, toHtml } from "../../src/design-system/utils/html.js";

test("html escapa valores interpolados", () => {
  const out = html`<p title="${'"x" & <y>'}">${"<script>alert(1)</script>"}</p>`;
  assert.ok(out instanceof SafeHtml);
  assert.equal(String(out), '<p title="&quot;x&quot; &amp; &lt;y&gt;">&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test("html no re-escapa componentes ni raw()", () => {
  const inner = html`<b>${"a<b"}</b>`;
  assert.equal(String(html`<p>${inner}${raw("<i>ok</i>")}</p>`), "<p><b>a&lt;b</b><i>ok</i></p>");
});

test("html ignora null, undefined y booleanos; aplana arrays", () => {
  assert.equal(String(html`${null}${undefined}${false}${true}${["a", html`<br>`, 0]}`), "a<br>0");
});

test("attrs omite falsy, emite booleanos y descarta nombres inválidos", () => {
  assert.equal(String(attrs({ id: "x", hidden: true, disabled: false, "data-a": 0, "on click": "no", title: null })), ' id="x" hidden data-a="0"');
});

test("cx combina strings y mapas condicionales", () => {
  assert.equal(cx("a", false, null, { b: true, c: false }, "d"), "a b d");
});

test("escapeHtml y toHtml", () => {
  assert.equal(escapeHtml(`'`), "&#39;");
  assert.equal(toHtml([html`<a>`, "<"]), "<a>&lt;");
});
