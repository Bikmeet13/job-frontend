import { test } from "node:test";
import assert from "node:assert/strict";
import visibility from "../backend/services/applicationVisibility.js";

test("super admins receive all applications without a candidate ownership filter", async () => {
  let call;
  const db = { query: async (sql, params) => { call = { sql, params }; return { rows: [{ id: 1 }] }; } };
  const rows = await visibility.getVisibleApplications(db, { id: 99, email: "admin@example.com", role: "superadmin" });
  assert.deepEqual(rows, [{ id: 1 }]);
  assert.doesNotMatch(call.sql, /candidate_user_id = \$1/);
  assert.equal(call.params, undefined);
});

test("candidate application lists remain restricted to the authenticated owner", async () => {
  let call;
  const db = { query: async (sql, params) => { call = { sql, params }; return { rows: [{ id: 2 }] }; } };
  await visibility.getVisibleApplications(db, { id: 8, email: "candidate@example.com", role: "user" });
  assert.match(call.sql, /candidate_user_id = \$1/);
  assert.match(call.sql, /candidate_user_id IS NULL/);
  assert.deepEqual(call.params, [8, "candidate@example.com"]);
});
