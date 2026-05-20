import Logo from './Logo';

export default function AppLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#050816] px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.2),transparent_34%),radial-gradient(circle_at_55%_62%,rgba(249,115,22,0.16),transparent_30%)]" />
      <section className="relative flex flex-col items-center gap-6 text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <span className="absolute inset-0 rounded-[2rem] border border-orange-500/25 animate-loader-orbit" />
          <span className="absolute inset-3 rounded-[1.65rem] bg-blue-500/10 blur-xl animate-loader-glow" />
          <div className="relative animate-loader-float">
            <Logo compact className="scale-125" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-display text-xl font-black tracking-tight">Fundilink</p>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Loading workspace</p>
        </div>
      </section>
    </main>
  );
}
