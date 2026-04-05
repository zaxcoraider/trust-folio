'use client';

/**
 * lib/tx-history.ts
 * Per-wallet transaction history stored in localStorage.
 */

export type TxType =
  | 'upload'
  | 'verify_proof'
  | 'mint_sbt'
  | 'mint_inft'
  | 'list_inft'
  | 'cancel_listing'
  | 'buy_inft'
  | 'make_offer'
  | 'accept_offer'
  | 'cancel_offer'
  | 'hire_create'
  | 'hire_accept'
  | 'hire_decline'
  | 'hire_complete'
  | 'hire_release'
  | 'hire_cancel'
  | 'hire_dispute'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'delegate'
  | 'vote'
  | 'propose';

export const TX_LABELS: Record<TxType, string> = {
  upload:          'Upload to 0G Storage',
  verify_proof:    'Upload Verification Proof',
  mint_sbt:        'Mint Soul-Bound Credential',
  mint_inft:       'Mint INFT',
  list_inft:       'List INFT for Sale',
  cancel_listing:  'Cancel Listing',
  buy_inft:        'Buy INFT',
  make_offer:      'Make Offer',
  accept_offer:    'Accept Offer',
  cancel_offer:    'Cancel Offer',
  hire_create:     'Create Hire Request',
  hire_accept:     'Accept Hire Request',
  hire_decline:    'Decline Hire Request',
  hire_complete:   'Confirm Job Completion',
  hire_release:    'Release Escrow Payment',
  hire_cancel:     'Cancel Hire Request',
  hire_dispute:    'Raise Dispute',
  stake:           'Stake TRUST',
  unstake:         'Unstake TRUST',
  claim_rewards:   'Claim Staking Rewards',
  delegate:        'Delegate Voting Power',
  vote:            'Cast Governance Vote',
  propose:         'Create Governance Proposal',
};

export interface TxRecord {
  id:          string;
  type:        TxType;
  txHash:      string;
  status:      'confirmed' | 'failed';
  label:       string;
  description: string;
  timestamp:   number;
  explorerUrl: string;
  storageHash?: string;
  storageUrl?:  string;
}

const PREFIX = 'trustfolio_tx_';

function key(address: string) {
  return `${PREFIX}${address.toLowerCase()}`;
}

export function getTxHistory(address: string): TxRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key(address)) || '[]') as TxRecord[];
  } catch {
    return [];
  }
}

export function addTxRecord(address: string, record: TxRecord): void {
  if (typeof window === 'undefined') return;
  const history = getTxHistory(address);
  // Prepend so newest first; cap at 200
  const updated = [record, ...history].slice(0, 200);
  localStorage.setItem(key(address), JSON.stringify(updated));
}

export function clearTxHistory(address: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key(address));
}
