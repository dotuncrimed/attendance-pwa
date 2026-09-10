// @ts-nocheck
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles, typography } from "../../lib/styles";

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
    } else if (profile.role === "supervisor") {
      router.push("/supervisor");
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
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h1 style={styles.title}>Attendance System</h1>
          <p style={styles.subtitle}>Employee Time Monitoring</p>
        </div>
        
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
            {loading ? "Signing in..." : "Sign In"}
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
    background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgTertiary} 100%)`,
    padding: spacing.xl,
    fontFamily: typography.fontFamily,
  },
  card: { 
    background: colors.bgSecondary, 
    padding: `${spacing['4xl']} ${spacing['3xl']}`, 
    borderRadius: borderRadius['2xl'], 
    boxShadow: colors.shadowLg, 
    width: "100%", 
    maxWidth: 420,
    border: `1px solid ${colors.borderLight}`,
  },
  header: { textAlign: "center" as const, marginBottom: spacing['3xl'] },
  iconContainer: { 
    marginBottom: spacing.xl,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { 
    width: 56, 
    height: 56, 
    color: colors.primary,
  },
  title: { 
    margin: "0 0 8px 0", 
    color: colors.textPrimary, 
    fontSize: fontSize['2xl'], 
    fontWeight: fontWeight.bold,
    letterSpacing: "-0.025em",
  },
  subtitle: { 
    margin: 0, 
    color: colors.textMuted, 
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
  },
  form: { display: "flex", flexDirection: "column" as const, gap: spacing.xl },
  inputGroup: { display: "flex", flexDirection: "column" as const, gap: spacing.sm },
  label: { 
    fontSize: fontSize.sm, 
    fontWeight: fontWeight.semibold, 
    color: colors.textSecondary,
    letterSpacing: "0.025em",
  },
  input: { 
    width: "100%", 
    padding: `${spacing.md} ${spacing.lg}`, 
    border: `1px solid ${colors.borderMedium}`, 
    borderRadius: borderRadius.lg, 
    fontSize: fontSize.base,
    boxSizing: "border-box" as const,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    color: colors.textPrimary,
    backgroundColor: colors.bgSecondary,
  },
  button: { 
    width: "100%", 
    padding: `${spacing.md} ${spacing.xl}`, 
    background: colors.primary, 
    color: "white", 
    border: "none", 
    borderRadius: borderRadius.lg, 
    cursor: "pointer", 
    fontWeight: fontWeight.semibold, 
    fontSize: fontSize.base,
    marginTop: spacing.sm,
    transition: "background 0.2s",
    letterSpacing: "0.025em",
  },
  error: { 
    color: colors.danger, 
    textAlign: "center" as const, 
    marginTop: spacing.lg, 
    fontSize: fontSize.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.dangerBg,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.dangerBorder}`,
  }
};
