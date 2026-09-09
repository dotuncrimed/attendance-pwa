// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Used only as a live hint: if currently outside this long, show "Went Home"
const WENT_HOME_HINT_MINUTES = 120; // 2 hours

function processDayLogs(logs, isToday, now, dayEndISO) {
  let insideMinutes = 0;
  let outsideMinutes = 0;
  let sessions = [];
  let pendingIn = null;
  let pendingOut = null;
  let missingOut = false;
  let lastOutTime = null;
  let trailingState = null;   // 'inside' | 'outside' | null
  let trailingMinutes = 0;

  for (const log of logs) {
    const t = new Date(log.scanned_at);

    if (log.direction === "in") {
      // They came back IN. Count the FULL outside gap (no matter how long).
      if (pendingOut) {
        outsideMinutes += Math.round((t.getTime() - pendingOut.getTime()) / 60000);
        pendingOut = null;
      }
      pendingIn = t;
    } else {
      // They went OUT. Count the completed inside session.
      if (pendingIn) {
        const ins = Math.round((t.getTime() - pendingIn.getTime()) / 60000);
        insideMinutes += ins;
        sessions.push({
          in_time: pendingIn.toISOString(),
          out_time: t.toISOString(),
          duration_minutes: ins,
        });
        pendingIn = null;
      }
      pendingOut = t;
      lastOutTime = t;
    }
  }

  // Handle the trailing/open session at the end of the day
  if (pendingIn && !pendingOut) {
    // Ended while INSIDE
    trailingState = "inside";
    if (isToday) {
      trailingMinutes = Math.round((now.getTime() - pendingIn.getTime()) / 60000);
      insideMinutes += trailingMinutes;
    } else {
      // Past day: scanned IN but never OUT → count to end of day, flag it
      insideMinutes += Math.round((new Date(dayEndISO).getTime() - pendingIn.getTime()) / 60000);
      missingOut = true;
    }
  } else if (pendingOut) {
    // Ended while OUTSIDE → went home. Trailing time is NOT counted.
    trailingState = "outside";
    if (isToday) {
      trailingMinutes = Math.round((now.getTime() - pendingOut.getTime()) / 60000);
      // Not added to outsideMinutes yet — only counted if they scan back IN
    }
  }

  return { insideMinutes, outsideMinutes, sessions, missingOut, lastOutTime, trailingState, trailingMinutes };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const viewDateStr = dateParam || todayStr;
    const isToday = viewDateStr === todayStr;

    const dayStart = new Date(`${viewDateStr}T00:00:00+08:00`).toISOString();
    const dayEnd = new Date(`${viewDateStr}T23:59:59+08:00`).toISOString();

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
          .gte("scanned_at", dayStart)
          .lte("scanned_at", dayEnd)
          .order("scanned_at", { ascending: true });

        const emptyResult = {
          ...emp,
          view_date: viewDateStr,
          current_status: "outside",
          current_session_start: null,
          current_session_minutes: 0,
          today_inside_minutes: 0,
          today_outside_minutes: 0,
          last_sessions: [],
          went_home: false,
          missing_out: false,
          last_out_time: null,
        };

        if (!logs || logs.length === 0) return emptyResult;

        const res = processDayLogs(logs, isToday, now, dayEnd);

        let currentStatus = "outside";
        let currentSessionStart = null;
        let currentSessionMinutes = 0;
        let wentHome = false;

        if (res.trailingState === "inside") {
          currentStatus = "inside";
          currentSessionMinutes = res.trailingMinutes;
          currentSessionStart = logs[logs.length - 1].scanned_at;
        } else if (res.trailingState === "outside") {
          currentStatus = "outside";
          currentSessionMinutes = res.trailingMinutes;
          currentSessionStart = res.lastOutTime ? res.lastOutTime.toISOString() : null;
          // Live hint only: currently outside for a long time
          if (isToday && res.trailingMinutes >= WENT_HOME_HINT_MINUTES) {
            wentHome = true;
          }
        }

        return {
          ...emp,
          view_date: viewDateStr,
          current_status: currentStatus,
          current_session_start: currentSessionStart,
          current_session_minutes: currentSessionMinutes,
          today_inside_minutes: res.insideMinutes,
          today_outside_minutes: res.outsideMinutes,
          last_sessions: res.sessions.slice(-3).reverse(),
          went_home: wentHome,
          missing_out: res.missingOut,
          last_out_time: res.lastOutTime ? res.lastOutTime.toISOString() : null,
        };
      })
    );

    return NextResponse.json({ ok: true, employees: employeesWithDurations, view_date: viewDateStr, is_today: isToday });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}