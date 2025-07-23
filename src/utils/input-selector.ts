import { ErgoNodeProvider } from '../providers/node/ergoNodeProvider';
import { SAFE_MIN_BOX_VALUE, type Box } from '@fleet-sdk/core';
import type { ErgoToken } from '../models/transaction.types';

/**
 * Greedy multi‑address UTXO selector which also accounts for change box ergs if unrequested tokens is in the selection
 */
export async function getInputBoxes(
  nodeProvider: ErgoNodeProvider,
  inputAddresses: string[],
  targetNanoErgs: bigint,
  tokens: ErgoToken[] = [],
  includeMempool = false,
  minErgAmount = SAFE_MIN_BOX_VALUE,
): Promise<Box[]> {
  if (inputAddresses.length === 0) {
    throw new Error('inputAddresses must contain at least one address');
  }

  const PAGE = 100;
  const selected: Box[] = [];
  const seen = new Set<string>();

  let ergShortfall = targetNanoErgs;
  let changeAlreadyAdded = false;

  const tokenReq = new Map<string, bigint>(
    tokens.map((t) => [t.tokenId, BigInt(t.amount.toString())]),
  );
  const requestedIds = new Set<string>(tokens.map((t) => t.tokenId));

  const haveEverything = () => ergShortfall <= 0n && tokenReq.size === 0;

  for (const address of inputAddresses) {
    if (haveEverything()) break;

    for (let offset = 0; !haveEverything(); offset += PAGE) {
      const page = await nodeProvider.getUnspentBoxesByAddress(
        address,
        PAGE,
        offset,
        'desc',
        includeMempool,
        includeMempool,
      );
      if (!page?.length) break;

      for (const box of page) {
        if (haveEverything()) break;
        if (seen.has(box.boxId)) continue;

        let touchesWantedTokens = false;
        let hasExtraToken = false;

        if (box.assets.length) {
          for (const { tokenId, amount } of box.assets) {
            const need = tokenReq.get(tokenId);
            if (need) {
              const remaining = need - BigInt(amount);
              touchesWantedTokens = true;
              // if remaining is less than 0, it means we need change box
              if (remaining <= 0n) {
                tokenReq.delete(tokenId);
                hasExtraToken = true;
              } else tokenReq.set(tokenId, remaining);
            }

            if (!requestedIds.has(tokenId)) {
              hasExtraToken = true;
            }
          }
        }

        if (hasExtraToken && !changeAlreadyAdded) {
          ergShortfall += minErgAmount;
          changeAlreadyAdded = true;
        }

        if (hasExtraToken || touchesWantedTokens || ergShortfall > 0n) {
          selected.push(box);
          seen.add(box.boxId);
          ergShortfall -= BigInt(box.value);

          if (haveEverything()) break;
        }
      }

      if (page.length < PAGE) break;
    }
  }

  if (!haveEverything()) {
    throw new Error(
      'Insufficient inputs to meet the required tokens and/or ERGs',
    );
  }
  return selected;
}
