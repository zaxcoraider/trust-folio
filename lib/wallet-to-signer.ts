import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Converts a viem WalletClient (from wagmi v2) to an ethers v6 JsonRpcSigner.
 * Required for 0G SDK compatibility.
 */
export async function walletClientToSigner(
  walletClient: WalletClient
): Promise<JsonRpcSigner> {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: (chain as any)?.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport as any, network);
  const signer = new JsonRpcSigner(provider, account!.address);
  return signer;
}
