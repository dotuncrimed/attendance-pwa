// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Helper function to format date in UTC+8
function formatDateTimeUTC8(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila", // UTC+8
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatTimeUTC8(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";

    const supabase = getSupabaseAdmin();

    // Calculate date range based on period (using UTC+8)
    const now = new Date();
    let startDate = new Date();
    let periodLabel = "";

    if (period === "today") {
      // Get today's start in UTC+8
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      startDate = new Date(`${todayStr}T00:00:00+08:00`);
      periodLabel = "Today";
    } else if (period === "week") {
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const todayDate = new Date(`${todayStr}T00:00:00+08:00`);
      const dayOfWeek = todayDate.getDay();
      todayDate.setDate(todayDate.getDate() - dayOfWeek);
      startDate = todayDate;
      periodLabel = "This Week";
    } else if (period === "month") {
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const yearMonth = todayStr.substring(0, 7);
      startDate = new Date(`${yearMonth}-01T00:00:00+08:00`);
      periodLabel = "This Month";
    }

    const startDateISO = startDate.toISOString();

    // Get all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("employee_no");

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        const { data: logs } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .gte("scanned_at", startDateISO)
          .order("scanned_at", { ascending: true });

        // Get the very last log
        const { data: lastLogAll } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .order("scanned_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!logs || logs.length === 0) {
          return {
            employee_no: emp.employee_no,
            full_name: emp.full_name,
            department: emp.department || "",
            inside_formatted: "0h 0m",
            outside_formatted: "0h 0m",
            last_log_direction: lastLogAll ? (lastLogAll.direction === "in" ? "IN" : "OUT") : "N/A",
            last_log_time: lastLogAll ? formatDateTimeUTC8(lastLogAll.scanned_at) : "No logs",
            total_scans: 0,
          };
        }

        let insideMinutes = 0;
        let outsideMinutes = 0;
        let currentIn = null;
        let currentOut = null;

        for (const log of logs) {
          if (log.direction === "in") {
            currentIn = new Date(log.scanned_at);
            if (currentOut) {
              const outsideMs = currentIn.getTime() - currentOut.getTime();
              outsideMinutes += Math.round(outsideMs / 60000);
            }
            currentOut = null;
          } else if (log.direction === "out") {
            currentOut = new Date(log.scanned_at);
            if (currentIn) {
              const insideMs = currentOut.getTime() - currentIn.getTime();
              insideMinutes += Math.round(insideMs / 60000);
            }
            currentIn = null;
          }
        }

        if (currentIn && !currentOut) {
          const nowTime = new Date();
          insideMinutes += Math.round((nowTime.getTime() - currentIn.getTime()) / 60000);
        }

        if (currentOut && !currentIn) {
          const nowTime = new Date();
          outsideMinutes += Math.round((nowTime.getTime() - currentOut.getTime()) / 60000);
        }

        const insideHours = Math.floor(insideMinutes / 60);
        const insideMins = insideMinutes % 60;
        const outsideHours = Math.floor(outsideMinutes / 60);
        const outsideMins = outsideMinutes % 60;

        return {
          employee_no: emp.employee_no,
          full_name: emp.full_name,
          department: emp.department || "",
          inside_formatted: `${insideHours}h ${insideMins}m`,
          outside_formatted: `${outsideHours}h ${outsideMins}m`,
          last_log_direction: lastLogAll ? (lastLogAll.direction === "in" ? "IN" : "OUT") : "N/A",
          last_log_time: lastLogAll ? formatDateTimeUTC8(lastLogAll.scanned_at) : "No logs",
          total_scans: logs.length,
        };
      })
    );

    // Generate CSV
    const headers = [
      "Employee No",
      "Employee Name",
      "Department",
      `Total Inside (${periodLabel})`,
      `Total Outside (${periodLabel})`,
      "Last Log Direction",
      "Last Log Time (UTC+8)",
      "Total Scans",
    ];

    const rows = summaries.map(s => [
      s.employee_no,
      s.full_name,
      s.department,
      s.inside_formatted,
      s.outside_formatted,
      s.last_log_direction,
      s.last_log_time,
      s.total_scans,
    ]);

    const nowFormatted = formatDateTimeUTC8(now.toISOString());

    const csvContent = [
      `Duration Summary Report - ${periodLabel}`,
      `Generated: ${nowFormatted} (UTC+8)`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="duration_summary_${period}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}