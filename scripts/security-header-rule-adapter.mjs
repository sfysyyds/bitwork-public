import { readFile } from "node:fs/promises";

const rulePath = new URL("../cloudflare/response-header-transform-rule.json", import.meta.url);
export const responseHeaderRule = JSON.parse(await readFile(rulePath, "utf8"));
const match = /^\(http\.host eq "([^"]+)" and ssl\)$/.exec(responseHeaderRule.expression);
if (!match) throw new Error(`Unsupported response rule expression: ${responseHeaderRule.expression}`);
const [, expectedHost] = match;

export function applyResponseHeaderRule(response, { host, ssl }) {
  if (!responseHeaderRule.enabled || host !== expectedHost || ssl !== true) return response;
  const headers = new Headers(response.headers);
  for (const [name, setting] of Object.entries(responseHeaderRule.action_parameters.headers)) {
    if (setting.operation !== "set" || typeof setting.value !== "string") throw new Error(`Unsupported header operation for ${name}`);
    headers.set(name, setting.value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
