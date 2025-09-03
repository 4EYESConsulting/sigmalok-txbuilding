import {
  ErgoAddress,
  ErgoUnsignedInput,
  SAFE_MIN_BOX_VALUE,
  SInt,
} from '@fleet-sdk/core';
import { getErgoNodeProvider } from '../../providers/node/ergoNodeProvider';
import { TransactionHelper } from '../../utils/transaction-helper';
import { designateOutbox, sigmaLokFeeOutbox } from '../../utils/outbox-helper';
import { getInputBoxes } from '../../utils/input-selector';
import { LOK_SINGLETON_ID } from '../contract';
import { SConstant } from '@fleet-sdk/serializer';
import { min } from '@fleet-sdk/common';

async function createBenefactorRedeem() {
  const nodeUrl = process.env.NODE_URL as string;
  const mnemonic = process.env.FEE_MNEMONIC as string;

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

  const lokUtxo = new ErgoUnsignedInput(lokUtxos[0]);

  console.log(`lokUtxo: ${lokUtxo.boxId}`);

  const designateOutput = designateOutbox(lokUtxo, LOK_SINGLETON_ID, address);

  const sigmaLokFeeOutput = sigmaLokFeeOutbox(lokUtxo, sigmanautsFeeAddress);

  const minerFee = BigInt(1e6);
  const sigFee = sigmaLokFeeOutput.value;

  const inputR5 = SConstant.from(lokUtxo.additionalRegisters.R5!);
  const inputR5Data = inputR5.data as [Uint8Array, bigint];
  const keyId = inputR5Data[0];

  console.log(`keyId: ${Buffer.from(keyId).toString('hex')}`);

  const inputs = await getInputBoxes(
    nodeProvider,
    [address.toString()],
    minerFee + sigFee,
    [
      {
        tokenId: Buffer.from(keyId).toString('hex'),
        amount: BigInt(1),
      },
    ],
    true,
  );

  const tx = await txHelper.buildTransaction(
    blockHeight,
    [
      lokUtxo.setContextExtension({
        0: SInt(3),
      }),
      ...inputs,
    ],
    [designateOutput, sigmaLokFeeOutput],
    undefined,
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

createBenefactorRedeem();
