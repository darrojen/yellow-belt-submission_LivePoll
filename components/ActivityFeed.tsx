import type { VoteEvent } from '@/types/poll';

function shorten(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function ActivityFeed({ events, options }: { events: VoteEvent[]; options: string[] }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <span className="text-xs uppercase tracking-widest text-mute">Activity</span>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No votes yet. Events stream here as they land on-chain.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {events
            .slice()
            .reverse()
            .slice(0, 8)
            .map((event, i) => (
              <li key={`${event.voter}-${event.ledger}-${i}`} className="flex items-center justify-between text-xs">
                <span className="font-mono text-mute">{shorten(event.voter)}</span>
                <span className="text-ink">voted {options[event.optionIndex] ?? `#${event.optionIndex}`}</span>
                <span className="font-mono text-mute">ledger {event.ledger}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
