"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, setToken } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await auth.login(email, password);
      setToken(tokens.accessToken);
      router.push("/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-1"
            style={{ color: "#C9A84C" }}
          >
            Orpailleur
          </h1>
          <p className="text-slate-400 text-sm">Pilot — Administration</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700"
        >
          <h2 className="text-white font-semibold text-lg mb-6">
            Connexion admin
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="admin@orpailleur.com"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#C9A84C" }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </div>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Accès réservé aux administrateurs Orpailleur
        </p>
      </div>
    </div>
  );
}
