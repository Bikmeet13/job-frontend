import test from "node:test";
import assert from "node:assert/strict";
import { attendanceCsv, attendanceHours, filterAttendance, filterPeople, peopleCsv } from "../src/utils/peopleHub.js";

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

test("attendance filtering supports employee details and exact work dates", () => {
  const rows = [
    { full_name: "Asha Singh", department: "Engineering", work_date: "2026-11-13T00:00:00.000Z", shift_name: "General" },
    { full_name: "Ravi Kumar", department: "Sales", work_date: "2026-11-12T00:00:00.000Z", shift_name: "Evening" },
  ];
  assert.deepEqual(filterAttendance(rows, "engineering", "2026-11-13"), [rows[0]]);
  assert.deepEqual(filterAttendance(rows, "evening", "2026-11-13"), []);
});

test("attendance export calculates worked hours and handles open shifts", () => {
  assert.equal(attendanceHours("2026-11-13T09:00:00Z", "2026-11-13T17:30:00Z"), "8.50 hrs");
  assert.equal(attendanceHours("2026-11-13T09:00:00Z", null), "—");
  const csv = attendanceCsv([{ full_name: "Asha", work_date: "2026-11-13", check_in: "2026-11-13T09:00:00Z", check_out: "2026-11-13T17:30:00Z" }]);
  assert.match(csv, /"8.50 hrs"/);
});
