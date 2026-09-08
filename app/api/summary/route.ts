// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = getSupabaseAdmin();

    // Get all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true);

    const summaries = await Promise.all(
      employees.map(async (emp) => {
        let query = supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .order("scanned_at", { ascending: true });

        if (startDate) {
          query = query.gte("scanned_at", `${startDate}T00:00:00`);
        }
        if (endDate) {
          query = query.lte("scanned_at", `${endDate}T23:59:59`);
        }

        const { data: logs } = await query;

        if (!logs || logs.length === 0) {
          return {
            ...emp,
            total_scans: 0,
            total_in_scans: 0,
            total_out_scans: 0,
            total_inside_minutes: 0,
            total_inside_formatted: "0h 0m",
            days_present: 0,
          };
        }

        // Calculate totals
        let totalInsideMinutes = 0;
        let currentIn = null;
        const daysPresent = new Set();

        for (const log of logs) {
          const logDate = new Date(log.scanned_at).toDateString();
          
          if (log.direction === "in") {
            currentIn = new Date(log.scanned_at);
            daysPresent.add(logDate);
          } else if (log.direction === "out" && currentIn) {
            const outTime = new Date(log.scanned_at);
            const durationMs = outTime.getTime() - currentIn.getTime();
            totalInsideMinutes += Math.round(durationMs / 60000);
            currentIn = null;
          }
        }

        // If still inside (no OUT scan), count until now
        if (currentIn) {
          const now = new Date();
          totalInsideMinutes += Math.round((now.getTime() - currentIn.getTime()) / 60000);
        }

        const hours = Math.floor(totalInsideMinutes / 60);
        const mins = totalInsideMinutes % 60;

        return {
          ...emp,
          total_scans: logs.length,
          total_in_scans: logs.filter(l => l.direction === "in").length,
          total_out_scans: logs.filter(l => l.direction === "out").length,
          total_inside_minutes: totalInsideMinutes,
          total_inside_formatted: `${hours}h ${mins}m`,
          days_present: daysPresent.size,
        };
      })
    );

    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}