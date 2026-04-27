type SchwarzesTorViewProps = {
  onNavigateHome?: () => void;
};

export const SchwarzesTorView = ({ onNavigateHome }: SchwarzesTorViewProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white/10 border border-white/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Schwarzes Tor</h1>
        <p className="text-sm sm:text-base text-white/85 leading-relaxed mb-6">
          Das Schwarze Tor war ein wichtiger Zugang zur historischen Stadt. Der Ort steht für den Übergang zwischen alter Stadtstruktur und heutiger Nutzung. Achte vor Ort auf Mauerwerk, Proportionen und die Wegeführung rund um das Tor - hier lassen sich viele Spuren der Stadtgeschichte entdecken.
        </p>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:bg-white/90 transition-colors"
        >
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  );
};

export default SchwarzesTorView;