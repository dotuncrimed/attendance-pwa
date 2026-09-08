// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function DELETE(request) {
  try {
    const { monthsToKeep } = await request.json();
    
    if (!monthsToKeep || monthsToKeep < 1) {
      return NextResponse.json({ ok: false, error: "Please specify months to keep (minimum 1)" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffISO = cutoffDate.toISOString();

    // Delete logs older than the cutoff date
    const { data, error } = await supabase
      .from("attendance_logs")
      .delete()
      .lt("scanned_at", cutoffISO);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Successfully deleted logs older than ${monthsToKeep} month(s)`,
      cutoffDate: cutoffISO 
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}