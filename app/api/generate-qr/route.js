import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json({ ok: false, error: "Employee ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Generate a random secure token
    const randomToken = randomBytes(32).toString("hex");
    const qrContent = `ATT1:${randomToken}`;
    
    // Hash it for storage in the database
    const tokenHash = createHash("sha256").update(qrContent).digest("hex");

    // Deactivate old tokens for this employee (so only one QR works at a time)
    await supabase
      .from("qr_tokens")
      .update({ active: false })
      .eq("employee_id", employeeId);

    // Insert new token
    const { data, error } = await supabase
      .from("qr_tokens")
      .insert({
        employee_id: employeeId,
        token_hash: tokenHash,
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, qrContent });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}