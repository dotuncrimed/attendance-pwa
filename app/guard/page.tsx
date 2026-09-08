// @ts-nocheck
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function GuardPage() {
  const [user, setUser] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const router = useRouter();
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!user || !isScanning) return;

    if (scannerRef.current) {
      return;
    }

    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
    scannerRef.current = scanner;
    
    scanner.render(
      (decodedText: string) => {
        handleScan(decodedText);
        scanner.clear(); 
        setIsScanning(false);
      },
      (error: any) => {}
    );

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [user, isScanning]);

  async function handleScan(qrText: string) {
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr: qrText,
          entrance: "Main Gate", 
          deviceId: "web-pwa", 
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  function resetScanner() {
    setResult(null);
    setError(null);
    setIsScanning(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>📷 Guard Scanner</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Scanner */}
        {isScanning && !result && !error && (
          <div style={styles.scannerCard}>
            <h2 style={styles.scannerTitle}>Scan Employee QR Code</h2>
            <div id="qr-reader" style={{ width: "100%" }}></div>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div style={result.direction === "in" ? styles.resultCardIn : styles.resultCardOut}>
            <div style={styles.resultIcon}>
              {result.direction === "in" ? "✅" : "👋"}
            </div>
            <h2 style={styles.resultDirection}>
              {result.direction === "in" ? "CHECKED IN" : "CHECKED OUT"}
            </h2>
            <p style={styles.resultName}>{result.employee.full_name}</p>
            <p style={styles.resultNo}>{result.employee.employee_no}</p>
            <p style={styles.resultTime}>{new Date(result.scanned_at).toLocaleTimeString()}</p>
            <button onClick={resetScanner} style={styles.scanNextButton}>
              Scan Next Employee
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorCard}>
            <div style={styles.resultIcon}>❌</div>
            <h2 style={styles.errorTitle}>Error</h2>
            <p style={styles.errorMessage}>{error}</p>
            <button onClick={resetScanner} style={styles.tryAgainButton}>
              Try Again
            </button>
          </div>
        )}

        {/* Manual Test */}
        <div style={styles.manualCard}>
          <p style={styles.manualLabel}>Manual Entry (for testing):</p>
          <input
            type="text"
            placeholder="Enter QR code text and press Enter"
            style={styles.manualInput}
            onKeyDown={(e: any) => {
              if (e.key === "Enter" && e.target.value) {
                handleScan(e.target.value);
                e.target.value = "";
              }
            }}
          />
        </div>
      </main>
    </div>
  );
}

const styles: any = {
  container: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', Arial, sans-serif" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 18, color: "#6b7280" },
  header: { background: "#1e293b", color: "white", padding: "16px 24px" },
  headerContent: { maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  logoutButton: { padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 },
  main: { maxWidth: 600, margin: "0 auto", padding: 24 },
  scannerCard: { background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  scannerTitle: { margin: "0 0 20px 0", textAlign: "center" as const, fontSize: 18, color: "#1e293b" },
  resultCardIn: { background: "white", borderRadius: 12, padding: 40, textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "3px solid #22c55e" },
  resultCardOut: { background: "white", borderRadius: 12, padding: 40, textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "3px solid #f59e0b" },
  resultIcon: { fontSize: 48, marginBottom: 16 },
  resultDirection: { margin: "0 0 8px 0", fontSize: 28, fontWeight: 800, color: "#1e293b" },
  resultName: { margin: "0 0 4px 0", fontSize: 22, fontWeight: 600, color: "#374151" },
  resultNo: { margin: "0 0 12px 0", fontSize: 16, color: "#6b7280" },
  resultTime: { margin: "0 0 24px 0", fontSize: 14, color: "#9ca3af" },
  scanNextButton: { padding: "14px 32px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 16 },
  errorCard: { background: "white", borderRadius: 12, padding: 40, textAlign: "center" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "3px solid #ef4444" },
  errorTitle: { margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: "#ef4444" },
  errorMessage: { margin: "0 0 24px 0", fontSize: 16, color: "#6b7280" },
  tryAgainButton: { padding: "14px 32px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 16 },
  manualCard: { marginTop: 24, background: "#f8fafc", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0" },
  manualLabel: { margin: "0 0 10px 0", fontSize: 14, color: "#64748b", fontWeight: 600 },
  manualInput: { width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const },
};