import { ErgoAddress, ErgoUnsignedInput, SInt } from '@fleet-sdk/core';
import { getErgoNodeProvider } from '../../providers/node/ergoNodeProvider';
import { TransactionHelper } from '../../utils/transaction-helper';
import {
  sigmaLokAddMoreFundsOutbox,
  sigmaLokFeeOutbox,
} from '../../utils/outbox-helper';
import { getInputBoxes } from '../../utils/input-selector';
import { LOK_SINGLETON_ID } from '../contract';

async function addMoreFunds() {
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

  console.log(lokUtxos);

  if (lokUtxos.length === 0) {
    throw new Error('No lok utxo found');
  }

  if (lokUtxos.length > 1) {
    throw new Error('Multiple lok utxo found');
  }

  const lokUtxo = new ErgoUnsignedInput(lokUtxos[0]);

  console.log(`lokUtxo: ${lokUtxo.boxId}`);

  const nanoErgToAdd = BigInt(1e6);

  const sigmaLokRecreatedOutput = sigmaLokAddMoreFundsOutbox(
    lokUtxo,
    nanoErgToAdd,
  );

  const sigmaLokFeeOutput = sigmaLokFeeOutbox(lokUtxo, sigmanautsFeeAddress);

  const sigFee = sigmaLokFeeOutput.value;
  const minerFee = BigInt(1e6);

  const inputs = await getInputBoxes(
    nodeProvider,
    [address.toString()],
    minerFee + sigFee,
    undefined,
    true,
  );

  const inputValue = inputs.reduce(
    (acc, input) => acc + BigInt(input.value),
    0n,
  );

  const tx = await txHelper.buildTransaction(
    blockHeight,
    [
      lokUtxo.setContextExtension({
        0: SInt(2),
      }),
      ...inputs,
    ],
    [sigmaLokRecreatedOutput, sigmaLokFeeOutput],
    undefined,
    undefined,
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

addMoreFunds();
