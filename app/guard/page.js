"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function GuardPage() {
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const router = useRouter();
  const scannerRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
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

    // Prevent double initialization in React Strict Mode
    if (scannerRef.current) {
        return;
    }

    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
    scannerRef.current = scanner;
    
    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
        scanner.clear(); 
        setIsScanning(false); // Stop scanner after success
      },
      (error) => {
        // Ignore scan errors (like camera not finding QR yet)
      }
    );

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, [user, isScanning]);

  async function handleScan(qrText) {
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

  if (!user) return <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: 24, fontFamily: "Arial", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Guard Scanner</h1>
        <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Logout
        </button>
      </div>
      
      {/* Scanner Container */}
      {isScanning && !result && !error && (
        <div id="qr-reader" style={{ width: "100%", marginBottom: 20 }}></div>
      )}

      {/* Result Display */}
      {result && (
        <div style={{ padding: 30, background: result.direction === "in" ? "#dcfce7" : "#fee2e2", borderRadius: 12, marginBottom: 20, border: `2px solid ${result.direction === "in" ? "#22c55e" : "#ef4444"}` }}>
          <h2 style={{ color: result.direction === "in" ? "#166534" : "#991b1b", fontSize: 32, margin: "0 0 10px 0" }}>
            {result.direction === "in" ? "IN" : "OUT"}
          </h2>
          <p style={{ fontSize: 24, fontWeight: "bold", margin: "0 0 5px 0" }}>{result.employee.full_name}</p>
          <p style={{ margin: "0 0 15px 0", color: "#4b5563" }}>{result.employee.employee_no}</p>
          <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#6b7280" }}>{new Date(result.scanned_at).toLocaleTimeString()}</p>
          <button onClick={resetScanner} style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
            Scan Next Employee
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ padding: 30, background: "#fee2e2", color: "#991b1b", borderRadius: 12, marginBottom: 20, border: "2px solid #ef4444" }}>
          <h2 style={{ margin: "0 0 10px 0" }}>Error</h2>
          <p style={{ margin: "0 0 20px 0" }}>{error}</p>
          <button onClick={resetScanner} style={{ padding: "12px 24px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
            Try Again
          </button>
        </div>
      )}

      {/* Manual Test Input (for testing) */}
      <div style={{ marginTop: 30, padding: 20, background: "#f3f4f6", borderRadius: 8 }}>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>Manual Test (for testing):</p>
        <input
          type="text"
          placeholder="Enter QR code text"
          style={{ padding: 10, width: "80%", marginRight: 10, border: "1px solid #d1d5db", borderRadius: 4 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value) {
              handleScan(e.target.value);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}