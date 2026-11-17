import assert from "node:assert/strict";
import { applyResponseHeaderRule, responseHeaderRule } from "./security-header-rule-adapter.mjs";

const requestContext = { host: "bitwork.top", ssl: true };
const upstream = new Response("upstream", {
  status: 200,
  headers: { "Content-Type": "text/html", "X-Origin": "pages", "Cache-Control": "public, max-age=3600" },
});
const response = applyResponseHeaderRule(upstream, requestContext);
const csp = response.headers.get("Content-Security-Policy");
const directives = Object.fromEntries(csp.split(";").map(part => {
  const [name, ...values] = part.trim().split(/\s+/);
  return [name, values];
}));

assert.equal(responseHeaderRule.action, "rewrite");
assert.equal(responseHeaderRule.expression, '(http.host eq "bitwork.top" and ssl)');
assert.deepEqual(directives["script-src"], ["'self'"]);
assert.deepEqual(directives["style-src"], ["'self'"]);
assert.deepEqual(directives["style-src-attr"], ["'unsafe-inline'"]);
assert.deepEqual(directives["object-src"], ["'none'"]);
assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=31536000");
assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(response.headers.get("X-Frame-Options"), "DENY");
assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(response.headers.get("X-Origin"), "pages");
assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
assert.equal(await response.text(), "upstream");

for (const context of [
  { host: "www.bitwork.top", ssl: true },
  { host: "work.bitwork.top", ssl: true },
  { host: "bitwork.top", ssl: false },
]) {
  const untouched = applyResponseHeaderRule(new Response("unchanged"), context);
  assert.equal(untouched.headers.has("Content-Security-Policy"), false, JSON.stringify(context));
  assert.equal(await untouched.text(), "unchanged");
}

for (const [upstreamResponse, expectedBody] of [
  [new Response("not found", { status: 404 }), "not found"],
  [new Response(null, { status: 302, headers: { Location: "https://bitwork.top/" } }), ""],
  [new Response("upstream failed", { status: 502 }), "upstream failed"],
]) {
  const result = applyResponseHeaderRule(upstreamResponse, requestContext);
  assert.equal(result.status, upstreamResponse.status);
  assert.equal(result.headers.get("Content-Security-Policy"), csp);
  assert.equal(result.headers.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(result.headers.get("Location"), upstreamResponse.headers.get("Location"));
  assert.equal(await result.text(), expectedBody);
}
console.log("Cloudflare response-header JSON rule simulation passed (exact host/scheme, status/body/cache/redirect preserved; error headers covered).");
