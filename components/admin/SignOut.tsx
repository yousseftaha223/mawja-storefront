"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
export default function SignOut() {
  return <button className="text-sm underline" onClick={async () => { await supabaseBrowser().auth.signOut(); location.href = "/admin/login"; }}>Sign out</button>;
}
