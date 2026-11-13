import test from "node:test";
import assert from "node:assert/strict";
import { filterPeople, peopleCsv } from "../src/utils/peopleHub.js";

const people = [
  { full_name: "Asha Singh", work_email: "asha@example.com", department: "Engineering", job_title: "Developer", employment_status: "Active", invited_at: "2026-01-01" },
  { full_name: "Ravi Kumar", work_email: "ravi@example.com", department: "Sales", manager_name: "Neha", employment_status: "Inactive" },
];

test("people directory searches across useful employee fields and filters status", () => {
  assert.deepEqual(filterPeople(people, "engineering", "Active"), [people[0]]);
  assert.deepEqual(filterPeople(people, "neha", "All"), [people[1]]);
  assert.deepEqual(filterPeople(people, "asha", "Inactive"), []);
});

test("people CSV safely quotes values and reports portal onboarding", () => {
  const csv = peopleCsv([{ ...people[0], full_name: 'Singh, "Asha"' }]);
  assert.match(csv, /"Singh, ""Asha"""/);
  assert.match(csv, /"Invited"/);
  assert.match(csv, /"Portal access"/);
});
