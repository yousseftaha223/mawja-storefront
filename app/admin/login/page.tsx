"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Btn, Field, inputCls } from "@/components/admin/ui";

export default function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: pw });
    if (error) { setErr("Incorrect email or password."); setBusy(false); } else location.href = "/admin";
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-5">
      <form onSubmit={go} className="w-full max-w-sm space-y-4 rounded-2xl bg-ivory p-7">
        <img src="/brand/mawja-logo.png" alt="Mawja" className="h-7 w-auto" />
        <h1 className="font-serif text-3xl">Dashboard sign in</h1>
        <Field label="Email"><input type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input type="password" required autoComplete="current-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <Btn disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Btn>
      </form>
    </main>
  );
}
