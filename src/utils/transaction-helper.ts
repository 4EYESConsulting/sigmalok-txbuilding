import {
  type Amount,
  type Box,
  type CollectionLike,
  type ErgoAddress,
  type OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';

import {
  type EIP12UnsignedTransaction,
  type OneOrMore,
  type SignedTransaction,
  type TokenAmount,
} from '@fleet-sdk/common';
import { ErgoHDKey, Prover } from '@fleet-sdk/wallet';

export class TransactionHelper {
  constructor(
    private readonly walletMnemonic: string,
    private readonly walletPassword?: string,
  ) {}

  public async getRootKey(walletIndex: number): Promise<ErgoHDKey> {
    return await ErgoHDKey.fromMnemonic(this.walletMnemonic, {
      passphrase: this.walletPassword,
      path: `m/44'/429'/0'/0/${walletIndex ? walletIndex : 0}`,
    });
  }

  public async getAddress(walletIndex: number): Promise<ErgoAddress> {
    const rootKey = await this.getRootKey(walletIndex);
    return rootKey.address;
  }

  public async buildTransaction(
    blockHeight: number,
    inputs: OneOrMore<Box<Amount>> | CollectionLike<Box<Amount>>,
    outputs: OneOrMore<OutputBuilder>,
    dataInputs?: OneOrMore<Box<Amount>>,
    tokensToBurn?: OneOrMore<TokenAmount<Amount>>,
    nanoErgMinerFee: bigint = BigInt(100000),
    changeAddress?: string,
    walletIndex = 0,
    ensureInclusion = false,
  ): Promise<EIP12UnsignedTransaction> {
    if (!blockHeight) {
      throw new Error('issue getting block height');
    }

    const txB = new TransactionBuilder(blockHeight)
      .from(inputs, { ensureInclusion })
      .to(outputs)
      .sendChangeTo(
        changeAddress ? changeAddress : await this.getAddress(walletIndex),
      )
      .payFee(nanoErgMinerFee);

    if (tokensToBurn) {
      txB.burnTokens(tokensToBurn);
    }

    if (dataInputs) {
      txB.withDataFrom(dataInputs);
    }

    return txB.build().toEIP12Object();
  }

  public async signTransaction(
    unsignedTransaction: EIP12UnsignedTransaction,
    walletIndex = 0,
  ): Promise<SignedTransaction> {
    const rootKey = await this.getRootKey(walletIndex);
    const prover = new Prover();
    return prover.signTransaction(unsignedTransaction, [rootKey]);
  }
}
