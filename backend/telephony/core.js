const crypto = require("crypto");

const DISPOSITIONS = Object.freeze(["Connected", "Interested", "Follow-up required", "Call back later", "No answer", "Busy", "Switched off", "Not interested", "Wrong number", "Do not call", "Escalated", "Converted", "Other"]);
const FINAL_STATUSES = new Set(["completed", "busy", "no-answer", "failed", "cancelled"]);
const STATUS_ORDER = Object.freeze({ queued: 0, ringing: 1, answered: 2, completed: 3, busy: 3, "no-answer": 3, failed: 3, cancelled: 3 });
const DEFAULT_CAPABILITIES = Object.freeze(["place_calls", "view_own_calls"]);
const MANAGER_CAPABILITIES = Object.freeze(["place_calls", "view_own_calls", "view_team_calls", "reassign_followups"]);
const ADMIN_CAPABILITIES = Object.freeze(["place_calls", "view_own_calls", "view_team_calls", "view_all_calls", "listen_recordings", "export_reports", "manage_telephony_settings", "reverse_do_not_call", "view_provider_costs", "reassign_followups"]);

function capabilitiesFor(actor, explicit = []) {
  if (["admin", "superadmin"].includes(actor?.role)) return new Set(ADMIN_CAPABILITIES);
  const defaults = actor?.isManager ? MANAGER_CAPABILITIES : DEFAULT_CAPABILITIES;
  return new Set([...defaults, ...explicit]);
}

function canAccessLead(actor, lead, capability, explicit = []) {
  const caps = capabilitiesFor(actor, explicit);
  if (!caps.has(capability)) return false;
  if (caps.has("view_all_calls") || actor?.role === "superadmin") return true;
  if (lead?.assigned_employee_id === actor?.employeeId) return true;
  return caps.has("view_team_calls") && actor?.team && lead?.assigned_team === actor.team;
}

function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Not available";
  return `${digits.length > 10 ? "+" : ""}${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function withinCallingHours(now, start = "09:00", end = "19:00", timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const current = Number(parts.find((p) => p.type === "hour").value) * 60 + Number(parts.find((p) => p.type === "minute").value);
  const toMinutes = (value) => { const [hour, minute] = String(value).split(":").map(Number); return hour * 60 + minute; };
  return current >= toMinutes(start) && current <= toMinutes(end);
}

function canTransition(from, to) {
  if (!Object.hasOwn(STATUS_ORDER, to) || FINAL_STATUSES.has(from)) return false;
  return STATUS_ORDER[to] >= (STATUS_ORDER[from] ?? -1);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || "")); const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhookToken(received, expected) { return Boolean(expected) && safeEqual(received, expected); }

function providerEventId(payload = {}) {
  const callId = String(payload.CallSid || payload.Sid || "");
  const type = String(payload.EventType || payload.Status || "unknown").toLowerCase();
  return String(payload.EventSid || payload.EventId || `${callId}:${type}:${payload.EventTime || payload.DateUpdated || ""}`);
}

function isRapidDuplicate(lastAttemptAt, now = Date.now(), windowMs = 30000) { return Boolean(lastAttemptAt) && now - lastAttemptAt < windowMs; }

function normalizeFollowUp(input, fallbackEmployeeId, fallbackReason) {
  if (!input?.dueAt) return null;
  return { dueAt: input.dueAt, reason: String(input.reason || fallbackReason || "Follow-up").trim(), priority: ["Low", "Medium", "High", "Urgent"].includes(input.priority) ? input.priority : "Medium", reminderAt: input.reminderAt || null, assignedEmployeeId: Number(input.assignedEmployeeId) || fallbackEmployeeId };
}

function redact(value) {
  const blocked = /(authorization|api[_-]?key|api[_-]?token|password|secret|credential|cvv|pin|otp)/i;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blocked.test(key) ? "[REDACTED]" : redact(item)]));
  return value;
}

function encryptPhone(phone, keyMaterial) {
  if (!keyMaterial) throw new Error("TELEPHONY_DATA_KEY is required before client numbers can be stored.");
  const key = crypto.createHash("sha256").update(keyMaterial).digest(); const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const ciphertext = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), hash: crypto.createHmac("sha256", key).update(phone).digest("hex"), last4: phone.replace(/\D/g, "").slice(-4) };
}

function decryptPhone(record, keyMaterial) {
  const key = crypto.createHash("sha256").update(keyMaterial).digest(); const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.phone_iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.phone_tag, "base64")); return Buffer.concat([decipher.update(Buffer.from(record.phone_ciphertext, "base64")), decipher.final()]).toString("utf8");
}

module.exports = { ADMIN_CAPABILITIES, DISPOSITIONS, FINAL_STATUSES, capabilitiesFor, canAccessLead, canTransition, decryptPhone, encryptPhone, isRapidDuplicate, maskPhone, normalizeFollowUp, providerEventId, redact, verifyWebhookToken, withinCallingHours };
