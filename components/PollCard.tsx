'use client';

import { useState } from 'react';
import { voteOnPoll, explorerLink } from '@/lib/soroban';
import { classifyError } from '@/lib/errors';
import type { PollData, TxStatus, AppError } from '@/types/poll';

interface PollCardProps {
  poll: PollData | null;
  senderAddress: string | null;
  onStatusUpdate: (status: TxStatus) => void;
  onError: (error: AppError) => void;
  onVoted: () => void; // triggers a results + has_voted refresh
}

export default function PollCard({ poll, senderAddress, onStatusUpdate, onError, onVoted }: PollCardProps) {
  const [pendingOption, setPendingOption] = useState<number | null>(null);

  async function handleVote(optionIndex: number) {
    if (!senderAddress || !poll || poll.hasVoted) return;
    setPendingOption(optionIndex);
    try {
      const hash = await voteOnPoll(senderAddress, optionIndex, onStatusUpdate);
      onStatusUpdate({
        state: 'success',
        hash,
        message: 'Vote confirmed on testnet.',
        explorerUrl: explorerLink(hash),
      });
      onVoted();
    } catch (err) {
      const classified = classifyError(err);
      onError(classified);
      onStatusUpdate({ state: 'error', hash: null, message: classified.message, explorerUrl: null });
    } finally {
      setPendingOption(null);
    }
  }

  if (!poll) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-6">
        <span className="text-xs uppercase tracking-widest text-mute">Poll</span>
        <p className="mt-3 text-sm text-mute">Loading poll from the contract…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <span className="text-xs uppercase tracking-widest text-mute">Poll</span>
      <h2 className="mt-2 font-display text-xl text-ink">{poll.question}</h2>

      <div className="mt-4 flex flex-col gap-2">
        {poll.options.map((option, index) => (
          <button
            key={option}
            onClick={() => handleVote(index)}
            disabled={!senderAddress || poll.hasVoted || pendingOption !== null}
            className="flex items-center justify-between rounded-lg border border-line bg-void px-4 py-2.5 text-left text-sm text-ink transition hover:border-lumen disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{option}</span>
            {pendingOption === index && <span className="text-xs text-lumen">Voting…</span>}
          </button>
        ))}
      </div>

      {poll.hasVoted && <p className="mt-4 text-xs text-lumen">You've already voted on this poll.</p>}
      {!senderAddress && <p className="mt-4 text-xs text-mute">Connect a wallet to vote.</p>}
    </div>
  );
}
