import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0D4424 0%, #1A6B3A 60%, #2d9e5a 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-4">
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Natureza Sem Barreiras</h1>
          <p className="text-green-200 mt-1 text-sm">ADEMO-Sofala · Gorongosa · 2025</p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          <Link href="/ficha-a" className="block bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "#D6EAD8" }}>🏕️</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ficha A</p>
                <h2 className="text-lg font-bold text-gray-800">Levantamento no Parque</h2>
                <p className="text-sm text-gray-500">Barreiras físicas, comunicacionais e atitudinais no PNG</p>
              </div>
            </div>
          </Link>

          <Link href="/ficha-b" className="block bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "#D6EAD8" }}>👥</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ficha B</p>
                <h2 className="text-lg font-bold text-gray-800">Grupo Focal — Comunidades</h2>
                <p className="text-sm text-gray-500">Motivos de exclusão das PcD do turismo</p>
              </div>
            </div>
          </Link>

          <Link href="/login" className="block bg-white/10 border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-base font-semibold text-white">Dashboard & Relatórios</h2>
                <p className="text-sm text-green-200">Acesso restrito — coordenação ADEMO</p>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-green-300 text-xs mt-8">
          Os dados são enviados em tempo real para a coordenação.
        </p>
      </div>
    </main>
  );
}
