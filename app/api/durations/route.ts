// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true);

    if (empError) {
      return NextResponse.json({ ok: false, error: empError.message }, { status: 500 });
    }

    // For each employee, calculate their durations
    const employeesWithDurations = await Promise.all(
      employees.map(async (emp) => {
        // Get all logs for this employee, ordered by time
        const { data: logs } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .order("scanned_at", { ascending: true });

        if (!logs || logs.length === 0) {
          return {
            ...emp,
            current_status: "outside",
            current_shift_start: null,
            current_duration_minutes: 0,
            today_total_minutes: 0,
            today_sessions: [],
          };
        }

        // Calculate sessions (pairs of IN and OUT)
        let sessions = [];
        let currentIn = null;
        let todayTotal = 0;
        const today = new Date().toDateString();

        for (const log of logs) {
          const logDate = new Date(log.scanned_at).toDateString();
          
          if (log.direction === "in") {
            currentIn = new Date(log.scanned_at);
          } else if (log.direction === "out" && currentIn) {
            const outTime = new Date(log.scanned_at);
            const durationMs = outTime.getTime() - currentIn.getTime();
            const durationMinutes = Math.round(durationMs / 60000);

            // Only count if it's today
            if (logDate === today) {
              todayTotal += durationMinutes;
              sessions.push({
                in_time: currentIn.toISOString(),
                out_time: outTime.toISOString(),
                duration_minutes: durationMinutes,
              });
            }
            currentIn = null;
          }
        }

        // Check if currently inside (has an IN without a matching OUT)
        let currentDuration = 0;
        let currentStatus = "outside";
        let currentShiftStart = null;

        if (currentIn) {
          currentStatus = "inside";
          currentShiftStart = currentIn.toISOString();
          const now = new Date();
          currentDuration = Math.round((now.getTime() - currentIn.getTime()) / 60000);
        }

        return {
          ...emp,
          current_status: currentStatus,
          current_shift_start: currentShiftStart,
          current_duration_minutes: currentDuration,
          today_total_minutes: todayTotal,
          today_sessions: sessions,
        };
      })
    );

    return NextResponse.json({ ok: true, employees: employeesWithDurations });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}