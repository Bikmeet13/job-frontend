import { test } from "node:test";
import assert from "node:assert/strict";
import delivery from "../backend/services/emailDelivery.js";

const { sendEmailOrThrow } = delivery;

test("email delivery returns the accepted provider message", async () => {
  const resend = { emails: { send: async () => ({ data: { id: "email-123" }, error: null }) } };
  assert.deepEqual(await sendEmailOrThrow(resend, { to: "person@example.test" }), { id: "email-123" });
});

test("email delivery rejects SDK error responses that do not throw", async () => {
  const resend = { emails: { send: async () => ({ data: null, error: { name: "validation_error", message: "Invalid recipient" } }) } };
  await assert.rejects(() => sendEmailOrThrow(resend, {}), { code: "validation_error", message: "Invalid recipient" });
});

test("email delivery rejects responses without a provider message ID", async () => {
  const resend = { emails: { send: async () => ({ data: {}, error: null }) } };
  await assert.rejects(() => sendEmailOrThrow(resend, {}), { code: "EMAIL_NOT_ACCEPTED" });
});
