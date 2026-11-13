const text = (value) => String(value || "").toLowerCase();

export function filterPeople(employees, query = "", status = "All") {
  const needle = text(query).trim();
  return employees.filter((employee) => {
    const matchesStatus = status === "All" || employee.employment_status === status;
    const haystack = [employee.full_name, employee.work_email, employee.mobile, employee.job_title, employee.department, employee.manager_name]
      .map(text)
      .join(" ");
    return matchesStatus && (!needle || haystack.includes(needle));
  });
}

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function peopleCsv(employees) {
  const headings = ["Name", "Work email", "Mobile", "Job title", "Department", "Employment type", "Status", "Manager", "Joining date", "Portal access"];
  const rows = employees.map((employee) => [
    employee.full_name,
    employee.work_email,
    employee.mobile,
    employee.job_title,
    employee.department,
    employee.employment_type,
    employee.employment_status,
    employee.manager_name,
    employee.joining_date ? String(employee.joining_date).slice(0, 10) : "",
    employee.last_login_at ? "Activated" : employee.invited_at ? "Invited" : "Not invited",
  ]);
  return [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function attendanceHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "—";
  const milliseconds = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  return `${(milliseconds / 3600000).toFixed(2)} hrs`;
}

export function filterAttendance(rows, query = "", workDate = "") {
  const needle = text(query).trim();
  return rows.filter((row) => {
    const matchesDate = !workDate || String(row.work_date || "").slice(0, 10) === workDate;
    const haystack = [row.full_name, row.department, row.shift_name, row.status].map(text).join(" ");
    return matchesDate && (!needle || haystack.includes(needle));
  });
}

export function attendanceCsv(rows) {
  const headings = ["Employee", "Department", "Date", "Shift", "Status", "Check in", "Check out", "Hours worked"];
  const rowsForCsv = rows.map((row) => [
    row.full_name,
    row.department,
    String(row.work_date || "").slice(0, 10),
    row.shift_name || "No shift",
    row.status,
    row.check_in ? new Date(row.check_in).toLocaleString("en-IN") : "",
    row.check_out ? new Date(row.check_out).toLocaleString("en-IN") : "",
    attendanceHours(row.check_in, row.check_out),
  ]);
  return [headings, ...rowsForCsv].map((row) => row.map(csvCell).join(",")).join("\n");
}
