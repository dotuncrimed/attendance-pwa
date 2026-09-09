// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function formatDateTimeUTC8(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

function processDayLogs(logs, isToday, now, dayEndISO) {
  let insideMinutes = 0;
  let outsideMinutes = 0;
  let pendingIn = null;
  let pendingOut = null;
  let missingOut = false;

  for (const log of logs) {
    const t = new Date(log.scanned_at);
    if (log.direction === "in") {
      // Count the FULL outside gap (no threshold) since they came back
      if (pendingOut) {
        outsideMinutes += Math.round((t.getTime() - pendingOut.getTime()) / 60000);
        pendingOut = null;
      }
      pendingIn = t;
    } else {
      if (pendingIn) {
        insideMinutes += Math.round((t.getTime() - pendingIn.getTime()) / 60000);
        pendingIn = null;
      }
      pendingOut = t;
    }
  }

  if (pendingIn && !pendingOut) {
    if (isToday) {
      insideMinutes += Math.round((now.getTime() - pendingIn.getTime()) / 60000);
    } else {
      insideMinutes += Math.round((new Date(dayEndISO).getTime() - pendingIn.getTime()) / 60000);
      missingOut = true;
    }
  }
  // Trailing outside (went home) is not counted

  return { insideMinutes, outsideMinutes, missingOut };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const dateParam = searchParams.get("date");

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    let rangeStart;
    let periodLabel;

    if (dateParam) {
      rangeStart = new Date(`${dateParam}T00:00:00+08:00`);
      periodLabel = `Date: ${dateParam}`;
    } else if (period === "week") {
      const todayDate = new Date(`${todayStr}T00:00:00+08:00`);
      todayDate.setDate(todayDate.getDate() - todayDate.getDay());
      rangeStart = todayDate;
      periodLabel = "This Week";
    } else if (period === "month") {
      rangeStart = new Date(`${todayStr.substring(0, 7)}-01T00:00:00+08:00`);
      periodLabel = "This Month";
    } else {
      rangeStart = new Date(`${todayStr}T00:00:00+08:00`);
      periodLabel = "Today";
    }

    const rangeStartISO = rangeStart.toISOString();
    const singleDay = dateParam ? dateParam : (period === "today" ? todayStr : null);

    const { data: employees } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("employee_no");

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        let query = supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .gte("scanned_at", rangeStartISO)
          .order("scanned_at", { ascending: true });

        if (singleDay) {
          query = query.lte("scanned_at", `${singleDay}T23:59:59+08:00`);
        }

        const { data: logs } = await query;

        if (!logs || logs.length === 0) {
          return {
            employee_no: emp.employee_no,
            full_name: emp.full_name,
            department: emp.department || "",
            inside_formatted: "0h 0m",
            outside_formatted: "0h 0m",
            days_present: 0,
            last_log_direction: "N/A",
            last_log_time: "No logs",
            missing_out_days: 0,
          };
        }

        // Group logs by day (UTC+8) and process each day
        const byDay = {};
        for (const log of logs) {
          const dayKey = new Date(log.scanned_at).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
          if (!byDay[dayKey]) byDay[dayKey] = [];
          byDay[dayKey].push(log);
        }

        let totalInside = 0;
        let totalOutside = 0;
        let missingOutDays = 0;

        for (const dayKey of Object.keys(byDay).sort()) {
          const isToday = dayKey === todayStr;
          const dayEnd = `${dayKey}T23:59:59+08:00`;
          const res = processDayLogs(byDay[dayKey], isToday, now, dayEnd);
          totalInside += res.insideMinutes;
          totalOutside += res.outsideMinutes;
          if (res.missingOut) missingOutDays++;
        }

        const lastLog = logs[logs.length - 1];
        const ih = Math.floor(totalInside / 60);
        const im = totalInside % 60;
        const oh = Math.floor(totalOutside / 60);
        const om = totalOutside % 60;

        return {
          employee_no: emp.employee_no,
          full_name: emp.full_name,
          department: emp.department || "",
          inside_formatted: `${ih}h ${im}m`,
          outside_formatted: `${oh}h ${om}m`,
          days_present: Object.keys(byDay).length,
          last_log_direction: lastLog.direction === "in" ? "IN" : "OUT",
          last_log_time: formatDateTimeUTC8(lastLog.scanned_at),
          missing_out_days: missingOutDays,
        };
      })
    );

    const headers = [
      "Employee No",
      "Employee Name",
      "Department",
      `Total Inside (${periodLabel})`,
      `Total Outside (${periodLabel})`,
      "Days Present",
      "Last Log Direction",
      "Last Log Time (UTC+8)",
      "Missing OUT Days",
    ];

    const rows = summaries.map(s => [
      s.employee_no,
      s.full_name,
      s.department,
      s.inside_formatted,
      s.outside_formatted,
      s.days_present,
      s.last_log_direction,
      s.last_log_time,
      s.missing_out_days,
    ]);

    const csvContent = [
      `Duration Summary Report - ${periodLabel}`,
      `Generated: ${formatDateTimeUTC8(now.toISOString())} (UTC+8)`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const fileTag = dateParam ? dateParam : period;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="duration_summary_${fileTag}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}