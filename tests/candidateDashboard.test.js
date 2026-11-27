import { test } from "node:test";
import assert from "node:assert/strict";
import dashboard from "../backend/services/candidateDashboard.js";

test("candidate dashboard counts applications by authenticated user ID", async () => {
  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ count: calls.length === 1 ? 2 : 1 }] };
    },
  };

  const stats = await dashboard.getCandidateDashboardStats(db, { id: 8, email: "current@example.com" });

  assert.deepEqual(stats, { saved: 2, applied: 1 });
  assert.match(calls[1].sql, /candidate_user_id = \$1/);
  assert.match(calls[1].sql, /candidate_user_id IS NULL/);
  assert.deepEqual(calls[1].params, [8, "current@example.com"]);
});

test("candidate dashboard returns numeric zeroes", async () => {
  const db = { query: async () => ({ rows: [{ count: "0" }] }) };
  assert.deepEqual(await dashboard.getCandidateDashboardStats(db, { id: 9, email: "new@example.com" }), { saved: 0, applied: 0 });
});
