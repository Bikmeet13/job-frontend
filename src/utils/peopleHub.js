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
