// @ts-nocheck
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

function formatDuration(minutes) {
  if (minutes === 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [employees, setEmployees] = useState([]);
  const [employeeStatus, setEmployeeStatus] = useState([]);
  const [durations, setDurations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [qrModal, setQrModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("employee_no");
  const [sortDirection, setSortDirection] = useState("asc");

  // Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [formData, setFormData] = useState({
    employee_no: "",
    full_name: "",
    department: "",
    position: "",
  });

  const [editFormData, setEditFormData] = useState({
    id: "",
    employee_no: "",
    full_name: "",
    department: "",
    position: "",
    active: true,
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

      if (profile?.role === "admin") {
        setIsAdmin(true);
        loadData();
      } else {
        router.push("/guard");
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // AUTO-REFRESH: Reload data every 30 seconds
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      loadData();
      setLastRefresh(new Date());
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [isAdmin]);

  async function loadData() {
    const empRes = await fetch("/api/employees");
    const empData = await empRes.json();
    if (empData.ok) setEmployees(empData.employees);

    const statusRes = await fetch("/api/status");
    const statusData = await statusRes.json();
    if (statusData.ok) setEmployeeStatus(statusData.employees);

    const durRes = await fetch("/api/durations");
    const durData = await durRes.json();
    if (durData.ok) setDurations(durData.employees);

    const logRes = await fetch("/api/logs");
    const logData = await logRes.json();
    if (logData.ok) setLogs(logData.logs);
  }

  // SEARCH & SORT logic
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

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [employees, searchTerm, sortField, sortDirection]);

  const filteredAndSortedStatus = useMemo(() => {
    let filtered = employeeStatus.filter(emp =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [employeeStatus, searchTerm, sortField, sortDirection]);

  const filteredAndSortedDurations = useMemo(() => {
    let filtered = durations.filter(emp =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [durations, searchTerm, sortField, sortDirection]);

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

  // CRUD Operations
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

  function openEditModal(emp) {
    setEditFormData({
      id: emp.id,
      employee_no: emp.employee_no,
      full_name: emp.full_name,
      department: emp.department || "",
      position: emp.position || "",
      active: emp.active,
    });
    setEditModal(emp);
  }

  async function handleUpdateEmployee(e) {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editFormData),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Employee updated successfully!");
      setEditModal(null);
      loadData();
    } else {
      alert("Error: " + data.error);
    }
  }

  async function handleDeleteEmployee(emp) {
    const confirmed = confirm(`Are you sure you want to deactivate ${emp.full_name}?`);
    if (!confirmed) return;

    const res = await fetch("/api/employees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: emp.id }),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Employee deactivated successfully!");
      loadData();
    } else {
      alert("Error: " + data.error);
    }
  }

  async function handleGenerateQR(employeeId) {
    const res = await fetch("/api/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    const data = await res.json();
    if (data.ok) {
      setQrModal({ employeeId, qrContent: data.qrContent });
    } else {
      alert("Error: " + data.error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div style={styles.loadingContainer}>Loading...</div>;
  if (!isAdmin) return null;

  const insideCount = employeeStatus.filter(e => e.current_status === "inside").length;
  const outsideCount = employeeStatus.filter(e => e.current_status === "outside").length;
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.scanned_at).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  });

  return (
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>📋 Attendance Admin</h1>
          <div style={{display: "flex", alignItems: "center", gap: 16}}>
            <span style={{fontSize: 12, color: "#94a3b8"}}>
              Auto-refresh: {lastRefresh.toLocaleTimeString()}
            </span>
            <button onClick={() => { loadData(); setLastRefresh(new Date()); }} style={styles.refreshButton}>
              🔄 Refresh
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <button style={activeTab === "dashboard" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("dashboard")}>
          📊 Dashboard
        </button>
        <button style={activeTab === "durations" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("durations")}>
          ⏱️ Durations
        </button>
        <button style={activeTab === "employees" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("employees")}>
          👥 Employees
        </button>
        <button style={activeTab === "logs" ? styles.navButtonActive : styles.navButton} onClick={() => setActiveTab("logs")}>
          📜 Logs
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

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: "4px solid #3b82f6"}}>
                <p style={styles.statLabel}>Total Employees</p>
                <p style={styles.statValue}>{employees.length}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: "4px solid #22c55e"}}>
                <p style={styles.statLabel}>Currently Inside</p>
                <p style={{...styles.statValue, color: "#22c55e"}}>{insideCount}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: "4px solid #ef4444"}}>
                <p style={styles.statLabel}>Currently Outside</p>
                <p style={{...styles.statValue, color: "#ef4444"}}>{outsideCount}</p>
              </div>
              <div style={{...styles.statCard, borderLeft: "4px solid #8b5cf6"}}>
                <p style={styles.statLabel}>Today's Scans</p>
                <p style={styles.statValue}>{todayLogs.length}</p>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🏭 Employee Status - Who's Inside?</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} onClick={() => handleSort("full_name")}>Employee{getSortIcon("full_name")}</th>
                      <th style={styles.th} onClick={() => handleSort("department")}>Department{getSortIcon("department")}</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedStatus.map((emp) => (
                      <tr key={emp.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{fontWeight: "600"}}>{emp.full_name}</div>
                          <div style={{fontSize: "12px", color: "#6b7280"}}>{emp.employee_no}</div>
                        </td>
                        <td style={styles.td}>{emp.department || "-"}</td>
                        <td style={styles.td}>
                          <span style={emp.current_status === "inside" ? styles.badgeInside : styles.badgeOutside}>
                            {emp.current_status === "inside" ? "🟢 INSIDE" : "🔴 OUTSIDE"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {emp.last_scan_time ? new Date(emp.last_scan_time).toLocaleTimeString() : "Never scanned"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DURATIONS TAB */}
        {activeTab === "durations" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>⏱️ Work Duration - Today</h2>
            <p style={{color: "#6b7280", fontSize: 14, marginTop: -10, marginBottom: 20}}>
              Shows employee time tracking. Green = Inside warehouse, Red = Outside warehouse.
            </p>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th} onClick={() => handleSort("full_name")}>Employee{getSortIcon("full_name")}</th>
                    <th style={styles.th}>Current Session</th>
                    <th style={styles.th}>Today's Inside</th>
                    <th style={styles.th}>Today's Outside</th>
                    <th style={styles.th}>Last 3 Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedDurations.map((emp) => (
                    <tr key={emp.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{fontWeight: "600"}}>{emp.full_name}</div>
                        <div style={{fontSize: "12px", color: "#6b7280"}}>{emp.employee_no}</div>
                      </td>
                      
                      {/* Current Session Column */}
                      <td style={styles.td}>
                        {emp.current_status === "inside" ? (
                          <div style={styles.currentSessionInside}>
                            <span style={{fontSize: 18}}>🟢</span>
                            <div>
                              <div style={{fontWeight: "700", color: "#16a34a"}}>INSIDE</div>
                              <div style={{fontSize: 14, color: "#16a34a"}}>⏳ {formatDuration(emp.current_session_minutes)}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={styles.currentSessionOutside}>
                            <span style={{fontSize: 18}}>🔴</span>
                            <div>
                              <div style={{fontWeight: "700", color: "#dc2626"}}>OUTSIDE</div>
                              <div style={{fontSize: 14, color: "#dc2626"}}>⏳ {formatDuration(emp.current_session_minutes)}</div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Today's Inside Time */}
                      <td style={styles.td}>
                        <span style={styles.insideTimeBadge}>
                          🏭 {formatDuration(emp.today_inside_minutes)}
                        </span>
                      </td>

                      {/* Today's Outside Time */}
                      <td style={styles.td}>
                        <span style={styles.outsideTimeBadge}>
                          🚪 {formatDuration(emp.today_outside_minutes)}
                        </span>
                      </td>

                      {/* Last 3 Sessions */}
                      <td style={styles.td}>
                        {emp.last_sessions.length > 0 ? (
                          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                            {emp.last_sessions.map((session, idx) => (
                              <div key={idx} style={styles.sessionCard}>
                                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                                  <span style={{color: "#16a34a", fontWeight: "600", fontSize: 13}}>
                                    IN {new Date(session.in_time).toLocaleTimeString()}
                                  </span>
                                  <span style={{color: "#9ca3af", fontSize: 12}}>→</span>
                                  <span style={{color: "#dc2626", fontWeight: "600", fontSize: 13}}>
                                    OUT {new Date(session.out_time).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div style={{textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 2}}>
                                  Duration: <strong>{formatDuration(session.duration_minutes)}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{color: "#9ca3af", fontSize: 13}}>No completed sessions today</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === "employees" && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>➕ Add New Employee</h2>
              <form onSubmit={handleAddEmployee} style={styles.form}>
                <div style={styles.formRow}>
                  <input type="text" placeholder="Employee No" value={formData.employee_no} onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })} style={styles.input} required />
                  <input type="text" placeholder="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={styles.input} required />
                </div>
                <div style={styles.formRow}>
                  <input type="text" placeholder="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={styles.input} />
                  <input type="text" placeholder="Position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} style={styles.input} />
                </div>
                <button type="submit" style={styles.primaryButton}>Add Employee</button>
              </form>
            </div>

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
                      <th style={styles.th}>Actions</th>
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
                        <td style={styles.td}>
                          <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
                            <button onClick={() => openEditModal(emp)} style={styles.editButton}>✏️ Edit</button>
                            <button onClick={() => handleGenerateQR(emp.id)} style={styles.smallButton}>📱 QR</button>
                            {emp.active && (
                              <button onClick={() => handleDeleteEmployee(emp)} style={styles.deleteButton}>🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📜 Recent Attendance Logs</h2>
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
                  {logs.map((log) => (
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
        )}
      </main>

      {/* EDIT EMPLOYEE MODAL */}
      {editModal && (
        <div style={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 18 }}>✏️ Edit Employee</h3>
            <form onSubmit={handleUpdateEmployee} style={{display: "flex", flexDirection: "column", gap: 12}}>
              <input type="text" placeholder="Employee No" value={editFormData.employee_no} onChange={(e) => setEditFormData({...editFormData, employee_no: e.target.value})} style={styles.input} required />
              <input type="text" placeholder="Full Name" value={editFormData.full_name} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} style={styles.input} required />
              <input type="text" placeholder="Department" value={editFormData.department} onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} style={styles.input} />
              <input type="text" placeholder="Position" value={editFormData.position} onChange={(e) => setEditFormData({...editFormData, position: e.target.value})} style={styles.input} />
              <div style={{display: "flex", alignItems: "center", gap: 8}}>
                <input type="checkbox" checked={editFormData.active} onChange={(e) => setEditFormData({...editFormData, active: e.target.checked})} style={{width: 18, height: 18}} />
                <span>Active</span>
              </div>
              <div style={{display: "flex", gap: 12, marginTop: 10}}>
                <button type="submit" style={styles.primaryButton}>Save Changes</button>
                <button type="button" onClick={() => setEditModal(null)} style={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrModal && (
        <div style={styles.modalOverlay} onClick={() => setQrModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px 0", textAlign: "center", fontSize: 18 }}>Scan this QR Code</h3>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, padding: 20, background: "white", borderRadius: 8 }}>
              <QRCodeSVG value={qrModal.qrContent} size={256} />
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", wordBreak: "break-all", marginBottom: 20 }}>
              {qrModal.qrContent}
            </p>
            <button onClick={() => setQrModal(null)} style={styles.primaryButton}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', Arial, sans-serif" },
  loadingContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 18, color: "#6b7280" },
  header: { background: "#1e293b", color: "white", padding: "16px 24px" },
  headerContent: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  headerTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  logoutButton: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  refreshButton: { padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  nav: { background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: 8, overflowX: "auto" },
  navButton: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: 15, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" },
  navButtonActive: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid #3b82f6", cursor: "pointer", fontSize: 15, color: "#3b82f6", fontWeight: 600, whiteSpace: "nowrap" },
  mainContent: { maxWidth: 1200, margin: "0 auto", padding: 24 },
  searchContainer: { marginBottom: 20, display: "flex", gap: 12 },
  searchInput: { flex: 1, padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 15, outline: "none" },
  clearSearchButton: { padding: "12px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "white", padding: 20, borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  statLabel: { margin: 0, fontSize: 14, color: "#64748b", marginBottom: 8 },
  statValue: { margin: 0, fontSize: 32, fontWeight: 700, color: "#1e293b" },
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
  primaryButton: { padding: "12px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 15 },
  cancelButton: { padding: "12px 24px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 15 },
  smallButton: { padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  editButton: { padding: "6px 12px", background: "#f59e0b", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  deleteButton: { padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "#f8fafc", padding: 30, borderRadius: 12, maxWidth: 450, width: "90%" },
    currentSessionInside: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" },
  currentSessionOutside: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" },
  insideTimeBadge: { display: "inline-block", padding: "6px 12px", background: "#dcfce7", color: "#166534", borderRadius: 6, fontWeight: "700", fontSize: 14 },
  outsideTimeBadge: { display: "inline-block", padding: "6px 12px", background: "#fee2e2", color: "#991b1b", borderRadius: 6, fontWeight: "700", fontSize: 14 },
  sessionCard: { padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" },
};