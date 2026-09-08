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
      .eq("active", true)
      .order("employee_no");

    if (empError) {
      return NextResponse.json({ ok: false, error: empError.message }, { status: 500 });
    }

    // For each employee, get their last scan to determine current status
    const employeesWithStatus = await Promise.all(
      employees.map(async (emp: any) => {
        const { data: lastLog } = await supabase
          .from("attendance_logs")
          .select("direction, scanned_at")
          .eq("employee_id", emp.id)
          .order("scanned_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...emp,
          current_status: lastLog ? (lastLog.direction === "in" ? "inside" : "outside") : "outside",
          last_scan_time: lastLog ? lastLog.scanned_at : null,
          last_direction: lastLog ? lastLog.direction : null,
        };
      })
    );

    return NextResponse.json({ ok: true, employees: employeesWithStatus });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}