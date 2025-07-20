import { compile } from '@fleet-sdk/compiler';
import * as fs from 'fs';
import * as path from 'path';

export async function compileSigmaLokContract() {
  const script = fs.readFileSync(
    path.join(__dirname, 'sigmanauts_v1_token_lock.es'),
    'utf-8',
  );

  const tree = compile(script, {
    segregateConstants: true,
    network: 'testnet',
    version: 0,
  });

  return tree.toAddress();
}

const contractAddress = await compileSigmaLokContract();

console.log(contractAddress.toString());
console.log(contractAddress.ergoTree);
