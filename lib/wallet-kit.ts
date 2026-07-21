'use client';

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';

/**
 * Single shared kit instance. StellarWalletsKit is the layer that gives us
 * "multi-wallet" support for free — it renders a picker for every installed
 * wallet (Freighter, xBull, Albedo, Rabet, WalletConnect, ...) instead of us
 * hardcoding one extension's API the way Level 1 did.
 */
let kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

/** Opens the wallet picker modal. `onClosed` fires if the user closes it without picking one. */
export function openWalletModal(
  onSelected: (walletId: string) => void,
  onClosed?: () => void
): void {
  getKit().openModal({
    modalTitle: 'Connect a wallet',
    onWalletSelected: (option) => {
      getKit().setWallet(option.id);
      onSelected(option.id);
    },
    onClosed: () => onClosed?.(),
  });
}

export async function getConnectedAddress(): Promise<string> {
  const { address } = await getKit().getAddress();
  if (!address) {
    throw new Error('No wallet is selected. Choose a wallet to continue.');
  }
  return address;
}

export async function signXdr(xdr: string, address: string): Promise<string> {
  const { signedTxXdr } = await getKit().signTransaction(xdr, {
    address,
    networkPassphrase: WalletNetwork.TESTNET,
  });
  return signedTxXdr;
}

/** Clears the locally selected wallet. The extension's own grant is untouched. */
export async function disconnectWallet(): Promise<void> {
  await getKit().disconnect();
}
