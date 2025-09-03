import type { OneOrMore } from '@fleet-sdk/common';
import {
  ErgoAddress,
  ErgoBox,
  OutputBuilder,
  SBool,
  SByte,
  SColl,
  SGroupElement,
  type Amount,
  type TokenAmount,
} from '@fleet-sdk/core';
import { blake2b256, utf8 } from '@fleet-sdk/crypto';
import { SConstant, SInt, SLong, SPair } from '@fleet-sdk/serializer';

export function sigmaLokGenesisOutbox(
  benefactorAddress: ErgoAddress,
  contractName: string,
  deadlineHeight: bigint,
  sigmanautsFeeAddress: ErgoAddress,
  sigmanautsFeeNanoErg: bigint,
  contractAddress: ErgoAddress,
  nanoErgs: bigint,
  tokens?: OneOrMore<TokenAmount<Amount>>,
  oracleNftId?: string,
  oracleValue?: bigint,
  oracleIsGreaterThan?: boolean,
) {
  const benefactorPk = benefactorAddress.getPublicKeys()[0];
  const sigmanautsFeePkBytes = blake2b256(sigmanautsFeeAddress.ergoTree);

  const oracleReg =
    oracleNftId && oracleIsGreaterThan
      ? SPair(SColl(SByte, oracleNftId), SBool(oracleIsGreaterThan))
      : SPair(SColl(SByte, []), SBool(true));

  const registers = {
    R4: SGroupElement(benefactorPk),
    R5: SPair(SColl(SByte, []), SLong(BigInt(0))),
    R6: SPair(SInt(parseInt(deadlineHeight.toString())), SLong(oracleValue ?? BigInt(0))),
    R7: SColl(SGroupElement, []),
    R8: oracleReg,
    R9: SPair(
      SColl(SColl(SByte), [
        [...utf8.decode(contractName)],
        [...sigmanautsFeePkBytes],
      ]),
      SLong(sigmanautsFeeNanoErg),
    ),
  };

  const output = new OutputBuilder(nanoErgs, contractAddress)
    .mintToken({
      amount: BigInt(1),
    })
    .setAdditionalRegisters(registers);

  if (tokens) {
    output.addTokens(tokens);
  }

  return output;
}

export function sigmaLokTokenLockKeysOutbox(
  lokUtxo: ErgoBox,
  keyAmount: bigint,
  designates: ErgoAddress[],
) {
  const designatesGE = designates.map((d) => d.getPublicKeys()[0]);

  const registers = {
    R4: lokUtxo.additionalRegisters.R4,
    R5: SPair(SColl(SByte, lokUtxo.boxId), SLong(keyAmount)),
    R6: lokUtxo.additionalRegisters.R6,
    R7: SColl(SGroupElement, designatesGE),
    R8: lokUtxo.additionalRegisters.R8,
    R9: lokUtxo.additionalRegisters.R9,
  };

  const output = new OutputBuilder(lokUtxo.value, lokUtxo.ergoTree)
    .setAdditionalRegisters(registers)
    .addTokens(lokUtxo.assets);

  return output;
}

export function sigmaLokTokenIssuanceOutbox(
  lokUtxo: ErgoBox,
  name: string,
  description: string,
  keyAmount: bigint,
  benefactorAddress: ErgoAddress,
  nanoErg: bigint,
) {
  const output = new OutputBuilder(nanoErg, benefactorAddress).mintToken({
    amount: keyAmount,
    tokenId: lokUtxo.boxId,
    name,
    description,
    decimals: 0,
  });

  return output;
}

export function sigmaLokFeeOutbox(lokUtxo: ErgoBox, feeAddress: ErgoAddress) {
  const inputR9 = SConstant.from(lokUtxo.additionalRegisters.R9!);
  const inputR9Data = inputR9.data as [Uint8Array[], bigint];

  const feeAmount = inputR9Data[1];

  return new OutputBuilder(feeAmount, feeAddress);
}

export function sigmaLokAddMoreFundsOutbox(
  lokUtxo: ErgoBox,
  nanoErg: bigint,
  tokens?: OneOrMore<TokenAmount<Amount>>,
) {
  const registers = {
    R4: lokUtxo.additionalRegisters.R4,
    R5: lokUtxo.additionalRegisters.R5,
    R6: lokUtxo.additionalRegisters.R6,
    R7: lokUtxo.additionalRegisters.R7,
    R8: lokUtxo.additionalRegisters.R8,
    R9: lokUtxo.additionalRegisters.R9,
  };

  const tokenDict: Record<string, bigint> = {};

  lokUtxo.assets.forEach((t) => {
    tokenDict[t.tokenId] = BigInt(t.amount);
  });

  if (tokens) {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    tokenArray.forEach((t) => {
      const existing = tokenDict[t.tokenId] || BigInt(0);
      tokenDict[t.tokenId] = existing + BigInt(t.amount);
    });
  }

  const output = new OutputBuilder(lokUtxo.value + nanoErg, lokUtxo.ergoTree)
    .setAdditionalRegisters(registers)
    .addTokens(
      Object.entries(tokenDict).map(([tokenId, amount]) => ({
        tokenId,
        amount,
      })),
    );

  return output;
}

export function designateOutbox(
  lokUtxo: ErgoBox,
  lokSingletonId: string,
  designateAddress: ErgoAddress,
) {
  const filteredAssets = lokUtxo.assets.filter(
    (asset) => asset.tokenId !== lokSingletonId,
  );

  return new OutputBuilder(lokUtxo.value, designateAddress).addTokens(
    filteredAssets,
  );
}

export function beneficiaryOutbox(
  lokUtxo: ErgoBox,
  benefactorAddress: ErgoAddress,
  lokSingletonId: string,
) {
  const filteredAssets = lokUtxo.assets.filter(
    (asset) => asset.tokenId !== lokSingletonId,
  );

  return new OutputBuilder(lokUtxo.value, benefactorAddress).addTokens(
    filteredAssets,
  );
}
