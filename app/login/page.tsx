"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch {
      setError("Email ou palavra-passe incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0D4424 0%, #1A6B3A 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌿</span>
          <h1 className="text-2xl font-bold text-white mt-3">Dashboard ADEMO-Sofala</h1>
          <p className="text-green-200 text-sm mt-1">Acesso restrito — coordenação</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              type="email" required
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="coordenacao@ademo.org"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Palavra-passe</label>
            <input
              type="password" required
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold transition-all disabled:opacity-60"
            style={{ background: "#1A6B3A" }}>
            {loading ? "A entrar..." : "Entrar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
