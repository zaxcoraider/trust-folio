import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const RPC_URL              = process.env.NEXT_PUBLIC_ZERO_G_RPC || 'https://evmrpc-testnet.0g.ai';
const INFT_CONTRACT        = process.env.INFT_CONTRACT;
const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT;
const HIRING_CONTRACT      = process.env.HIRING_ESCROW_CONTRACT;

const INFT_ABI = [
  'function totalSupply() view returns (uint256)',
];
const MARKET_ABI = [
  'function totalVolume() view returns (uint256)',
  'function totalSales() view returns (uint256)',
  'function totalFees() view returns (uint256)',
  'function activeListingCount() view returns (uint256)',
];
const HIRE_ABI = [
  'function totalEscrowVolume() view returns (uint256)',
  'function totalFeesCollected() view returns (uint256)',
  'function totalRequestsCount() view returns (uint256)',
];

export async function GET() {
  try {
    // If contracts not deployed, return simulated stats
    if (!INFT_CONTRACT || !MARKETPLACE_CONTRACT || !HIRING_CONTRACT) {
      return NextResponse.json({
        totalINFTsMinted:     0,
        totalListings:        0,
        totalSales:           0,
        totalVolume:          '0',
        totalMarketplaceFees: '0',
        totalHiringContracts: 0,
        totalHiringVolume:    '0',
        totalHiringFees:      '0',
        simulated:            true,
        recentActivity:       [],
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const [inftContract, marketContract, hireContract] = [
      new ethers.Contract(INFT_CONTRACT, INFT_ABI, provider),
      new ethers.Contract(MARKETPLACE_CONTRACT, MARKET_ABI, provider),
      new ethers.Contract(HIRING_CONTRACT, HIRE_ABI, provider),
    ];

    const [
      totalINFTs,
      totalVolume,
      totalSales,
      totalFees,
      activeListings,
      totalHiringVol,
      totalHiringFees,
      totalHiringCount,
    ] = await Promise.all([
      inftContract.totalSupply(),
      marketContract.totalVolume(),
      marketContract.totalSales(),
      marketContract.totalFees(),
      marketContract.activeListingCount(),
      hireContract.totalEscrowVolume(),
      hireContract.totalFeesCollected(),
      hireContract.totalRequestsCount(),
    ]);

    return NextResponse.json({
      totalINFTsMinted:     Number(totalINFTs),
      totalListings:        Number(activeListings),
      totalSales:           Number(totalSales),
      totalVolume:          ethers.formatEther(totalVolume),
      totalMarketplaceFees: ethers.formatEther(totalFees),
      totalHiringContracts: Number(totalHiringCount),
      totalHiringVolume:    ethers.formatEther(totalHiringVol),
      totalHiringFees:      ethers.formatEther(totalHiringFees),
      simulated:            false,
      recentActivity:       [],
    });

  } catch (err: unknown) {
    console.error('[admin/stats] error:', err);
    return NextResponse.json(
      { error: (err as { message?: string })?.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
