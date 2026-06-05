import { ArrowRight, Clock3, Ticket, TrendingUp } from 'lucide-react';
import { activePredictions, openPredictions } from '../mocks/predictionMocks';

const PredictionPage = () => {
  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div className="space-y-3">
            <p className="text-headline-lg font-bold text-primary mb-2">Prediction Center</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-white transition hover:bg-secondary-container/90">
            New Prediction
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Wallet</p>
                  <h2 className="mt-2 text-3xl font-bold text-primary">1,420 pts</h2>
                </div>
                <div className="rounded-2xl bg-secondary-container px-4 py-3 text-sm font-semibold text-secondary">Available balance</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Open predictions', value: '03', color: 'bg-surface-container-highest text-primary' },
                  { label: 'Pending', value: '21', color: 'bg-[#ffe088] text-[#574500]' },
                  { label: 'Settled', value: '87', color: 'bg-[#d6e3ff] text-[#0d1c32]' }
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-outline-variant bg-surface-container p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{item.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Open races</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction windows</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> Closing soon
                </div>
              </div>

              <div className="space-y-4">
                {openPredictions.map((race) => (
                  <article key={race.id} className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 transition hover:border-secondary hover:bg-white">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{race.track} • {race.date}</p>
                        <h3 className="mt-2 text-xl font-semibold text-primary">{race.raceName}</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">Grade {race.grade} • {race.surface}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-secondary-container px-3 py-1 text-sm font-semibold text-secondary">Closes {race.closesAt}</span>
                        <span className="rounded-full bg-[#ffe088] px-3 py-1 text-sm font-semibold text-[#574500]">Odds {race.odds}</span>
                        <button className="rounded-full bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-[#222222] transition">Predict</button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                      <span>Favorite: {race.favoriteHorse}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1">{race.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Active predictions</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Your current stakes</h2>
                </div>
                <Ticket className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-4">
                {activePredictions.map((prediction) => (
                  <article key={prediction.id} className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{prediction.raceName}</h3>
                        <p className="text-sm text-on-surface-variant">{prediction.selection} • {prediction.jockey}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${prediction.status === 'Pending' ? 'bg-[#ffe088] text-[#574500]' : prediction.status === 'Won' ? 'bg-[#85f8c4] text-[#005137]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                        {prediction.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-on-surface-variant">
                      <span>{prediction.stake} stake</span>
                      <span>{prediction.points} points</span>
                    </div>
                    <p className="mt-3 text-sm text-on-surface-variant">{prediction.result}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Prediction tips</p>
                  <h2 className="mt-2 text-xl font-bold text-primary">Quick strategy</h2>
                </div>
                <TrendingUp className="h-5 w-5 text-tertiary" />
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-4">Choose one horse with best odds and recent form.</li>
                <li className="rounded-2xl bg-surface-container p-4">Always check prediction close time before placing a stake.</li>
                <li className="rounded-2xl bg-surface-container p-4">Manage points to keep enough balance for late selections.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
