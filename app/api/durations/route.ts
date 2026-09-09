// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Threshold: If OUT for more than this many minutes, they went home
const WENT_HOME_THRESHOLD_MINUTES = 120; // 2 hours

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true);

    if (empError) {
      return NextResponse.json({ ok: false, error: empError.message }, { status: 500 });
    }

    // Get today's date in UTC+8
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const todayStart = new Date(`${todayStr}T00:00:00+08:00`).toISOString();
    const todayEnd = new Date(`${todayStr}T23:59:59+08:00`).toISOString();

    const employeesWithDurations = await Promise.all(
      employees.map(async (emp) => {
        // Get today's logs only
        const { data: logs } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .gte("scanned_at", todayStart)
          .lte("scanned_at", todayEnd)
          .order("scanned_at", { ascending: true });

        if (!logs || logs.length === 0) {
          return {
            ...emp,
            current_status: "outside",
            current_session_start: null,
            current_session_minutes: 0,
            today_inside_minutes: 0,
            today_outside_minutes: 0,
            last_sessions: [],
            went_home: false,
          };
        }

        // NEW LOGIC: Calculate inside/outside with "went home" detection
        let insideSessions = [];
        let totalInsideMinutes = 0;
        let totalOutsideMinutes = 0;
        let currentIn = null;
        let currentOut = null;
        let wentHome = false;
        let workDayEnded = false;

        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          const logTime = new Date(log.scanned_at);

          if (workDayEnded) break; // Stop counting after they went home

          if (log.direction === "in") {
            currentIn = logTime;

            // If there was a previous OUT, calculate outside time
            if (currentOut) {
              const outsideMs = logTime.getTime() - currentOut.getTime();
              const outsideMinutes = Math.round(outsideMs / 60000);

              // Check if this OUT period was too long (went home)
              if (outsideMinutes >= WENT_HOME_THRESHOLD_MINUTES) {
                // They went home! Don't count this outside time
                // and don't count any more time after this
                wentHome = true;
                workDayEnded = true;
                break;
              } else {
                // Short break, count it
                totalOutsideMinutes += outsideMinutes;
              }
            }
            currentOut = null;

          } else if (log.direction === "out") {
            currentOut = logTime;

            // If there was a previous IN, calculate inside time
            if (currentIn) {
              const insideMs = logTime.getTime() - currentIn.getTime();
              const insideMinutes = Math.round(insideMs / 60000);
              totalInsideMinutes += insideMinutes;
              insideSessions.push({
                in_time: currentIn.toISOString(),
                out_time: logTime.toISOString(),
                duration_minutes: insideMinutes,
              });
            }
            currentIn = null;
          }
        }

        // Determine current status
        let currentStatus = "outside";
        let currentSessionStart = null;
        let currentSessionMinutes = 0;

        if (!workDayEnded) {
          if (currentIn && !currentOut) {
            // Currently INSIDE
            currentStatus = "inside";
            currentSessionStart = currentIn.toISOString();
            const nowTime = new Date();
            currentSessionMinutes = Math.round((nowTime.getTime() - currentIn.getTime()) / 60000);
            totalInsideMinutes += currentSessionMinutes; // Add current session to total
          } else if (currentOut) {
            // Currently OUTSIDE (but haven't gone home yet)
            currentStatus = "outside";
            currentSessionStart = currentOut.toISOString();
            const nowTime = new Date();
            currentSessionMinutes = Math.round((nowTime.getTime() - currentOut.getTime()) / 60000);
            
            // If they've been out too long, they went home
            if (currentSessionMinutes >= WENT_HOME_THRESHOLD_MINUTES) {
              wentHome = true;
              currentStatus = "outside";
            } else {
              totalOutsideMinutes += currentSessionMinutes;
            }
          }
        }

        // Get last 3 sessions
        const lastThreeSessions = insideSessions.slice(-3).reverse();

        return {
          ...emp,
          current_status: currentStatus,
          current_session_start: currentSessionStart,
          current_session_minutes: currentSessionMinutes,
          today_inside_minutes: totalInsideMinutes,
          today_outside_minutes: totalOutsideMinutes,
          last_sessions: lastThreeSessions,
          went_home: wentHome,
        };
      })
    );

    return NextResponse.json({ ok: true, employees: employeesWithDurations });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}