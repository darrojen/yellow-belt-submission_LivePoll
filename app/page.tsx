'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WalletConnectMulti from '@/components/WalletConnectMulti';
import PollCard from '@/components/PollCard';
import ResultsLive from '@/components/ResultsLive';
import ActivityFeed from '@/components/ActivityFeed';
import TransactionStatus from '@/components/TransactionStatus';
import ErrorBanner from '@/components/ErrorBanner';
import { getPollQuestion, getPollOptions, getPollResults, getHasVoted } from '@/lib/soroban';
import { getLatestLedger, fetchVoteEvents } from '@/lib/events';
import { classifyError } from '@/lib/errors';
import type { WalletState, PollData, TxStatus, AppError, VoteEvent } from '@/types/poll';

const EMPTY_WALLET: WalletState = { isConnected: false, address: null, walletId: null };
const EMPTY_TX: TxStatus = { state: 'idle', hash: null, message: null, explorerUrl: null };

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>(EMPTY_TX);
  const [appError, setAppError] = useState<AppError | null>(null);
  const [events, setEvents] = useState<VoteEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const cursorLedger = useRef<number | null>(null);

  const loadPoll = useCallback(async (address: string | null) => {
    try {
      const [question, options, results] = await Promise.all([
        getPollQuestion(),
        getPollOptions(),
        getPollResults(),
      ]);
      const hasVoted = address ? await getHasVoted(address) : false;
      setPoll({ question, options, results, hasVoted });
    } catch (err) {
      setAppError(classifyError(err));
    }
  }, []);

  // Initial load, and reload `hasVoted` whenever the connected wallet changes.
  useEffect(() => {
    loadPoll(wallet.address);
  }, [wallet.address, loadPoll]);

  // Anchor the event-polling cursor near the current ledger on mount.
  useEffect(() => {
    getLatestLedger()
      .then((ledger) => {
        cursorLedger.current = Math.max(ledger - 100, 1);
        setIsLive(true);
      })
      .catch(() => {
        cursorLedger.current = null;
        setIsLive(false);
      });
  }, []);

  // Poll Soroban RPC for new `vote` events every few seconds and fold them
  // into the activity feed and results, so the UI updates as votes land
  // on-chain without a manual refresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (cursorLedger.current === null) return;
      try {
        const { events: newEvents, latestLedger } = await fetchVoteEvents(cursorLedger.current);
        if (newEvents.length > 0) {
          setEvents((prev) => [...prev, ...newEvents]);
          setPoll((prev) => {
            if (!prev) return prev;
            const results = [...prev.results];
            for (const e of newEvents) {
              results[e.optionIndex] = e.newCount;
            }
            return { ...prev, results };
          });
        }
        cursorLedger.current = latestLedger + 1;
      } catch {
        // Transient RPC hiccups shouldn't surface as user-facing errors;
        // the next tick retries automatically.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function handleDisconnect() {
    setWallet(EMPTY_WALLET);
    setTxStatus(EMPTY_TX);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">LivePoll</p>
          <p className="text-xs text-mute">Multi-wallet Soroban voting on testnet</p>
        </div>
        <WalletConnectMulti wallet={wallet} onConnect={setWallet} onDisconnect={handleDisconnect} onError={setAppError} />
      </header>

      {appError && (
        <div className="mt-6">
          <ErrorBanner error={appError} onDismiss={() => setAppError(null)} />
        </div>
      )}

      <section className="mt-6 grid gap-5 sm:grid-cols-2">
        <PollCard
          poll={poll}
          senderAddress={wallet.address}
          onStatusUpdate={setTxStatus}
          onError={setAppError}
          onVoted={() => loadPoll(wallet.address)}
        />
        <ResultsLive poll={poll} isLive={isLive} />
      </section>

      <section className="mt-5 grid gap-5 sm:grid-cols-2">
        <TransactionStatus status={txStatus} />
        <ActivityFeed events={events} options={poll?.options ?? []} />
      </section>

      <footer className="mt-12 text-center text-xs text-mute">
        Stellar Testnet · Rise Level 2 Yellow Belt submission
      </footer>
    </main>
  );
}
