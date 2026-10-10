import { test } from "node:test";
import assert from "node:assert/strict";
import core from "../backend/telephony/core.js";
import adapters from "../backend/telephony/adapters.js";

const { capabilitiesFor, canAccessLead, canTransition, decryptPhone, encryptPhone, isRapidDuplicate, maskPhone, normalizeFollowUp, providerEventId, redact, verifyWebhookToken, withinCallingHours } = core;
const { DisabledTelephonyAdapter, ExotelTelephonyAdapter } = adapters;

test("assignment-based calling denies another employee's client", () => {
  assert.equal(canAccessLead({ role: "marketlence_employee", employeeId: 7 }, { assigned_employee_id: 8 }, "place_calls"), false);
  assert.equal(canAccessLead({ role: "marketlence_employee", employeeId: 7 }, { assigned_employee_id: 7 }, "place_calls"), true);
});

test("manager visibility is limited to the same team", () => {
  const actor = { role: "marketlence_employee", employeeId: 7, team: "Sales", isManager: true };
  assert.equal(canAccessLead(actor, { assigned_employee_id: 8, assigned_team: "Sales" }, "view_team_calls"), true);
  assert.equal(canAccessLead(actor, { assigned_employee_id: 9, assigned_team: "Support" }, "view_team_calls"), false);
});

test("disabled provider never simulates a call", async () => {
  await assert.rejects(() => new DisabledTelephonyAdapter().startCall(), { code: "TELEPHONY_DISABLED" });
});

test("Exotel request creates an employee-to-client bridge with callbacks", async () => {
  let request;
  const axios = { post: async (...args) => { request = args; return { data: { Call: { Sid: "call-1", Status: "queued" } } }; } };
  const adapter = new ExotelTelephonyAdapter({ axios, accountSid: "sid", apiKey: "key", apiToken: "token", businessNumber: "+91123", callbackUrl: "https://api.test/webhook", recordingEnabled: false });
  const result = await adapter.startCall({ employeeNumber: "+919900", clientNumber: "+918800", callId: 42 });
  assert.equal(result.providerCallId, "call-1");
  assert.match(request[1], /From=%2B919900/); assert.match(request[1], /To=%2B918800/); assert.match(request[1], /CallerId=%2B91123/); assert.match(request[1], /StatusCallback=/); assert.match(request[1], /Record=false/);
  assert.deepEqual(request[2].auth, { username: "key", password: "token" });
});

test("invalid webhook tokens are rejected with constant-time comparison", () => {
  assert.equal(verifyWebhookToken("wrong", "correct"), false);
  assert.equal(verifyWebhookToken("correct", "correct"), true);
  assert.equal(verifyWebhookToken("", ""), false);
});

test("webhook retry IDs are stable for idempotent database inserts", () => {
  const payload = { CallSid: "call-7", EventType: "answered", EventTime: "2026-01-01T10:00:00Z" };
  assert.equal(providerEventId(payload), providerEventId({ ...payload }));
  assert.notEqual(providerEventId(payload), providerEventId({ ...payload, EventType: "completed" }));
});

test("webhook status transitions cannot regress or leave a final state", () => {
  assert.equal(canTransition("queued", "ringing"), true);
  assert.equal(canTransition("ringing", "answered"), true);
  assert.equal(canTransition("answered", "completed"), true);
  assert.equal(canTransition("answered", "ringing"), false);
  assert.equal(canTransition("completed", "answered"), false);
});

test("do-not-call requires the dedicated reversal capability", () => {
  assert.equal(capabilitiesFor({ role: "marketlence_employee" }).has("reverse_do_not_call"), false);
  assert.equal(capabilitiesFor({ role: "superadmin" }).has("reverse_do_not_call"), true);
});

test("calling-hour enforcement respects the configured timezone", () => {
  assert.equal(withinCallingHours(new Date("2026-01-01T06:30:00Z"), "09:00", "19:00", "Asia/Kolkata"), true);
  assert.equal(withinCallingHours(new Date("2026-01-01T18:30:00Z"), "09:00", "19:00", "Asia/Kolkata"), false);
});

test("recording and CSV export require server-side capabilities", () => {
  const employee = capabilitiesFor({ role: "marketlence_employee" });
  const admin = capabilitiesFor({ role: "admin" });
  assert.equal(employee.has("listen_recordings"), false); assert.equal(employee.has("export_reports"), false);
  assert.equal(admin.has("listen_recordings"), true); assert.equal(admin.has("export_reports"), true);
});

test("follow-up reassignment is denied by default and available to managers", () => {
  assert.equal(capabilitiesFor({ role: "marketlence_employee" }).has("reassign_followups"), false);
  assert.equal(capabilitiesFor({ role: "marketlence_employee", isManager: true }).has("reassign_followups"), true);
});

test("follow-up creation normalizes defaults and preserves assignment", () => {
  assert.deepEqual(normalizeFollowUp({ dueAt: "2026-10-12T10:00", reason: "Demo", priority: "High" }, 4, "Interested"), { dueAt: "2026-10-12T10:00", reason: "Demo", priority: "High", reminderAt: null, assignedEmployeeId: 4 });
  assert.equal(normalizeFollowUp({}, 4, "Interested"), null);
});

test("rapid duplicate calls are throttled", () => {
  assert.equal(isRapidDuplicate(1000, 20000, 30000), true);
  assert.equal(isRapidDuplicate(1000, 40000, 30000), false);
});

test("secret redaction is recursive and phone masking exposes only four digits", () => {
  assert.deepEqual(redact({ apiToken: "secret", nested: { Authorization: "Basic abc", safe: "ok" } }), { apiToken: "[REDACTED]", nested: { Authorization: "[REDACTED]", safe: "ok" } });
  assert.equal(maskPhone("+91 98765 43210"), "+••••••••3210");
});

test("client phone encryption round-trips without storing plaintext", () => {
  const encrypted = encryptPhone("+919876543210", "test-key-material");
  assert.equal(encrypted.ciphertext.includes("9876543210"), false);
  assert.equal(encrypted.last4, "3210");
  assert.equal(decryptPhone({ phone_ciphertext: encrypted.ciphertext, phone_iv: encrypted.iv, phone_tag: encrypted.tag }, "test-key-material"), "+919876543210");
});
