/**
 * POST /api/v1/hire
 * Enterprise API: initiate an off-chain hiring request.
 * Actual on-chain escrow requires the employer wallet to sign a transaction;
 * this endpoint creates the off-chain record and returns instructions.
 *
 * Headers:
 *   x-api-key: tf_live_<32hex>
 *
 * Body:
 *   {
 *     employer:     string,   // wallet address
 *     talent:       string,   // wallet address
 *     amount:       string,   // amount in 0G (e.g. "1.5")
 *     title:        string,
 *     description:  string,
 *     deadlineDays: number    // days from now
 *   }
 *
 * Response:
 *   201: { success: true, data: { requestId, status, contractAddress, escrowAmount, deadline, onChainInstructions } }
 *   400: validation error
 *   401: invalid API key
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Deployed HiringEscrow contract address ────────────────────────────────────
const HIRING_ESCROW_CONTRACT = '0xb627Eac1A6f55EDD851763FFBF1206F64F676513';

// ── API key validation ────────────────────────────────────────────────────────

async function validateKey(rawKey: string): Promise<boolean> {
  if (!rawKey || !rawKey.startsWith('tf_live_') || rawKey.length < 40) return false;
  // TODO: validate against API_KEY_REGISTRY contract on 0G Galileo Testnet
  return true;
}

// ── ID generator ──────────────────────────────────────────────────────────────

function genRequestId(): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `hire_api_${ts}_${rnd}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawKey = req.headers.get('x-api-key') ?? '';
    if (!(await validateKey(rawKey))) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: {
      employer:     string;
      talent:       string;
      amount:       string;
      title:        string;
      description:  string;
      deadlineDays: number;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { employer, talent, amount, title, description, deadlineDays } = body;

    // ── Validate ──────────────────────────────────────────────────────────────
    const addrRegex = /^0x[0-9a-fA-F]{40}$/;
    const errors: string[] = [];

    if (!employer || !addrRegex.test(employer))     errors.push('employer must be a valid 0x address');
    if (!talent   || !addrRegex.test(talent))       errors.push('talent must be a valid 0x address');
    if (!amount   || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
                                                    errors.push('amount must be a positive number string');
    if (!title    || title.trim().length < 3)       errors.push('title must be at least 3 characters');
    if (!description || description.trim().length < 10)
                                                    errors.push('description must be at least 10 characters');
    if (!deadlineDays || typeof deadlineDays !== 'number' || deadlineDays < 1 || deadlineDays > 365)
                                                    errors.push('deadlineDays must be between 1 and 365');

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // ── Build record ──────────────────────────────────────────────────────────
    const nowSec      = Math.floor(Date.now() / 1000);
    const requestId   = genRequestId();
    const deadlineSec = nowSec + deadlineDays * 86400;

    // ── Return response with on-chain submission instructions ─────────────────
    return NextResponse.json(
      {
        success: true,
        data: {
          requestId,
          status:          'pending',
          contractAddress: HIRING_ESCROW_CONTRACT,
          escrowAmount:    amount,
          deadline:        deadlineSec,
          createdAt:       nowSec,
          employer:        employer.toLowerCase(),
          talent:          talent.toLowerCase(),
          title,
          description,
          onChainInstructions: {
            action:          'Submit on-chain to activate escrow',
            contract:        HIRING_ESCROW_CONTRACT,
            network:         '0G Galileo Testnet',
            chainId:         16602,
            rpcUrl:          'https://evmrpc-testnet.0g.ai',
            functionSignature: 'createRequest(address talent, uint256 deadline) payable',
            value:           amount + ' 0G',
            note:            [
              'To finalise this hiring request on-chain:',
              '1. Connect the employer wallet to 0G Galileo Testnet (chainId 16602)',
              '2. Call createRequest(talent, deadlineTimestamp) on the HiringEscrow contract',
              '3. Send the agreed amount as msg.value',
              '4. The talent must call acceptRequest(requestId) to begin work',
              '5. Release payment via releasePayment(requestId) when work is confirmed',
            ],
          },
        },
      },
      { status: 201 }
    );

  } catch (err) {
    console.error('[v1/hire] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
