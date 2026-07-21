export interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletId: string | null; // e.g. "freighter", "xbull", "albedo"
}

export interface PollData {
  question: string;
  options: string[];
  results: number[]; // vote counts, same order as options
  hasVoted: boolean;
}

export type TxState = 'idle' | 'simulating' | 'signing' | 'submitting' | 'success' | 'error';

export interface TxStatus {
  state: TxState;
  hash: string | null;
  message: string | null;
  explorerUrl: string | null;
}

/**
 * The three error categories this level's rubric calls out, plus a
 * catch-all for anything a contract call raises that doesn't fit them.
 */
export type AppErrorKind =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'CONTRACT_ERROR'
  | 'UNKNOWN';

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

export interface VoteEvent {
  voter: string;
  optionIndex: number;
  newCount: number;
  ledger: number;
}
