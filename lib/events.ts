import { scValToNative } from '@stellar/stellar-sdk';
import { server, CONTRACT_ID } from './soroban';
import type { VoteEvent } from '@/types/poll';

/** Latest ledger known to Soroban RPC — used as a starting point for the first poll. */
export async function getLatestLedger(): Promise<number> {
  const { sequence } = await server.getLatestLedger();
  return sequence;
}

/**
 * Fetches `vote` events emitted by the poll contract since `startLedger`.
 * Soroban RPC only retains recent ledgers (a rolling window, typically a
 * few days on testnet), which is plenty for a live demo.
 */
export async function fetchVoteEvents(
  startLedger: number
): Promise<{ events: VoteEvent[]; latestLedger: number }> {
  if (!CONTRACT_ID) return { events: [], latestLedger: startLedger };

  const response = await server.getEvents({
    startLedger,
    filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
    limit: 50,
  });

  const events: VoteEvent[] = response.events
    .filter((e) => e.topic?.length && safeDecode(e.topic[0]) === 'vote')
    .map((e) => {
      const voter = safeDecode(e.topic[1]) as string;
      const decoded = safeDecode(e.value) as [number, number];
      const [optionIndex, newCount] = decoded ?? [0, 0];
      return { voter, optionIndex, newCount, ledger: e.ledger };
    });

  return { events, latestLedger: response.latestLedger };
}

function safeDecode(value: unknown) {
  try {
    return scValToNative(value as any);
  } catch {
    return null;
  }
}
