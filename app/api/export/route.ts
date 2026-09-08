// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function formatDateTimeUTC8(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
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

function formatDateUTC8(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

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

    if (startDate) {
      query = query.gte("scanned_at", `${startDate}T00:00:00+08:00`);
    }
    if (endDate) {
      query = query.lte("scanned_at", `${endDate}T23:59:59+08:00`);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const headers = ["Date (UTC+8)", "Time (UTC+8)", "Employee No", "Employee Name", "Department", "Direction", "Entrance"];
    const rows = logs.map(log => [
      formatDateUTC8(log.scanned_at),
      formatTimeUTC8(log.scanned_at),
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