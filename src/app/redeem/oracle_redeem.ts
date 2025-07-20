import {
  ErgoAddress,
  ErgoUnsignedInput,
  SAFE_MIN_BOX_VALUE,
  SInt,
} from '@fleet-sdk/core';
import { getErgoNodeProvider } from '../../providers/node/ergoNodeProvider';
import { TransactionHelper } from '../../utils/transaction-helper';
import {
  beneficiaryOutbox,
  sigmaLokFeeOutbox,
} from '../../utils/outbox-helper';
import { getInputBoxes } from '../../utils/input-selector';
import { GOLD_ORACLE_NFT_ID, LOK_SINGLETON_ID } from '../contract';
import { SConstant } from '@fleet-sdk/serializer';

async function createBeneficiaryOracleRedeem() {
  const nodeUrl = process.env.NODE_URL as string;
  const mnemonic = process.env.MNEMONIC as string;

  const txHelper = new TransactionHelper(mnemonic);

  const address = await txHelper.getAddress(0);

  const nodeProvider = getErgoNodeProvider(nodeUrl);

  const blockHeight = await nodeProvider.getCurrentHeight();

  const sigmanautsFeeAddress = ErgoAddress.fromBase58(
    '9eiTJkLo4CjFgp7eC9mgcJ1DpcENubWshZAASQZWzNEwpQKBJr2',
  );

  console.log(
    `Connected to node ${nodeUrl} at height ${blockHeight} with wallet ${address}`,
  );

  const lokUtxos = await nodeProvider.getUnspentBoxesByTokenId(
    LOK_SINGLETON_ID,
    undefined,
    undefined,
    undefined,
    true,
    true,
  );

  if (lokUtxos.length === 0) {
    throw new Error('No lok utxo found');
  }

  if (lokUtxos.length > 1) {
    throw new Error('Multiple lok utxo found');
  }

  const oracleUtxos =
    await nodeProvider.getUnspentBoxesByTokenId(GOLD_ORACLE_NFT_ID);

  if (oracleUtxos.length === 0) {
    throw new Error('No oracle utxo found');
  }

  if (oracleUtxos.length > 1) {
    throw new Error('Multiple oracle utxo found');
  }

  const lokUtxo = new ErgoUnsignedInput(lokUtxos[0]);

  const oracleUtxo = new ErgoUnsignedInput(oracleUtxos[0]);

  console.log(`lokUtxo: ${lokUtxo.boxId}`);
  console.log(`oracleUtxo: ${oracleUtxo.boxId}`);

  const beneficiaryOutput = beneficiaryOutbox(
    lokUtxo,
    address,
    LOK_SINGLETON_ID,
  );

  const sigmaLokFeeOutput = sigmaLokFeeOutbox(lokUtxo, sigmanautsFeeAddress);

  const minerFee = BigInt(1e6);
  const sigFee = sigmaLokFeeOutput.value;

  const inputR5 = SConstant.from(lokUtxo.additionalRegisters.R5!);
  const inputR5Data = inputR5.data as [Uint8Array, bigint];
  const keyIdBuffer = inputR5Data[0];
  const keyId = Buffer.from(keyIdBuffer).toString('hex');

  let amountERGNeeded = BigInt(0);

  if (lokUtxo.value - sigFee < SAFE_MIN_BOX_VALUE) {
    amountERGNeeded = sigFee;
  }

  console.log(`keyId: ${keyId}`);

  const inputs = await getInputBoxes(
    nodeProvider,
    [address.toString()],
    minerFee + amountERGNeeded,
    [
      {
        tokenId: keyId,
        amount: BigInt(1),
      },
    ],
    true,
  );

  inputs.sort((a, b) => {
    const aHasToken = a.assets.some((asset) => asset.tokenId === keyId);
    const bHasToken = b.assets.some((asset) => asset.tokenId === keyId);

    if (aHasToken && !bHasToken) return -1;
    if (!aHasToken && bHasToken) return 1;
    return 0;
  });

  const tx = await txHelper.buildTransaction(
    blockHeight,
    [
      lokUtxo.setContextExtension({
        0: SInt(3),
      }),
      ...inputs,
    ],
    [beneficiaryOutput, sigmaLokFeeOutput],
    oracleUtxo,
    lokUtxo.assets.find((t) => t.tokenId === LOK_SINGLETON_ID),
    minerFee,
    undefined,
    undefined,
    true,
  );

  const signedTx = await txHelper.signTransaction(tx);

  const txSubmissionResult = await nodeProvider.submitTransaction(signedTx);

  if (txSubmissionResult.success) {
    console.log(
      `Transaction submitted with ID: ${txSubmissionResult.transactionId}`,
    );
  } else {
    console.log('Transaction failed');
    console.log(txSubmissionResult);
  }
}

createBeneficiaryOracleRedeem();
