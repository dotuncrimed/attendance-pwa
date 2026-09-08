// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("attendance_logs")
      .select("*, employees(employee_no, full_name, department)")
      .order("scanned_at", { ascending: false });

    // Apply date filters
    if (startDate) {
      query = query.gte("scanned_at", `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte("scanned_at", `${endDate}T23:59:59`);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Generate CSV
    const headers = ["Date", "Time", "Employee No", "Employee Name", "Department", "Direction", "Entrance"];
    const rows = logs.map(log => [
      new Date(log.scanned_at).toLocaleDateString(),
      new Date(log.scanned_at).toLocaleTimeString(),
      log.employees?.employee_no || "",
      log.employees?.full_name || "",
      log.employees?.department || "",
      log.direction === "in" ? "IN" : "OUT",
      log.entrance || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    if (format === "json") {
      return NextResponse.json({ ok: true, logs });
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}