import assert from "node:assert/strict";
import { test } from "node:test";
import { createMapLinkResolver } from "../../src/features/events/services/map-link-resolver.js";

const PLACE = "https://www.google.com/maps/place/Casa+Piedra/data=!4m2!3m1!1s0x0:0x1!3d-33.39!4d-70.59?g_st=iw";

/** @param {Record<string, string | null>} redirects */
function fakeFetch(redirects) {
  const calls = /** @type {string[]} */ ([]);
  const fetchImpl = /** @type {typeof fetch} */ (
    async (input) => {
      const url = String(input);
      calls.push(url);
      if (!(url in redirects)) throw new Error("sin red");
      const location = redirects[url];
      return new Response(null, { status: location ? 302 : 200, headers: location ? { location } : {} });
    }
  );
  return { fetchImpl, calls };
}

const quiet = { warn() {} };

test("resuelve el enlace corto y lo recuerda", async () => {
  const { fetchImpl, calls } = fakeFetch({ "https://maps.app.goo.gl/abc": PLACE });
  const resolver = createMapLinkResolver({ fetchImpl, logger: quiet });
  assert.equal(await resolver.resolve("https://maps.app.goo.gl/abc"), PLACE);
  assert.equal(await resolver.resolve("https://maps.app.goo.gl/abc"), PLACE);
  assert.equal(calls.length, 1);
});

test("un enlace largo no sale a la red", async () => {
  const { fetchImpl, calls } = fakeFetch({});
  const resolver = createMapLinkResolver({ fetchImpl, logger: quiet });
  assert.equal(await resolver.resolve(PLACE), PLACE);
  assert.equal(calls.length, 0);
});

test("pasa por la página de consentimiento de Google", async () => {
  const consent = `https://consent.google.com/ml?continue=${encodeURIComponent(PLACE)}`;
  const { fetchImpl } = fakeFetch({ "https://maps.app.goo.gl/eu": consent });
  const resolver = createMapLinkResolver({ fetchImpl, logger: quiet });
  assert.equal(await resolver.resolve("https://maps.app.goo.gl/eu"), PLACE);
});

test("no sigue redirecciones fuera de Google ni falla si no hay red", async () => {
  const { fetchImpl } = fakeFetch({ "https://maps.app.goo.gl/raro": "https://evil.example/maps" });
  const resolver = createMapLinkResolver({ fetchImpl, logger: quiet });
  assert.equal(await resolver.resolve("https://maps.app.goo.gl/raro"), null);
  assert.equal(await resolver.resolve("https://maps.app.goo.gl/sin-red"), null);
});
