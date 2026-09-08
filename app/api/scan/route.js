import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { qr, entrance, deviceId, idempotencyKey, directionOverride } = await request.json();

    if (!qr) {
      return NextResponse.json({ ok: false, error: "QR code is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Hash the QR token to match the database
    const tokenHash = createHash("sha256").update(qr).digest("hex");

    // 2. Find the token in the database
    const { data: token, error: tokenError } = await supabase
      .from("qr_tokens")
      .select("*, employees(*)")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .single();

    if (tokenError || !token) {
      return NextResponse.json({ ok: false, error: "Invalid or inactive QR code" }, { status: 404 });
    }

    const employee = token.employees;

    if (!employee.active) {
      return NextResponse.json({ ok: false, error: "Employee is not active" }, { status: 403 });
    }

    // 3. Determine Direction (IN or OUT)
    let direction = directionOverride;

    if (!direction) {
      const { data: lastLog, error: logError } = await supabase
        .from("attendance_logs")
        .select("direction")
        .eq("employee_id", employee.id)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastLog) {
        // If last log was IN, next is OUT. If last was OUT, next is IN.
        direction = lastLog.direction === "in" ? "out" : "in";
      } else {
        direction = "in"; // Default to IN if no previous logs
      }
    }

    // 4. Prevent duplicate scans within 30 seconds
    const { data: recentLog } = await supabase
      .from("attendance_logs")
      .select("direction, scanned_at")
      .eq("employee_id", employee.id)
      .eq("direction", direction)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLog) {
      const lastTime = new Date(recentLog.scanned_at).getTime();
      const now = new Date().getTime();
      const diffSeconds = (now - lastTime) / 1000;

      if (diffSeconds < 30) {
        return NextResponse.json({ ok: false, error: "Duplicate scan. Please wait." }, { status: 429 });
      }
    }

    // 5. Insert the new log
    const { data: newLog, error: insertError } = await supabase
      .from("attendance_logs")
      .insert({
        employee_id: employee.id,
        direction: direction,
        entrance: entrance || "Main Gate",
        device_id: deviceId || "web-pwa",
        source: "qr",
        idempotency_key: idempotencyKey || crypto.randomUUID(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      employee: {
        employee_no: employee.employee_no,
        full_name: employee.full_name,
        department: employee.department,
        photo_url: employee.photo_url,
      },
      direction: direction,
      scanned_at: newLog.scanned_at,
    });

  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}