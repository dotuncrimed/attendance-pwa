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

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // 1. Try to login with Supabase
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

    // 2. Check if they are Admin or Guard
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

    // 3. Send them to the right page
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
        <h1 style={styles.title}>Attendance Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>
        {message && <p style={{ color: "red", marginTop: 10, textAlign: "center" }}>{message}</p>}
      </div>
    </div>
  );
}

// Simple styling
const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f3f4f6" },
  card: { background: "white", padding: "40px", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" },
  title: { textAlign: "center", marginBottom: "20px", color: "#1f2937" },
  input: { width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #d1d5db", borderRadius: "6px", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }
};