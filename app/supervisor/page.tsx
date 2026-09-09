// @ts-nocheck
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

function formatDuration(minutes) {
  if (minutes === 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function SupervisorPage() {
  const [user, setUser] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("employees");

  // Search & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("employee_no");
  const [sortDirection, setSortDirection] = useState("asc");

  // Date filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Add Employee Form
  const [formData, setFormData] = useState({
    employee_no: "",
    full_name: "",
    department: "",
    position: "",
  });

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "supervisor") {
        setIsSupervisor(true);
        loadData();
      } else if (profile?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/guard");
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function loadData() {
    const empRes = await fetch("/api/employees");
    const empData = await empRes.json();
    if (empData.ok) setEmployees(empData.employees);

    const logRes = await fetch("/api/logs");
    const logData = await logRes.json();
    if (logData.ok) setLogs(logData.logs);
  }

  // Search & Sort logic
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [employees, searchTerm, sortField, sortDirection]);

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    if (startDate) {
      filtered = filtered.filter(log => new Date(log.scanned_at) >= new Date(`${startDate}T00:00:00`));
    }
    if (endDate) {
      filtered = filtered.filter(log => new Date(log.scanned_at) <= new Date(`${endDate}T23:59:59`));
    }
    return filtered;
  }, [logs, startDate, endDate]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function getSortIcon(field) {
    if (sortField !== field) return " ↕";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  // Add Employee
  async function handleAddEmployee(e) {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Employee added successfully!");
      setFormData({ employee_no: "", full_name: "", department: "", position: "" });
      loadData();
    } else {
      alert("Error: " + data.error);
    }
  }

  // Export CSV
  async function handleExportCSV() {
    let url = "/api/export";
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (params.toString()) url += "?" + params.toString();
    window.open(url, "_blank");
  }

  // Export Duration Summary
  function handleExportDurations(period) {
    window.open(`/api/export-durations?period=${period}`, "_blank");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div style={styles.loadingContainer}>Loading...</div>;
  if (!isSupervisor) return null;

  return (
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>📋 Supervisor Dashboard</h1>
          <div style={{display: "flex", alignItems: "center", gap: 16}}>
            <span style={{fontSize: 12, color: "#94a3b8"}}>{user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <button style={activeTab === "employees" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("employees")}>
          👥 Employees
        </button>
        <button style={activeTab === "reports" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("reports")}>
          📊 Reports & Export
        </button>
      </nav>

      <main style={styles.mainContent}>
        {/* SEARCH BAR */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search by name, employee no, department, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={styles.clearSearchButton}>✕ Clear</button>
          )}
        </div>

        {/* EMPLOYEES TAB */}
        {activeTab === "employees" && (
          <div>
            {/* Add Employee Form */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>➕ Add New Employee</h2>
              <form onSubmit={handleAddEmployee} style={styles.form}>
                <div style={styles.formRow}>
                  <input type="text" placeholder="Employee No (e.g. EMP-005)" value={formData.employee_no} onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })} style={styles.input} required />
                  <input type="text" placeholder="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={styles.input} required />
                </div>
                <div style={styles.formRow}>
                  <input type="text" placeholder="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} style={styles.input} />
                </div>
                <button type="submit" style={styles.primaryButton}>Add Employee</button>
              </form>
            </div>

            {/* Employee List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>👥 All Employees ({filteredAndSortedEmployees.length})</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} onClick={() => handleSort("employee_no")}>No{getSortIcon("employee_no")}</th>
                      <th style={styles.th} onClick={() => handleSort("full_name")}>Name{getSortIcon("full_name")}</th>
                      <th style={styles.th} onClick={() => handleSort("department")}>Department{getSortIcon("department")}</th>
                      <th style={styles.th} onClick={() => handleSort("position")}>Position{getSortIcon("position")}</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedEmployees.map((emp) => (
                      <tr key={emp.id} style={{...styles.tr, opacity: emp.active ? 1 : 0.5}}>
                        <td style={styles.td}>{emp.employee_no}</td>
                        <td style={{...styles.td, fontWeight: "600"}}>{emp.full_name}</td>
                        <td style={styles.td}>{emp.department || "-"}</td>
                        <td style={styles.td}>{emp.position || "-"}</td>
                        <td style={styles.td}>
                          <span style={emp.active ? styles.badgeInside : styles.badgeOutside}>
                            {emp.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div>
            {/* Date Filter */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📅 Date Range Filter</h2>
              <div style={{display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center"}}>
                <div>
                  <label style={{fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4}}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
                </div>
                <div>
                  <label style={{fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4}}>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
                </div>
                <button onClick={() => { setStartDate(""); setEndDate(""); }} style={styles.cancelButton}>Reset</button>
              </div>
            </div>

            {/* Export Options */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📥 Download Reports</h2>
              <p style={{color: "#6b7280", fontSize: 14, marginBottom: 20}}>
                Select a report type to download as CSV file.
              </p>

              {/* Attendance Log Export */}
              <div style={{marginBottom: 24, padding: 20, background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd"}}>
                <h3 style={{margin: "0 0 10px 0", color: "#0369a1"}}>📜 Attendance Logs</h3>
                <p style={{margin: "0 0 15px 0", fontSize: 14, color: "#0369a1"}}>
                  Download all scan records (IN/OUT) for the selected date range.
                </p>
                <button onClick={handleExportCSV} style={styles.exportButton}>📥 Download Attendance CSV</button>
              </div>

              {/* Duration Summary Export */}
              <div style={{padding: 20, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0"}}>
                <h3 style={{margin: "0 0 10px 0", color: "#166534"}}>⏱️ Duration Summary</h3>
                <p style={{margin: "0 0 15px 0", fontSize: 14, color: "#166534"}}>
                  Download summarized inside/outside time per employee.
                </p>
                <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
                  <button onClick={() => handleExportDurations("today")} style={styles.exportButton}>📊 Today</button>
                  <button onClick={() => handleExportDurations("week")} style={{...styles.exportButton, background: "#7c3aed"}}>📊 This Week</button>
                  <button onClick={() => handleExportDurations("month")} style={{...styles.exportButton, background: "#0891b2"}}>📊 This Month</button>
                </div>
              </div>
            </div>

            {/* Recent Logs Preview */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📜 Recent Logs Preview ({filteredLogs.length})</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Direction</th>
                      <th style={styles.th}>Entrance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(log.scanned_at).toLocaleString()}</td>
                        <td style={styles.td}>
                          <div style={{fontWeight: "600"}}>{log.employees?.full_name}</div>
                          <div style={{fontSize: "12px", color: "#6b7280"}}>{log.employees?.employee_no}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={log.direction === "in" ? styles.badgeIn : styles.badgeOut}>
                            {log.direction === "in" ? "IN" : "OUT"}
                          </span>
                        </td>
                        <td style={styles.td}>{log.entrance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', Arial, sans-serif" },
  loadingContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 18, color: "#6b7280" },
  header: { background: "#0f766e", color: "white", padding: "16px 24px" },
  headerContent: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  headerTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  logoutButton: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  nav: { background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: 8, overflowX: "auto" },
  navButton: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: 15, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" },
  navButtonActive: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid #0f766e", cursor: "pointer", fontSize: 15, color: "#0f766e", fontWeight: 600, whiteSpace: "nowrap" },
  mainContent: { maxWidth: 1200, margin: "0 auto", padding: 24 },
  searchContainer: { marginBottom: 20, display: "flex", gap: 12 },
  searchInput: { flex: 1, padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 15, outline: "none" },
  clearSearchButton: { padding: "12px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  card: { background: "white", borderRadius: 10, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  cardTitle: { margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", cursor: "pointer", userSelect: "none" },
  td: { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 14 },
  tr: { transition: "background 0.2s" },
  badgeInside: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#dcfce7", color: "#166534" },
  badgeOutside: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b" },
  badgeIn: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#dcfce7", color: "#166534" },
  badgeOut: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  input: { flex: 1, padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, minWidth: 200 },
  primaryButton: { padding: "12px 24px", background: "#0f766e", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 15 },
  cancelButton: { padding: "12px 24px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 15 },
  exportButton: { padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 },
};