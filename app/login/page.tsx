// @ts-nocheck
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setMessage("Login failed: " + authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      setMessage("Profile not found. Please contact admin.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") {
      router.push("/admin");
    } else if (profile.role === "guard") {
      router.push("/guard");
    } else {
      setMessage("Unknown role.");
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>🏭</div>
        </div>
        <h1 style={styles.title}>Attendance System</h1>
        <p style={styles.subtitle}>Employee Time Monitoring</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>
        
        {message && <p style={styles.error}>{message}</p>}
      </div>
    </div>
  );
}

const styles: any = {
  container: { 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    minHeight: "100vh", 
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: 20
  },
  card: { 
    background: "white", 
    padding: "40px 32px", 
    borderRadius: 16, 
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", 
    width: "100%", 
    maxWidth: 400 
  },
  logoContainer: { textAlign: "center" as const, marginBottom: 20 },
  logo: { 
    fontSize: 48, 
    width: 80, 
    height: 80, 
    background: "#f0f4ff", 
    borderRadius: 20, 
    display: "inline-flex", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  title: { 
    textAlign: "center" as const, 
    margin: "0 0 8px 0", 
    color: "#1e293b", 
    fontSize: 24, 
    fontWeight: 700 
  },
  subtitle: { 
    textAlign: "center" as const, 
    margin: "0 0 30px 0", 
    color: "#64748b", 
    fontSize: 14 
  },
  form: { display: "flex", flexDirection: "column" as const, gap: 20 },
  inputGroup: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { 
    width: "100%", 
    padding: "12px 16px", 
    border: "2px solid #e2e8f0", 
    borderRadius: 8, 
    fontSize: 15,
    boxSizing: "border-box" as const,
    outline: "none",
    transition: "border-color 0.2s"
  },
  button: { 
    width: "100%", 
    padding: "14px", 
    background: "#3b82f6", 
    color: "white", 
    border: "none", 
    borderRadius: 8, 
    cursor: "pointer", 
    fontWeight: 700, 
    fontSize: 16,
    marginTop: 10
  },
  error: { color: "#ef4444", textAlign: "center" as const, marginTop: 16, fontSize: 14 }
};