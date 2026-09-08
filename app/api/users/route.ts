// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET all users
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all auth users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    // Get their profiles to see their roles (admin/guard)
    const { data: profiles } = await supabase.from("profiles").select("id, role, full_name, active");
    const profileMap = {};
    profiles.forEach(p => profileMap[p.id] = p);

    // Combine them
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      role: profileMap[u.id]?.role || "guard",
      full_name: profileMap[u.id]?.full_name || "",
      active: profileMap[u.id]?.active !== false
    }));

    return NextResponse.json({ ok: true, users: mappedUsers });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST create a new user
export async function POST(request) {
  try {
    const { email, password, full_name, role } = await request.json();
    const supabase = getSupabaseAdmin();

    // 1. Create the Auth User (auto-confirm so they can login immediately)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, 
      user_metadata: { full_name }
    });
    if (error) throw error;

    const userId = data.user.id;

    // 2. Create their Profile (Admin/Guard role)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: full_name || "",
      role: role || "guard",
      active: true
    });
    if (profileError) throw profileError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const supabase = getSupabaseAdmin();

    // Delete the Auth User (this automatically deletes their profile too)
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}