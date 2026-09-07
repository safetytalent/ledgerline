"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form
        onSubmit={handleLogin}
        className="bg-white border border-line rounded-sm p-8 w-full max-w-sm"
      >
        <h1 className="font-display text-2xl font-medium mb-1">Ledgerline</h1>
        <p className="text-[13px] text-[#6B675E] mb-6">Sign in to your dashboard</p>

        {error && (
          <div className="bg-rustSoft text-rust text-[13px] px-3 py-2 rounded-sm mb-4">
            {error}
          </div>
        )}

        <label className="block text-[12.5px] font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2 mb-4 text-[14px]"
        />

        <label className="block text-[12.5px] font-medium mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2 mb-6 text-[14px]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-white text-[14px] font-medium py-2.5 rounded-sm disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
