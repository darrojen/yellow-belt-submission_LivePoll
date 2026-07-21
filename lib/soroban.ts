import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  Account,
  Keypair,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { signXdr } from './wallet-kit';
import type { TxStatus } from '@/types/poll';

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const CONTRACT_ID = process.env.NEXT_PUBLIC_POLL_CONTRACT_ID || '';

export const server = new rpc.Server(SOROBAN_RPC_URL);

export function explorerLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

function requireContractId() {
  if (!CONTRACT_ID) {
    throw new Error(
      'NEXT_PUBLIC_POLL_CONTRACT_ID is not set. Deploy the contract and add its ID to .env.local.'
    );
  }
}

/**
 * Read-only calls (get_question, get_results, has_voted, ...) only need a
 * simulation — no signature, no fee, no real account required. A random
 * keypair gives TransactionBuilder a syntactically valid source without
 * needing that account to exist or be funded on the ledger.
 */
async function simulateRead<T>(method: string, args: xdr.ScVal[] = []): Promise<T> {
  requireContractId();
  const contract = new Contract(CONTRACT_ID);
  const account = new Account(Keypair.random().publicKey(), '0');

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  if (!sim.result) {
    throw new Error('Simulation returned no result.');
  }
  return scValToNative(sim.result.retval) as T;
}

export async function getPollQuestion(): Promise<string> {
  return simulateRead<string>('get_question');
}

export async function getPollOptions(): Promise<string[]> {
  return simulateRead<string[]>('get_options');
}

export async function getPollResults(): Promise<number[]> {
  return simulateRead<number[]>('get_results');
}

export async function getHasVoted(address: string): Promise<boolean> {
  const args = [nativeToScVal(Address.fromString(address), { type: 'address' })];
  return simulateRead<boolean>('has_voted', args);
}

/**
 * Signed write call: simulate to get the resource footprint, assemble the
 * full transaction, hand it to the connected wallet for signing, submit it,
 * then poll until Soroban RPC reports a terminal status.
 */
export async function callContractWrite(
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
  onStatus: (status: TxStatus) => void
): Promise<string> {
  requireContractId();
  onStatus({ state: 'simulating', hash: null, message: 'Simulating transaction…', explorerUrl: null });

  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(CONTRACT_ID);

  const builtTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(builtTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }

  const prepared = rpc.assembleTransaction(builtTx, sim).build();

  onStatus({ state: 'signing', hash: null, message: 'Waiting for signature in your wallet…', explorerUrl: null });
  const signedXdr = await signXdr(prepared.toXDR(), sourceAddress);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  onStatus({ state: 'submitting', hash: null, message: 'Submitting to the testnet ledger…', explorerUrl: null });
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('The network rejected this transaction before it could be included.');
  }

  const hash = sendResult.hash;
  const status = await pollTransaction(hash);

  if (status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction did not succeed (status: ${status}).`);
  }

  return hash;
}

async function pollTransaction(
  hash: string,
  maxAttempts = 15,
  delayMs = 1500
): Promise<rpc.Api.GetTransactionStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await server.getTransaction(hash);
    if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return result.status;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return rpc.Api.GetTransactionStatus.NOT_FOUND;
}

export async function voteOnPoll(
  sourceAddress: string,
  optionIndex: number,
  onStatus: (status: TxStatus) => void
): Promise<string> {
  const args = [
    nativeToScVal(Address.fromString(sourceAddress), { type: 'address' }),
    nativeToScVal(optionIndex, { type: 'u32' }),
  ];
  return callContractWrite('vote', args, sourceAddress, onStatus);
}
