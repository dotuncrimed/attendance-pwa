"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [qrModal, setQrModal] = useState(null);

  // Form state
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

      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
        loadData();
      } else {
        router.push("/guard"); // Not admin, send to guard page
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function loadData() {
    // Load employees
    const empRes = await fetch("/api/employees");
    const empData = await empRes.json();
    if (empData.ok) setEmployees(empData.employees);

    // Load logs
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

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div style={{ padding: 24, fontFamily: "Arial", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Logout
        </button>
      </div>

      {/* Add Employee Form */}
      <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, marginBottom: 30 }}>
        <h2 style={{ marginTop: 0 }}>Add New Employee</h2>
        <form onSubmit={handleAddEmployee} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input
            type="text"
            placeholder="Employee No (e.g. EMP-002)"
            value={formData.employee_no}
            onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Add Employee</button>
        </form>
      </div>

      {/* Employee List */}
      <div style={{ marginBottom: 30 }}>
        <h2>Employees</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th style={styles.th}>No</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Position</th>
              <th style={styles.th}>QR Code</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={styles.td}>{emp.employee_no}</td>
                <td style={styles.td}>{emp.full_name}</td>
                <td style={styles.td}>{emp.department}</td>
                <td style={styles.td}>{emp.position}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleGenerateQR(emp.id)}
                    style={{ padding: "6px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Generate QR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Logs */}
      <div>
        <h2>Recent Attendance Logs</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Direction</th>
              <th style={styles.th}>Entrance</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={styles.td}>{new Date(log.scanned_at).toLocaleString()}</td>
                <td style={styles.td}>{log.employees?.full_name} ({log.employees?.employee_no})</td>
                <td style={styles.td}>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: 4, 
                    background: log.direction === "in" ? "#dcfce7" : "#fee2e2",
                    color: log.direction === "in" ? "#166534" : "#991b1b",
                    fontWeight: "bold"
                  }}>
                    {log.direction === "in" ? "IN" : "OUT"}
                  </span>
                </td>
                <td style={styles.td}>{log.entrance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* QR Code Modal */}
      {qrModal && (
        <div style={styles.modalOverlay} onClick={() => setQrModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, textAlign: "center" }}>Scan this QR Code</h3>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <QRCodeSVG value={qrModal.qrContent} size={256} />
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>
              {qrModal.qrContent}
            </p>
            <button
              onClick={() => setQrModal(null)}
              style={{ width: "100%", padding: 10, background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  input: { padding: 10, border: "1px solid #d1d5db", borderRadius: 4, flex: "1 1 200px" },
  button: { padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" },
  th: { padding: 12, borderBottom: "2px solid #e5e7eb" },
  td: { padding: 12 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: 30, borderRadius: 10, maxWidth: 400, width: "90%" }
};