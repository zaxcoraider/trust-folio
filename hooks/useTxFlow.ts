'use client';

/**
 * hooks/useTxFlow.ts
 *
 * Wraps every on-chain transaction with a consistent UX flow:
 *
 *   idle → wallet_pending → tx_pending → confirmed | error
 *
 * Usage:
 *   const { state, execute, reset } = useTxFlow();
 *
 *   await execute({
 *     type: 'stake',
 *     description: 'Staking 100 TRUST',
 *     fn: async (signer) => {
 *       const contract = new ethers.Contract(ADDR, ABI, signer);
 *       return contract.stake(parseUnits('100', 18));
 *     },
 *   });
 */

import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { walletClientToSigner } from '@/lib/wallet-to-signer';
import { addTxRecord, type TxType, TX_LABELS } from '@/lib/tx-history';
import { useNetwork } from '@/lib/network-context';

export type TxStatus = 'idle' | 'wallet_pending' | 'tx_pending' | 'confirmed' | 'error';

export interface TxState {
  status:      TxStatus;
  txHash:      string | null;
  explorerUrl: string | null;
  error:       string | null;
}

const IDLE: TxState = { status: 'idle', txHash: null, explorerUrl: null, error: null };

function extractErrorMessage(err: unknown): string {
  const e = err as Record<string, unknown>;

  // Collect candidate strings from the ethers v6 error chain
  const info  = e?.info  as Record<string, unknown> | undefined;
  const error = e?.error as Record<string, unknown> | undefined;
  const cause = e?.cause as Record<string, unknown> | undefined;
  const revert = e?.revert as Record<string, unknown> | undefined;
  const infoError = info?.error as Record<string, unknown> | undefined;

  const candidates: string[] = [
    revert?.name as string | undefined,   // decoded custom error name (ethers v6)
    e?.reason,
    e?.shortMessage,
    // ethers v6 wraps the RPC error under .info.error.message
    infoError?.message as string | undefined,
    // sometimes nested under .error.message
    error?.message as string | undefined,
    // cause chain
    cause?.reason as string | undefined,
    cause?.message as string | undefined,
    e?.message,
  ].filter((s): s is string => typeof s === 'string' && s.length > 0);

  const combined = candidates.join(' ');

  // User rejected
  if (
    combined.includes('user rejected') ||
    combined.includes('User rejected') ||
    combined.includes('User denied') ||
    combined.includes('ACTION_REJECTED') ||
    combined.includes('4001')
  ) {
    return 'Transaction cancelled — you rejected the wallet prompt.';
  }

  // onlyOwner revert
  if (combined.includes('caller is not the owner') || combined.includes('Ownable')) {
    return 'Only the contract owner can mint credentials. Platform minting is required — self-minting is not supported by this contract.';
  }

  // Known hiring escrow custom errors → human-readable messages
  if (combined.includes('NotAuthorized')) {
    return 'Not authorized — your connected wallet is not the designated party for this action.';
  }
  if (combined.includes('InvalidStatus')) {
    return 'Action not allowed — this request is not in the required state (e.g. already accepted, cancelled, or completed).';
  }
  if (combined.includes('RequestNotFound')) {
    return 'Hiring request not found on-chain. The request ID may be incorrect.';
  }
  if (combined.includes('InvalidTalentAddress')) {
    return 'Invalid talent address — you cannot hire yourself or use a zero address.';
  }
  if (combined.includes('DeadlineMustBeFuture')) {
    return 'Deadline must be a future date.';
  }
  if (combined.includes('PaymentRequired')) {
    return 'A payment amount greater than zero is required to create a hiring request.';
  }
  if (combined.includes('AutoReleaseNotReady')) {
    return 'Auto-release is not yet available — 7 days must pass after the talent marks completion.';
  }

  // "could not coalesce error" means ethers couldn't parse the RPC error —
  // surface the most useful inner message instead.
  if (combined.includes('could not coalesce')) {
    const inner = (infoError?.message as string | undefined) || (cause?.message as string | undefined);
    if (inner && !inner.includes('could not coalesce')) return inner;
    return 'Transaction reverted — the contract rejected the call. Make sure your wallet is on 0G Testnet and you have enough balance.';
  }

  // Generic unknown custom error
  if (combined.includes('unknown custom error')) {
    return 'Transaction reverted by the contract. Make sure you are connected with the correct wallet for this action.';
  }

  return candidates[0] || 'Transaction failed';
}

interface ExecuteOpts {
  type:         TxType;
  description:  string;
  fn:           (signer: ethers.JsonRpcSigner) => Promise<ethers.TransactionResponse>;
  /** Optional preflight: run a staticCall via our RPC before signing. Return error string to abort. */
  preflight?:   (provider: ethers.JsonRpcProvider) => Promise<void>;
  onSuccess?:   (txHash: string) => void;
  storageHash?: string;
}

export function useTxFlow() {
  const [state, setState] = useState<TxState>(IDLE);
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { networkConfig } = useNetwork();

  const execute = useCallback(async (opts: ExecuteOpts) => {
    if (!walletClient || !address) {
      setState({ ...IDLE, status: 'error', error: 'Wallet not connected' });
      return;
    }

    // Network check: wallet must be on the correct 0G chain
    const walletChainId = walletClient.chain?.id;
    if (walletChainId && walletChainId !== networkConfig.chainId) {
      setState({
        ...IDLE,
        status: 'error',
        error: `Wrong network — your wallet is on chain ${walletChainId}. Please switch to ${networkConfig.name} (chain ${networkConfig.chainId}).`,
      });
      return;
    }

    // Optional preflight: simulate via our own RPC to get a clear revert reason
    if (opts.preflight) {
      try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
        await opts.preflight(provider);
      } catch (preErr: unknown) {
        const msg = extractErrorMessage(preErr);
        setState({ ...IDLE, status: 'error', error: msg });
        return;
      }
    }

    setState({ ...IDLE, status: 'wallet_pending' });

    let txHash: string | null = null;
    const explorerBase = networkConfig.explorer;

    try {
      const signer = await walletClientToSigner(walletClient);

      // wallet popup appears inside opts.fn
      const tx = await opts.fn(signer);
      txHash = tx.hash;

      setState({
        status:      'tx_pending',
        txHash,
        explorerUrl: `${explorerBase}/tx/${txHash}`,
        error:       null,
      });

      await tx.wait();

      const explorerUrl = `${explorerBase}/tx/${txHash}`;

      setState({
        status:      'confirmed',
        txHash,
        explorerUrl,
        error:       null,
      });

      // Save to tx history
      addTxRecord(address, {
        id:          `${Date.now()}_${txHash.slice(2, 10)}`,
        type:        opts.type,
        txHash,
        status:      'confirmed',
        label:       TX_LABELS[opts.type],
        description: opts.description,
        timestamp:   Date.now(),
        explorerUrl,
        storageHash: opts.storageHash,
        storageUrl:  opts.storageHash
          ? `${networkConfig.storageExplorer}/tx/${opts.storageHash}`
          : undefined,
      });

      opts.onSuccess?.(txHash);
    } catch (err: unknown) {
      // Save failed tx if we got a hash
      if (txHash && address) {
        addTxRecord(address, {
          id:          `${Date.now()}_fail`,
          type:        opts.type,
          txHash,
          status:      'failed',
          label:       TX_LABELS[opts.type],
          description: opts.description,
          timestamp:   Date.now(),
          explorerUrl: `${explorerBase}/tx/${txHash}`,
        });
      }

      const msg = extractErrorMessage(err);

      setState({
        status:      'error',
        txHash:      txHash,
        explorerUrl: txHash ? `${explorerBase}/tx/${txHash}` : null,
        error:       msg,
      });
    }
  }, [walletClient, address, networkConfig]);

  const reset = useCallback(() => setState(IDLE), []);

  return { state, execute, reset };
}
