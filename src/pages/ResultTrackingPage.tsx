import { BarChart3, CheckCircle2, Clock3 } from 'lucide-react';
import { trackedResults } from '../mocks/predictionMocks';

const ResultTrackingPage = () => {
  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Result Tracking</p>
            <h1 className="text-headline-lg font-bold text-primary">Track prediction results</h1>
            <p className="max-w-2xl text-body-md text-on-surface-variant">Review finished races, settlement status, and score your prediction performance in one clear dashboard.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#111111]">
            View full leaderboard
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Performance</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction earnings</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-secondary-container px-4 py-3 text-sm font-semibold text-secondary">Total score 4.8/5</div>
                  <div className="rounded-2xl bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface-variant">Net gain +520 pts</div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 mt-6">
                {[
                  { label: 'Settled', value: '18', accent: 'bg-[#d6e3ff] text-[#0d1c32]' },
                  { label: 'Won', value: '12', accent: 'bg-[#85f8c4] text-[#005137]' },
                  { label: 'Lost', value: '6', accent: 'bg-[#ffdad6] text-[#93000a]' }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-outline-variant bg-surface-container p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{stat.label}</p>
                    <p className={`mt-3 text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Tracked results</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Recent race settlements</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant">
                  <Clock3 className="w-4 h-4" /> Updated now
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Race</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider">Winner</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Time</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Prize</th>
                      <th className="px-6 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Prediction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {trackedResults.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 text-body-sm font-semibold text-primary">{item.raceName}</td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{item.winner}</td>
                        <td className="px-6 py-4 text-right text-body-sm font-mono text-on-surface-variant">{item.finishTime}</td>
                        <td className="px-6 py-4 text-right text-body-sm font-semibold text-secondary">{item.prize}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${item.predictionStatus === 'Won' ? 'bg-[#85f8c4] text-[#005137]' : item.predictionStatus === 'Lost' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#ffe088] text-[#574500]'}`}>
                            {item.predictionStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Insights</p>
                  <h2 className="mt-2 text-2xl font-bold text-primary">Prediction health</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-5">
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Average odds accuracy</p>
                  <p className="mt-2 text-2xl font-bold text-primary">68%</p>
                </div>
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Win ratio</p>
                  <p className="mt-2 text-2xl font-bold text-primary">67%</p>
                </div>
                <div className="rounded-2xl bg-surface-container p-4">
                  <p className="text-sm text-on-surface-variant">Latest settled prediction</p>
                  <p className="mt-2 text-body-lg font-semibold text-primary">Silver Arrow • 1st place</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-bold text-primary">Settlement rules</h3>
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-4">Only predictions placed before `prediction_closes_at` are eligible.</li>
                <li className="rounded-2xl bg-surface-container p-4">Points are updated once RaceResults are published.</li>
                <li className="rounded-2xl bg-surface-container p-4">Lost predictions are still recorded for performance tracking.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ResultTrackingPage;
