import type { PollData } from '@/types/poll';

export default function ResultsLive({ poll, isLive }: { poll: PollData | null; isLive: boolean }) {
  if (!poll) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-6">
        <span className="text-xs uppercase tracking-widest text-mute">Results</span>
        <p className="mt-3 text-sm text-mute">Waiting on the contract…</p>
      </div>
    );
  }

  const total = poll.results.reduce((sum, n) => sum + n, 0);

  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-mute">Results</span>
        <span className="flex items-center gap-1.5 text-xs text-mute">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-lumen' : 'bg-mute'}`} />
          {isLive ? 'Live' : 'Idle'}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {poll.options.map((option, index) => {
          const count = poll.results[index] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={option}>
              <div className="mb-1 flex items-center justify-between text-xs text-mute">
                <span>{option}</span>
                <span className="font-mono text-ink">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-void">
                <div
                  className="h-full rounded-full bg-lumen transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-mute">{total} total vote{total === 1 ? '' : 's'}</p>
    </div>
  );
}
