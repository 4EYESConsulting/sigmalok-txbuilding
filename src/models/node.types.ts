import type {
  Amount,
  Base58String,
  Box,
  BoxId,
  HexString,
  NewToken,
  NonMandatoryRegisters,
  SignedTransaction,
  SortingDirection,
  TokenId,
} from '@fleet-sdk/common';
import { ErgoAddress } from '@fleet-sdk/core';
import type { BoxQuery } from './common.types';
import type { RequireExactlyOne } from 'type-fest';

interface PowSolutions {
  pk: string;
  w: string;
  n: string;
  d: number;
}

export interface BlockHeader {
  extensionId: string;
  difficulty: string;
  votes: string;
  timestamp: number;
  size: number;
  stateRoot: string;
  height: number;
  nBits: number;
  version: number;
  id: string;
  adProofsRoot: string;
  transactionsRoot: string;
  extensionHash: string;
  powSolutions: PowSolutions;
  adProofsId: string;
  transactionsId: string;
  parentId: string;
}

export type TokenInfo = {
  id: TokenId;
  boxId: BoxId;
  emissionAmount: bigint;
  name: string;
  description: string;
  decimals: number;
};

export type BalanceInfo = {
  nanoERG: bigint;
  tokens: Array<NewToken<bigint>>;
  confirmed: boolean;
};

export type NodeBoxOutput = Box<Amount, NonMandatoryRegisters> & {
  inclusionHeight: number;
};

export type NodeErrorOutput = {
  error?: number;
  reason?: string;
  detail?: string;
};

export type NodeCompilerOutput = { address?: string } & NodeErrorOutput;

export type NodeBoxWhere = {
  /** Base16-encoded BoxId */
  boxId?: BoxId;

  /** Base16-encoded ErgoTree */
  ergoTree?: HexString;

  /** Base58-encoded address */
  address?: ErgoAddress | Base58String;

  /**  Base16-encoded TokenId */
  tokenId?: TokenId;
};

export type NodeBoxQuery<W extends NodeBoxWhere> = BoxQuery<W> & {
  /** The query to filter boxes. Only one filter can be provided to node client */
  where: RequireExactlyOne<W>;

  /**
   * Since an amount of result from the begining.
   * @default 'desc'
   */
  sort?: SortingDirection;
};

export interface BlockExtension {
  headerId: string;
  digest: string;
  fields: [string, string][];
}

export interface BlockAdProofs {
  headerId: string;
  proofBytes: string;
  digest: string;
  size: number;
}

export interface BlockTransactions {
  headerId: string;
  transactions: SignedTransaction[];
  blockVersion: number;
  size: number;
}

export interface FullBlock {
  header: BlockHeader;
  blockTransactions: BlockTransactions;
  extension: BlockExtension;
  adProofs: BlockAdProofs;
  size: number;
}
