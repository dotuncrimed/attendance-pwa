import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // This simpler command just grabs all the IDs and counts them
    const { data, error } = await supabase
      .from("employees")
      .select("id");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const count = data ? data.length : 0;

    return NextResponse.json({ ok: true, employees: count });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}