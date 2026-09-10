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

    const scanner = new Html5QrcodeScanner("qr-reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });
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
          <div style={styles.headerLeft}>
            <svg style={styles.headerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <h1 style={styles.headerTitle}>Gate Scanner</h1>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            <svg style={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Scanner */}
        {isScanning && !result && !error && (
          <div style={styles.scannerCard}>
            <div style={styles.cardHeader}>
              <svg style={styles.scanIconLarge} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <h2 style={styles.scannerTitle}>Scan Employee QR Code</h2>
              <p style={styles.scannerSubtitle}>Position the QR code within the frame</p>
            </div>
            <div id="qr-reader" style={styles.qrReaderContainer}></div>
          </div>
        )}

        {/* Success Result - Check In */}
        {result && result.direction === "in" && (
          <div style={styles.resultCard}>
            <div style={styles.resultHeaderIn}>
              <svg style={styles.resultIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={styles.resultBody}>
              <span style={styles.resultBadgeIn}>CHECKED IN</span>
              <h2 style={styles.resultName}>{result.employee.full_name}</h2>
              <p style={styles.resultNo}>{result.employee.employee_no}</p>
              <div style={styles.resultTimeRow}>
                <svg style={styles.timeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={styles.resultTime}>{new Date(result.scanned_at).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <button onClick={resetScanner} style={styles.scanNextButton}>
                <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Scan Next Employee
              </button>
            </div>
          </div>
        )}

        {/* Success Result - Check Out */}
        {result && result.direction === "out" && (
          <div style={styles.resultCard}>
            <div style={styles.resultHeaderOut}>
              <svg style={styles.resultIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div style={styles.resultBody}>
              <span style={styles.resultBadgeOut}>CHECKED OUT</span>
              <h2 style={styles.resultName}>{result.employee.full_name}</h2>
              <p style={styles.resultNo}>{result.employee.employee_no}</p>
              <div style={styles.resultTimeRow}>
                <svg style={styles.timeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={styles.resultTime}>{new Date(result.scanned_at).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <button onClick={resetScanner} style={styles.scanNextButton}>
                <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Scan Next Employee
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorCard}>
            <div style={styles.errorHeader}>
              <svg style={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={styles.errorBody}>
              <h2 style={styles.errorTitle}>Scan Failed</h2>
              <p style={styles.errorMessage}>{error}</p>
              <button onClick={resetScanner} style={styles.tryAgainButton}>
                <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Manual Test */}
        <div style={styles.manualCard}>
          <label style={styles.manualLabel}>Manual Entry (for testing)</label>
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
  container: { 
    minHeight: "100vh", 
    background: "#f8fafc", 
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
  },
  loading: { 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh", 
    fontSize: "15px", 
    color: "#64748b",
    fontWeight: "500"
  },
  header: { 
    background: "#ffffff", 
    borderBottom: "1px solid #e2e8f0",
    padding: "14px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100
  },
  headerContent: { 
    maxWidth: "720px", 
    margin: "0 auto", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  headerIcon: {
    width: "24px",
    height: "24px",
    color: "#3b82f6"
  },
  headerTitle: { 
    margin: 0, 
    fontSize: "18px", 
    fontWeight: "600",
    color: "#0f172a"
  },
  logoutButton: { 
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px", 
    background: "transparent", 
    color: "#64748b", 
    border: "1px solid #e2e8f0",
    borderRadius: "6px", 
    cursor: "pointer", 
    fontWeight: "500",
    fontSize: "14px",
    transition: "all 0.2s"
  },
  logoutIcon: {
    width: "16px",
    height: "16px"
  },
  main: { 
    maxWidth: "720px", 
    margin: "0 auto", 
    padding: "32px 24px" 
  },
  scannerCard: { 
    background: "#ffffff", 
    borderRadius: "12px", 
    padding: "32px", 
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  cardHeader: {
    textAlign: "center",
    marginBottom: "24px"
  },
  scanIconLarge: {
    width: "48px",
    height: "48px",
    color: "#3b82f6",
    marginBottom: "16px"
  },
  scannerTitle: { 
    margin: "0 0 8px 0", 
    fontSize: "20px", 
    fontWeight: "600", 
    color: "#0f172a" 
  },
  scannerSubtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#64748b"
  },
  qrReaderContainer: {
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto"
  },
  resultCard: {
    background: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  },
  resultHeaderIn: {
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    padding: "40px 24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  resultHeaderOut: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    padding: "40px 24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  resultIcon: {
    width: "56px",
    height: "56px",
    color: "#ffffff",
    strokeWidth: "1.5"
  },
  resultBody: {
    padding: "32px 24px",
    textAlign: "center"
  },
  resultBadgeIn: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#16a34a",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    marginBottom: "16px"
  },
  resultBadgeOut: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#d97706",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    marginBottom: "16px"
  },
  resultName: {
    margin: "0 0 8px 0",
    fontSize: "24px",
    fontWeight: "600",
    color: "#0f172a"
  },
  resultNo: {
    margin: "0 0 20px 0",
    fontSize: "15px",
    color: "#64748b"
  },
  resultTimeRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    marginBottom: "28px"
  },
  timeIcon: {
    width: "18px",
    height: "18px",
    color: "#94a3b8"
  },
  resultTime: {
    fontSize: "15px",
    color: "#475569",
    fontWeight: "500"
  },
  scanNextButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "14px 24px",
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    transition: "background 0.2s"
  },
  buttonIcon: {
    width: "18px",
    height: "18px"
  },
  errorCard: {
    background: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  },
  errorHeader: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    padding: "40px 24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  errorIcon: {
    width: "56px",
    height: "56px",
    color: "#ffffff",
    strokeWidth: "1.5"
  },
  errorBody: {
    padding: "32px 24px",
    textAlign: "center"
  },
  errorTitle: {
    margin: "0 0 10px 0",
    fontSize: "20px",
    fontWeight: "600",
    color: "#0f172a"
  },
  errorMessage: {
    margin: "0 0 24px 0",
    fontSize: "15px",
    color: "#64748b",
    lineHeight: "1.5"
  },
  tryAgainButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "14px 24px",
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    transition: "background 0.2s"
  },
  manualCard: { 
    marginTop: "32px", 
    background: "#ffffff",
    borderRadius: "10px", 
    padding: "24px", 
    border: "1px solid #e2e8f0"
  },
  manualLabel: { 
    display: "block",
    marginBottom: "12px", 
    fontSize: "13px", 
    color: "#475569", 
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  manualInput: { 
    width: "100%", 
    padding: "12px 14px", 
    border: "1px solid #e2e8f0", 
    borderRadius: "6px", 
    fontSize: "14px", 
    boxSizing: "border-box",
    color: "#0f172a",
    background: "#f8fafc",
    transition: "border-color 0.2s"
  },
};