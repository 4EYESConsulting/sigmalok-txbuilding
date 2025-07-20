import { ErgoAddress, Network } from '@fleet-sdk/core';
import { getErgoNodeProvider } from '../../providers/node/ergoNodeProvider';
import { TransactionHelper } from '../../utils/transaction-helper';
import { sigmaLokGenesisOutbox } from '../../utils/outbox-helper';
import { GOLD_ORACLE_NFT_ID, SIGMALOK_CONTRACT_TREE } from '../contract';
import { getInputBoxes } from '../../utils/input-selector';

async function createGenesisLokOracle() {
  const nodeUrl = process.env.NODE_URL as string;
  const mnemonic = process.env.MNEMONIC as string;
  const network =
    !process.env.NETWORK || process.env.NETWORK.toLowerCase() === 'mainnet'
      ? Network.Mainnet
      : Network.Testnet;

  const txHelper = new TransactionHelper(mnemonic);

  const address = await txHelper.getAddress(0);

  const nodeProvider = getErgoNodeProvider(nodeUrl);

  const blockHeight = await nodeProvider.getCurrentHeight();

  console.log(
    `Connected to node ${nodeUrl} at height ${blockHeight} with wallet ${address}`,
  );

  const benefactorAddress = ErgoAddress.fromBase58(address.toString());
  const deadlineHeight = BigInt(blockHeight + 3);
  const oracleValue = BigInt(100);
  const oracleIsGreaterThan = true;
  const contractName = "Kushti's Oracle SigmaLok";
  const sigmanautsFeeAddress = ErgoAddress.fromBase58(
    '9eiTJkLo4CjFgp7eC9mgcJ1DpcENubWshZAASQZWzNEwpQKBJr2',
  );
  const sigmanautsFeeNanoErg = BigInt(1e7);
  const contractAddress = ErgoAddress.fromErgoTree(
    SIGMALOK_CONTRACT_TREE,
    network,
  );
  const nanoErgs = BigInt(1e8);

  const outbox = sigmaLokGenesisOutbox(
    benefactorAddress,
    contractName,
    deadlineHeight,
    sigmanautsFeeAddress,
    sigmanautsFeeNanoErg,
    contractAddress,
    nanoErgs,
    undefined,
    GOLD_ORACLE_NFT_ID,
    oracleValue,
    oracleIsGreaterThan,
  );

  const minerFee = BigInt(1e6);

  const inputs = await getInputBoxes(
    nodeProvider,
    [address.toString()],
    nanoErgs + minerFee,
    undefined,
    true,
  );

  const tx = await txHelper.buildTransaction(
    blockHeight,
    inputs,
    outbox,
    undefined,
    undefined,
    minerFee,
  );

  const signedTx = await txHelper.signTransaction(tx);

  const singleton = signedTx.outputs[0].assets[0].tokenId;

  console.log(`Singleton: ${singleton}`);

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

createGenesisLokOracle();
