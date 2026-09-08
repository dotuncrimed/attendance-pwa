// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("dashboard");

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
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
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
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeStatus.map((emp) => (
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
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>⏱️ Work Duration - Today</h2>
              <p style={{color: "#6b7280", fontSize: 14, marginTop: -10}}>
                Shows how long each employee has been inside the warehouse today.
              </p>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Current Shift</th>
                      <th style={styles.th}>Today's Total</th>
                      <th style={styles.th}>Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {durations.map((emp) => (
                      <tr key={emp.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{fontWeight: "600"}}>{emp.full_name}</div>
                          <div style={{fontSize: "12px", color: "#6b7280"}}>{emp.employee_no}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={emp.current_status === "inside" ? styles.badgeInside : styles.badgeOutside}>
                            {emp.current_status === "inside" ? "🟢 INSIDE" : "🔴 OUTSIDE"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {emp.current_status === "inside" ? (
                            <span style={{fontWeight: "700", color: "#22c55e", fontSize: 16}}>
                              ⏳ {formatDuration(emp.current_duration_minutes)}
                            </span>
                          ) : (
                            <span style={{color: "#9ca3af"}}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={{fontWeight: "700", fontSize: 16, color: "#1e293b"}}>
                            {formatDuration(emp.today_total_minutes)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {emp.today_sessions.length > 0 ? (
                            <div style={{fontSize: 12}}>
                              {emp.today_sessions.map((session, idx) => (
                                <div key={idx} style={{marginBottom: 4, padding: "4px 8px", background: "#f8fafc", borderRadius: 4}}>
                                  {new Date(session.in_time).toLocaleTimeString()} → {new Date(session.out_time).toLocaleTimeString()}
                                  <span style={{fontWeight: "600", marginLeft: 8, color: "#3b82f6"}}>
                                    ({formatDuration(session.duration_minutes)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{color: "#9ca3af"}}>No sessions today</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  <input type="text" placeholder="Employee No (e.g. EMP-002)" value={formData.employee_no} onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })} style={styles.input} required />
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
              <h2 style={styles.cardTitle}>👥 All Employees</h2>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>No</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Position</th>
                      <th style={styles.th}>QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} style={styles.tr}>
                        <td style={styles.td}>{emp.employee_no}</td>
                        <td style={{...styles.td, fontWeight: "600"}}>{emp.full_name}</td>
                        <td style={styles.td}>{emp.department || "-"}</td>
                        <td style={styles.td}>{emp.position || "-"}</td>
                        <td style={styles.td}>
                          <button onClick={() => handleGenerateQR(emp.id)} style={styles.smallButton}>Generate QR</button>
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

      {/* QR Code Modal */}
      {qrModal && (
        <div style={styles.modalOverlay} onClick={() => setQrModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px 0", textAlign: "center", fontSize: "18px" }}>Scan this QR Code</h3>
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
  headerContent: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  logoutButton: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  nav: { background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: 8, overflowX: "auto" },
  navButton: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid transparent", cursor: "pointer", fontSize: 15, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" },
  navButtonActive: { padding: "14px 20px", background: "none", border: "none", borderBottom: "3px solid #3b82f6", cursor: "pointer", fontSize: 15, color: "#3b82f6", fontWeight: 600, whiteSpace: "nowrap" },
  mainContent: { maxWidth: 1200, margin: "0 auto", padding: 24 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "white", padding: 20, borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  statLabel: { margin: 0, fontSize: 14, color: "#64748b", marginBottom: 8 },
  statValue: { margin: 0, fontSize: 32, fontWeight: 700, color: "#1e293b" },
  card: { background: "white", borderRadius: 10, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  cardTitle: { margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase" },
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
  smallButton: { padding: "6px 14px", background: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "#f8fafc", padding: 30, borderRadius: 12, maxWidth: 400, width: "90%" },
};