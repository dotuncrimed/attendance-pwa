// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today"; // today, week, month

    const supabase = getSupabaseAdmin();

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    let periodLabel = "";

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
      periodLabel = "Today";
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = "This Week";
    } else if (period === "month") {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
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
        // Get all logs for this employee in the period
        const { data: logs } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .gte("scanned_at", startDateISO)
          .order("scanned_at", { ascending: true });

        // Get the very last log (regardless of period)
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
            inside_minutes: 0,
            inside_formatted: "0h 0m",
            outside_minutes: 0,
            outside_formatted: "0h 0m",
            last_log_direction: lastLogAll ? (lastLogAll.direction === "in" ? "IN" : "OUT") : "N/A",
            last_log_time: lastLogAll ? new Date(lastLogAll.scanned_at).toLocaleString() : "No logs",
            total_scans: 0,
          };
        }

        // Calculate inside and outside time
        let insideMinutes = 0;
        let outsideMinutes = 0;
        let currentIn = null;
        let currentOut = null;

        for (const log of logs) {
          if (log.direction === "in") {
            currentIn = new Date(log.scanned_at);
            
            // If there was a previous OUT, calculate outside time
            if (currentOut) {
              const outsideMs = currentIn.getTime() - currentOut.getTime();
              outsideMinutes += Math.round(outsideMs / 60000);
            }
            currentOut = null;

          } else if (log.direction === "out") {
            currentOut = new Date(log.scanned_at);
            
            // If there was a previous IN, calculate inside time
            if (currentIn) {
              const insideMs = currentOut.getTime() - currentIn.getTime();
              insideMinutes += Math.round(insideMs / 60000);
            }
            currentIn = null;
          }
        }

        // If currently inside (no OUT yet), count until now
        if (currentIn && !currentOut) {
          const nowTime = new Date();
          insideMinutes += Math.round((nowTime.getTime() - currentIn.getTime()) / 60000);
        }

        // If currently outside (no IN yet), count until now
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
          inside_minutes: insideMinutes,
          inside_formatted: `${insideHours}h ${insideMins}m`,
          outside_minutes: outsideMinutes,
          outside_formatted: `${outsideHours}h ${outsideMins}m`,
          last_log_direction: lastLogAll ? (lastLogAll.direction === "in" ? "IN" : "OUT") : "N/A",
          last_log_time: lastLogAll ? new Date(lastLogAll.scanned_at).toLocaleString() : "No logs",
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
      "Last Log Time",
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

    const csvContent = [
      `Duration Summary Report - ${periodLabel}`,
      `Generated: ${now.toLocaleString()}`,
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