// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

    const employeesWithDurations = await Promise.all(
      employees.map(async (emp) => {
        const { data: logs } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
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
          };
        }

        let insideSessions = [];
        let outsideSessions = [];
        let currentIn = null;
        let currentOut = null;
        let todayInsideTotal = 0;
        let todayOutsideTotal = 0;
        const today = new Date().toDateString();

        for (const log of logs) {
          const logDate = new Date(log.scanned_at).toDateString();
          const isToday = logDate === today;

          if (log.direction === "in") {
            currentIn = new Date(log.scanned_at);
            
            // If there was a previous OUT, calculate outside time
            if (currentOut && isToday) {
              const outsideMs = currentIn.getTime() - currentOut.getTime();
              const outsideMinutes = Math.round(outsideMs / 60000);
              todayOutsideTotal += outsideMinutes;
              outsideSessions.push({
                out_time: currentOut.toISOString(),
                in_time: currentIn.toISOString(),
                duration_minutes: outsideMinutes,
              });
            }
            currentOut = null;

          } else if (log.direction === "out") {
            currentOut = new Date(log.scanned_at);
            
            // If there was a previous IN, calculate inside time
            if (currentIn && isToday) {
              const insideMs = currentOut.getTime() - currentIn.getTime();
              const insideMinutes = Math.round(insideMs / 60000);
              todayInsideTotal += insideMinutes;
              insideSessions.push({
                in_time: currentIn.toISOString(),
                out_time: currentOut.toISOString(),
                duration_minutes: insideMinutes,
              });
            }
            currentIn = null;
          }
        }

        // Determine current session status
        let currentStatus = "outside";
        let currentSessionStart = null;
        let currentSessionMinutes = 0;

        if (currentIn && !currentOut) {
          // Currently INSIDE
          currentStatus = "inside";
          currentSessionStart = currentIn.toISOString();
          const now = new Date();
          currentSessionMinutes = Math.round((now.getTime() - currentIn.getTime()) / 60000);
        } else if (currentOut) {
          // Currently OUTSIDE
          currentStatus = "outside";
          currentSessionStart = currentOut.toISOString();
          const now = new Date();
          currentSessionMinutes = Math.round((now.getTime() - currentOut.getTime()) / 60000);
        }

        // Get last 3 inside sessions (IN→OUT pairs)
        const lastThreeSessions = insideSessions.slice(-3).reverse();

        return {
          ...emp,
          current_status: currentStatus,
          current_session_start: currentSessionStart,
          current_session_minutes: currentSessionMinutes,
          today_inside_minutes: todayInsideTotal,
          today_outside_minutes: todayOutsideTotal,
          last_sessions: lastThreeSessions,
        };
      })
    );

    return NextResponse.json({ ok: true, employees: employeesWithDurations });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}