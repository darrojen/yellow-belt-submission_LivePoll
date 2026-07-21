'use client';

import { useState } from 'react';
import { openWalletModal, getConnectedAddress, disconnectWallet } from '@/lib/wallet-kit';
import { classifyError } from '@/lib/errors';
import type { WalletState, AppError } from '@/types/poll';

interface WalletConnectMultiProps {
  wallet: WalletState;
  onConnect: (wallet: WalletState) => void;
  onDisconnect: () => void;
  onError: (error: AppError) => void;
}

function shorten(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function WalletConnectMulti({ wallet, onConnect, onDisconnect, onError }: WalletConnectMultiProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  function handleConnect() {
    setIsConnecting(true);
    try {
      openWalletModal(
        async (walletId) => {
          try {
            const address = await getConnectedAddress();
            onConnect({ isConnected: true, address, walletId });
          } catch (err) {
            onError(classifyError(err));
          } finally {
            setIsConnecting(false);
          }
        },
        () => setIsConnecting(false)
      );
    } catch (err) {
      onError(classifyError(err));
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    onDisconnect();
  }

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-line px-4 py-1.5 text-xs text-mute">
          <span className="text-lumen">{wallet.walletId}</span> · {shorten(wallet.address)}
        </div>
        <button
          onClick={handleDisconnect}
          className="rounded-full border border-line px-4 py-1.5 text-xs text-ink transition hover:border-signal hover:text-signal"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="rounded-full bg-lumen px-5 py-2 text-sm font-semibold text-void shadow-glow transition hover:bg-lumen-dim disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
