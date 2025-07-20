import {
  type Amount,
  type BlockHeader,
  type Box,
  type BoxId,
  type EIP12UnsignedTransaction,
  type ErgoTreeHex,
  type NewToken,
  type NonMandatoryRegisters,
  NotSupportedError,
  orderBy,
  type SignedTransaction,
  some,
  type SortingDirection,
  type TokenId,
  type TransactionId,
  uniqBy,
} from '@fleet-sdk/common';
import type { BlockHeader as NodeBlockHeader } from '../../models/node.types';
import { ErgoAddress, ErgoBox } from '@fleet-sdk/core';
import type {
  BoxWhere,
  ChainProviderBox,
  HeaderQuery,
  IBlockchainProvider,
  TransactionEvaluationError,
  TransactionEvaluationResult,
  TransactionEvaluationSuccess,
  TransactionReductionResult,
} from '../../models/common.types';
import {
  DEFAULT_HEADERS,
  type Fetcher,
  get,
  post,
  type RequestOptions,
  type ResponseParser,
} from '../common/rest';
import type {
  BalanceInfo,
  FullBlock,
  NodeBoxOutput,
  NodeBoxQuery,
  NodeBoxWhere,
  NodeCompilerOutput,
  NodeErrorOutput,
  TokenInfo,
} from '../../models/node.types';

export function getErgoNodeProvider(
  url: URL | string,
  parser: ResponseParser = JSON,
  fetcher: Fetcher = fetch,
  headers: Headers = DEFAULT_HEADERS,
): ErgoNodeProvider {
  const nodeOptions: RequestOptions = {
    url: url,
    parser: parser,
    fetcher: fetcher,
    headers: headers,
  };

  return new ErgoNodeProvider(nodeOptions);
}

export class ErgoNodeProvider implements IBlockchainProvider<BoxWhere> {
  private _nodeOptions: RequestOptions;

  constructor(nodeOptions: RequestOptions) {
    if (!nodeOptions.fetcher) {
      nodeOptions.fetcher = fetch;
    }
    if (!nodeOptions.parser) {
      nodeOptions.parser = JSON;
    }
    if (!nodeOptions.headers) {
      nodeOptions.headers = DEFAULT_HEADERS;
    }
    this._nodeOptions = nodeOptions;
  }

  /**
   * Get unspent ergo boxes following the search criteria
   * Only one parameter among boxId, address, ergoTree or tokenId is supported
   * @param {NodeBoxQuery} query
   * @returns {ChainProviderBox[]}
   */
  async getBoxes(
    query: NodeBoxQuery<NodeBoxWhere>,
  ): Promise<ChainProviderBox[]> {
    let boxes: ChainProviderBox[] = [];
    for await (const chunk of this.streamBoxes(query)) {
      boxes = boxes.concat(chunk);
    }

    return orderBy(boxes, (box) => box.creationHeight, query.sort);
  }

  /**
   * Stream the unspent boxes matching the query by chunk
   * @param {NodeBoxQuery} query
   */
  async *streamBoxes(
    query: NodeBoxQuery<NodeBoxWhere>,
  ): AsyncIterable<ChainProviderBox[]> {
    const returnedBoxIds = new Set<string>();
    const CHUNK_SIZE = 50;
    let offset = 0,
      isEmpty = false;
    do {
      let boxes = await this.getBoxesChunk(query, CHUNK_SIZE, offset);

      if (some(boxes)) {
        // boxes can be moved from the mempool to the blockchain while streaming,
        // so we need to filter out boxes that have already been returned.
        if (boxes.some((box) => returnedBoxIds.has(box.boxId))) {
          boxes = boxes.filter((b) => !returnedBoxIds.has(b.boxId));
        }

        if (some(boxes)) {
          boxes = uniqBy(boxes, (box) => box.boxId);
          boxes.forEach((box) => returnedBoxIds.add(box.boxId));

          yield boxes;
        }
      }

      isEmpty = boxes.length === 0;
      offset += CHUNK_SIZE;
    } while (!isEmpty);
  }

  async getBoxesChunk(
    query: NodeBoxQuery<NodeBoxWhere>,
    limit: number,
    offset: number,
  ): Promise<ChainProviderBox[]> {
    let sort: SortingDirection = 'desc',
      output: ChainProviderBox[] = [];
    if (query.sort) {
      sort = query.sort;
    }

    if (query.where.boxId) {
      if (query.from === 'blockchain') {
        output.push(await this.getBoxByBoxId(query.where.boxId));
      }
      if (query.from === 'mempool') {
        output.push(await this.getMempoolBoxById(query.where.boxId));
      }
      if (query.from === 'blockchain+mempool') {
        output.push(await this.getBoxByBoxIdWithMemPool(query.where.boxId));
      }
    }
    if (query.where.address) {
      if (query.from === 'blockchain') {
        output = await this.getUnspentBoxesByAddress(
          query.where.address,
          limit,
          offset,
          sort,
          false,
        );
      }
      if (query.from === 'mempool') {
        const ergoTree: ErgoTreeHex = ErgoAddress.fromBase58(
          query.where.address.toString(),
        ).ergoTree;
        output = await this.getUnspentMempoolBoxesByErgotree(
          ergoTree,
          limit,
          offset,
          sort,
        );
      }
      if (query.from === 'blockchain+mempool') {
        output = await this.getUnspentBoxesByAddress(
          query.where.address,
          limit,
          offset,
          sort,
          true,
        );
      }
    }
    if (query.where.ergoTree) {
      if (query.from === 'blockchain') {
        output = await this.getUnspentBoxesByErgotree(
          query.where.ergoTree,
          limit,
          offset,
          sort,
          false,
        );
      }
      if (query.from === 'mempool') {
        output = await this.getUnspentMempoolBoxesByErgotree(
          query.where.ergoTree,
          limit,
          offset,
          sort,
        );
      }
      if (query.from === 'blockchain+mempool') {
        output = await this.getUnspentBoxesByErgotree(
          query.where.ergoTree,
          limit,
          offset,
          sort,
          true,
        );
      }
    }
    if (query.where.tokenId) {
      if (query.from === 'blockchain') {
        output = await this.getUnspentBoxesByTokenId(
          query.where.tokenId,
          limit,
          offset,
          sort,
          false,
        );
      }
      if (query.from === 'mempool') {
        output = await this.getUnspentMempoolBoxesByTokenId(
          query.where.tokenId,
          limit,
          offset,
          sort,
        );
      }
      if (query.from === 'blockchain+mempool') {
        output = await this.getUnspentBoxesByTokenId(
          query.where.tokenId,
          limit,
          offset,
          sort,
          true,
        );
      }
    }
    return output;
  }

  /**
   * Get the last headers objects
   * @param query HeaderQuery
   * @returns BlockHeader[]
   */
  async getHeaders(query: HeaderQuery): Promise<BlockHeader[]> {
    const res: BlockHeader[] = await this.nodeGetRequest(
      `blocks/lastHeaders/${query.take}`,
    );

    return res;
  }

  /**
   * Checks an Ergo transaction without sending it over the network.
   * Checks that transaction is valid and its inputs are in the UTXO set.
   * Returns transaction identifier if the transaction is passing the checks.
   * @param transaction
   * @returns TransactionEvaluationSuccess | TransactionEvaluationError
   */
  async checkTransaction(
    transaction: SignedTransaction,
  ): Promise<TransactionEvaluationResult> {
    const res = await this.nodePostRequest('transactions/check', transaction);
    if (res.error) {
      const out: TransactionEvaluationError = {
        success: false,
        message: JSON.stringify(res),
      };
      return out;
    } else {
      const out: TransactionEvaluationSuccess = {
        success: true,
        transactionId: res,
      };

      return out;
    }
  }

  /**
   * Submit an Ergo transaction to unconfirmed pool to send it over the network
   * @param transaction
   * @returns TransactionEvaluationSuccess | TransactionEvaluationError
   */
  async submitTransaction(
    transaction: SignedTransaction,
  ): Promise<TransactionEvaluationResult> {
    const res = await this.nodePostRequest('transactions', transaction);
    if (res.error) {
      const out: TransactionEvaluationError = {
        success: false,
        message: JSON.stringify(res),
      };
      return out;
    } else {
      const out: TransactionEvaluationSuccess = {
        success: true,
        transactionId: res,
      };

      return out;
    }
  }

  /**
   * Not supported operation ny node client
   */
  reduceTransaction(): Promise<TransactionReductionResult> {
    throw new NotSupportedError(
      'Transaction reducing is not supported by ergo-node.',
    );
  }

  /**
   * Get the current node height
   * @returns number
   */
  public async getCurrentHeight(): Promise<number> {
    const res = await this.nodeGetRequest('blockchain/indexedHeight');

    return parseInt(res.fullHeight);
  }

  /**
   * Get the current node indexed height
   * @returns number
   */
  public async getIndexedHeight(): Promise<number> {
    const res = await this.nodeGetRequest('blockchain/indexedHeight');

    return parseInt(res.indexedHeight);
  }

  /**
   * Get a transaction by transactionId
   * @param txId
   * @returns SignedTransaction
   */
  public async getTransactionByTransactionId(
    txId: TransactionId,
  ): Promise<EIP12UnsignedTransaction> {
    const output: EIP12UnsignedTransaction = await this.nodeGetRequest(
      `blockchain/transaction/byId/${txId}`,
    );

    return output;
  }

  /**
   * Get a transaction by index
   * @param index
   * @returns SignedTransaction
   */
  public async getTransactionByIndex(
    index: number,
  ): Promise<SignedTransaction> {
    const output: SignedTransaction = await this.nodeGetRequest(
      `blockchain/transaction/byIndex/${index}`,
    );

    return output;
  }

  /**
   * Get the historical transactions for an address (limit max 100)
   * @param address
   * @param limit
   * @param offset
   * @returns Array<SignedTransaction>
   */
  public async getTransactionsByAddress(
    address: string | ErgoAddress,
    limit = 5,
    offset = 0,
  ): Promise<Array<SignedTransaction>> {
    const res = await this.nodePostRequest(
      `blockchain/transaction/byAddress?offset=${offset}&limit=${limit}`,
      address.toString(),
    );
    const output: Array<SignedTransaction> = res.items;

    return output;
  }

  /**
   * Check if an address was already used
   * @param address
   * @returns boolean, true if the address has one or more transactions
   */
  public async addressHasTransactions(
    address: string | ErgoAddress,
  ): Promise<boolean> {
    const txList = await this.getTransactionsByAddress(address.toString(), 1);
    if (Array.isArray(txList)) {
      return txList.length > 0;
    } else {
      return false;
    }
  }

  /**
   * Get an ergo box by boxId
   * @param boxId
   * @returns ChainProviderBox
   */
  public async getBoxByBoxId(boxId: BoxId): Promise<ChainProviderBox> {
    const b = await this.nodeGetRequest(`blockchain/box/byId/${boxId}`);
    const bb = new ErgoBox(b);
    const ergoBox = this.setConfirmed(bb, b.inclusionHeight > 0);

    return ergoBox;
  }

  /**
   * Get an ergo box by boxId including the mempool
   * @param boxId
   * @returns ChainProviderBox
   */
  public async getBoxByBoxIdWithMemPool(
    boxId: BoxId,
  ): Promise<ChainProviderBox> {
    try {
      // try to get the confirmed box

      return await this.getBoxByBoxId(boxId);
    } catch (e) {
      // if the confirmed box is not found try to return it with the mempool included
      const b = await this.nodeGetRequest(`/utxo/withPool/byId/${boxId}`);
      const ergoBox = this.setConfirmed(new ErgoBox(b), false);

      return ergoBox;
    }
  }

  /**
   * Get an ergo box by index
   * @param index
   * @returns ChainProviderBox
   */
  public async getBoxByIndex(index: number): Promise<ChainProviderBox> {
    const b = await this.nodeGetRequest(`blockchain/box/byIndex/${index}`);
    const ergoBox = this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0);

    return ergoBox;
  }

  /**
   * Get boxes for an address
   * @param address
   * @param limit
   * @param offset
   * @returns ChainProviderBox[]
   */
  public async getBoxesByAddress(
    address: string | ErgoAddress,
    limit = 5,
    offset = 0,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodePostRequest(
      `blockchain/box/byAddress?offset=${offset}&limit=${limit}`,
      address.toString(),
    );
    const boxes: ChainProviderBox[] = res.items.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );

    return boxes;
  }

  /**
   * Get boxes by ergotree
   * @param ergotree
   * @param limit
   * @param offset
   * @returns ChainProviderBox[]
   */
  public async getBoxesByErgotree(
    ergotree: ErgoTreeHex,
    limit = 5,
    offset = 0,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodePostRequest(
      `blockchain/box/byErgoTree?offset=${offset}&limit=${limit}`,
      ergotree,
    );
    const boxes: ChainProviderBox[] = res.items.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );
    return boxes;
  }

  /**
   * Get UTXOs for an address
   * @param address
   * @param limit
   * @param offset
   * @param sort // desc: new boxes first, asc: old boxes first
   * @param includeUnconfirmed
   * @param excludeMempoolSpent
   * @returns ChainProviderBox[]
   */
  public async getUnspentBoxesByAddress(
    address: string | ErgoAddress,
    limit = 5,
    offset = 0,
    sort: SortingDirection = 'desc',
    includeUnconfirmed = false,
    excludeMempoolSpent = false,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodePostRequest(
      `blockchain/box/unspent/byAddress?offset=${offset}&limit=${limit}&sortDirection=${sort}&includeUnconfirmed=${includeUnconfirmed}&excludeMempoolSpent=${excludeMempoolSpent}`,
      address.toString(),
    );

    const boxes: ChainProviderBox[] = res.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );

    return boxes;
  }

  /**
   * Get UTXOs by ergotree
   * @param ergotree
   * @param limit
   * @param offset
   * @param sort // desc: new boxes first, asc: old boxes first
   * @param includeUnconfirmed
   * @param excludeMempoolSpent
   * @returns ChainProviderBox[]
   */
  public async getUnspentBoxesByErgotree(
    ergotree: ErgoTreeHex,
    limit = 5,
    offset = 0,
    sort: SortingDirection = 'desc',
    includeUnconfirmed = false,
    excludeMempoolSpent = false,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodePostRequest(
      `blockchain/box/unspent/byErgoTree?offset=${offset}&limit=${limit}&sortDirection=${sort}&includeUnconfirmed=${includeUnconfirmed}&excludeMempoolSpent=${excludeMempoolSpent}`,
      ergotree,
    );
    const boxes: ChainProviderBox[] = res.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );

    return boxes;
  }

  /**
   * Get boxes by tokenId
   * @param tokenId
   * @param limit
   * @param offset
   * @returns ChainProviderBox[]
   */
  public async getBoxesByTokenId(
    tokenId: TokenId,
    limit = 5,
    offset = 0,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodeGetRequest(
      `blockchain/box/byTokenId/${tokenId}?offset=${offset}&limit=${limit}`,
    );
    const boxes: ChainProviderBox[] = res.items.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );

    return boxes;
  }

  /**
   * Get UTXOs by tokenId
   * @param tokenId
   * @param limit
   * @param offset
   * @param sort
   * @param includeUnconfirmed
   * @param excludeMempoolSpent
   * @returns ChainProviderBox[]
   */
  public async getUnspentBoxesByTokenId(
    tokenId: TokenId,
    limit = 5,
    offset = 0,
    sort: SortingDirection = 'desc',
    includeUnconfirmed = false,
    excludeMempoolSpent = false,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodeGetRequest(
      `blockchain/box/unspent/byTokenId/${tokenId}?offset=${offset}&limit=${limit}&sortDirection=${sort}&includeUnconfirmed=${includeUnconfirmed}&excludeMempoolSpent=${excludeMempoolSpent}`,
    );
    const boxes: ChainProviderBox[] = res.map((b: NodeBoxOutput) =>
      this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0),
    );

    return boxes;
  }

  /**
   * Get output box from unconfirmed transactions in pool
   * @param boxId
   * @returns
   */
  public async getMempoolBoxById(boxId: BoxId): Promise<ChainProviderBox> {
    const b = await this.nodeGetRequest(
      `transactions/unconfirmed/outputs/byBoxId/${boxId}}`,
    );
    const ergoBox = this.setConfirmed(new ErgoBox(b), b.inclusionHeight > 0);

    return ergoBox;
  }

  /**
   * Finds all output boxes by ErgoTree hex among unconfirmed transactions
   * @param ergoTree
   * @param limit
   * @param offset
   * @returns
   */
  public async getMempoolBoxesByErgotree(
    ergoTree: ErgoTreeHex,
    limit = 50,
    offset = 0,
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodePostRequest(
      `transactions/unconfirmed/outputs/byErgoTree?offset=${offset}&limit=${limit}`,
      ergoTree,
    );
    const boxes: Array<ErgoBox> = res.map(
      (b: Box<Amount, NonMandatoryRegisters>) => new ErgoBox(b),
    );

    return boxes.map((b) => this.setConfirmed(b, false));
  }

  /**
   * Finds all unspent output boxes by ErgoTree hex among unconfirmed transactions
   * @param ergoTree
   * @param limit
   * @param offset
   * @param sort
   * @returns
   */
  public async getUnspentMempoolBoxesByErgotree(
    ergoTree: ErgoTreeHex,
    limit = 5,
    offset = 0,
    sort: SortingDirection = 'desc',
  ): Promise<ChainProviderBox[]> {
    if (limit === 0) {
      limit = 1000;
    }
    const unconfirmedTransactions = await this.nodePostRequest(
      `transactions/unconfirmed/byErgoTree`,
      ergoTree,
    );
    const unconfirmedInputBoxIds = unconfirmedTransactions
      .map((t: SignedTransaction) => {
        return t.inputs.map((i) => i.boxId);
      })
      .flat();
    const unspentOutputs: ErgoBox[] = unconfirmedTransactions
      .map((t: SignedTransaction) => t.outputs)
      .flat()
      .filter((b: Box<string>) => b.ergoTree === ergoTree)
      .filter((o: Box<string>) => !unconfirmedInputBoxIds.includes(o.boxId))
      .map((b: Box<string>) => new ErgoBox(b))
      .sort((a: ErgoBox, b: ErgoBox) => {
        if (sort === 'desc') {
          return b.creationHeight - a.creationHeight;
        } else {
          return a.creationHeight - b.creationHeight;
        }
      })
      .slice(offset, offset + limit);

    return unspentOutputs.map((b: ErgoBox) => this.setConfirmed(b, false));
  }

  /**
   * Get output box from unconfirmed transactions in pool by tokenId
   * @param tokenId
   * @returns
   */
  public async getUnspentMempoolBoxesByTokenId(
    tokenId: TokenId,
    limit = 5,
    offset = 0,
    sort: SortingDirection = 'desc',
  ): Promise<ChainProviderBox[]> {
    const res = await this.nodeGetRequest(
      `transactions/unconfirmed/outputs/byTokenId/${tokenId}`,
    );
    const boxes: Array<ErgoBox> = res
      .map((b: Box<Amount, NonMandatoryRegisters>) => new ErgoBox(b))
      .sort((a: ErgoBox, b: ErgoBox) => {
        if (sort === 'desc') {
          return b.creationHeight - a.creationHeight;
        } else {
          return a.creationHeight - b.creationHeight;
        }
      })
      .slice(offset, offset + limit);

    return boxes.map((b) => this.setConfirmed(b, false));
  }

  /**
   * Get the balance for an address
   * @param address
   * @param confirmed
   * @returns BalanceInfo
   */
  public async getBalanceByAddress(
    address: string | ErgoAddress,
    confirmed = true,
  ): Promise<BalanceInfo> {
    const res = await this.nodePostRequest(
      `blockchain/balance`,
      address.toString(),
    );
    const balance: BalanceInfo = {
      nanoERG: BigInt(0),
      tokens: [],
      confirmed: true,
    };
    if (confirmed) {
      if (res && res.confirmed && res.confirmed.tokens) {
        if (res.confirmed.nanoErgs) {
          balance.nanoERG = BigInt(res.confirmed.nanoErgs);
        }
        if (res.confirmed.tokens) {
          const confirmedTokens: Array<NewToken<bigint>> = res.confirmed.tokens;
          balance.tokens = confirmedTokens;
        }
      }
    } else {
      if (res && res.unconfirmed) {
        if (res.unconfirmed.nanoErgs) {
          balance.nanoERG = BigInt(res.unconfirmed.nanoErgs);
        }
        if (res.unconfirmed.tokens) {
          const unConfirmedTokens: Array<NewToken<bigint>> =
            res.unconfirmed.tokens;
          balance.tokens = unConfirmedTokens;
        }
      }
    }

    return balance;
  }

  /**
   * Get the information about a token
   * @param tokenId
   * @returns TokenInfo
   */
  public async getTokenInfo(tokenId: TokenId): Promise<TokenInfo> {
    const tokenInfo: TokenInfo = await this.nodeGetRequest(
      `blockchain/token/byId/${tokenId}`,
    );

    return tokenInfo;
  }

  /**
   * Get the information about an array of tokens
   * @param Array<tokenId>
   * @returns Array<TokenInfo>
   */
  public async getTokensByIds(tokenIds: string[]): Promise<TokenInfo[]> {
    const res = await this.nodePostRequest(`blockchain/tokens`, tokenIds);
    const tokens: TokenInfo[] = res.map((token: any) => ({
      id: token.id,
      boxId: token.boxId,
      emissionAmount: token.emissionAmount,
      name: token.name,
      description: token.description,
      decimals: token.decimals,
    }));

    return tokens;
  }

  /**
   * Get the information about the connected ergo node
   * @returns NodeInfo
   */
  public async getNodeInfo(): Promise<any> {
    const tokenInfo = await this.nodeGetRequest(`info`);

    return tokenInfo;
  }

  /**
   * Compile an ergoscript string to an ergo address
   * @param script
   * @returns NodeCompilerOutput
   */
  public async compileErgoscript(script: string): Promise<NodeCompilerOutput> {
    const res = await this.nodePostRequest(`script/p2sAddress`, {
      source: script,
    });
    if (res.error) {
      const outputError: NodeCompilerOutput = res;

      return outputError;
    } else {
      const outputSuccess: NodeCompilerOutput = res;

      return outputSuccess;
    }
  }

  /**
   * Get current pool of the unconfirmed transactions pool
   * @param limit : default 50
   * @param offset : default 0
   * @returns Array<SignedTransaction>
   */
  public async getUnconfirmedTransactions(
    limit = 50,
    offset = 0,
  ): Promise<Array<SignedTransaction>> {
    const res: Array<SignedTransaction> = await this.nodeGetRequest(
      `transactions/unconfirmed?offset=${offset}&limit=${limit}`,
    );

    return res;
  }

  /**
   * Get an unconfirmed transaction by transactionId from the mempool, returns undefined if not found
   * @param txId
   * @returns SignedTransaction | undefined
   */
  public async getUnconfirmedTransactionsByTransactionId(
    txId: TransactionId,
  ): Promise<SignedTransaction | undefined> {
    const res: SignedTransaction & NodeErrorOutput = await this.nodeGetRequest(
      `transactions/unconfirmed/byTransactionId/${txId}`,
    );
    if (res.error) {
      return;
    } else {
      return res;
    }
  }

  /**
   * Finds unconfirmed transactions by ErgoTree hex of one of its output or input boxes (if present in UtxoState)
   * @param ergotree
   * @param limit
   * @param offset
   * @returns Array<SignedTransaction>
   */
  public async getUnconfirmedTransactionsByErgoTree(
    ergotree: ErgoTreeHex,
    limit = 50,
    offset = 0,
  ): Promise<Array<SignedTransaction>> {
    const res: Array<SignedTransaction> = await this.nodePostRequest(
      `transactions/unconfirmed/byErgoTree?offset=${offset}&limit=${limit}`,
      ergotree,
    );

    return res;
  }

  /**
   * Generic get request to the node
   * @param url : url to fetch without the node base url
   * for example for information about the node: nodeGetRequest('info')
   *             for box by boxId: nodeGetRequest('blockchain/box/byId/{boxId}')
   * @returns any
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public async nodeGetRequest(url: string): Promise<any> {
    const res = await get(this._updateOptionURL(url));

    return res;
  }

  /**
   * Generic post request to the node
   * @param url : url to fetch without the node base url
   * for example for the balance of an address: nodePostRequest('blockchain/balance', "address" )
   * @param body : body to post
   * @returns any
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  public async nodePostRequest(url: string, body: any = {}): Promise<any> {
    const res = await post(body, this._updateOptionURL(url));

    return res;
  }

  public get nodeOptions(): RequestOptions {
    return this._nodeOptions;
  }
  public set nodeOptions(value: RequestOptions) {
    this._nodeOptions = value;
  }

  private setConfirmed(box: ErgoBox, confirmed: boolean): ChainProviderBox {
    return {
      ...box.toPlainObject('EIP-12'), // Ensure all properties of ErgoBox are included
      confirmed: confirmed, // Add the confirmed property
    } as ChainProviderBox; // Cast to ChainProviderBox to ensure type compatibility
  }

  private _updateOptionURL(url: string) {
    const res = { ...this._nodeOptions };
    res.url = res.url.toString().replace(/\/?$/, '/') + url.replace(/^\/+/, ''); // force trailing slash, remove leading slashes

    return res;
  }

  /**
   * Get full block information by block ID
   * @param blockId The ID of the block to fetch
   * @returns Block information including header, transactions, extension and proofs
   */
  public async getBlockById(blockId: string): Promise<FullBlock> {
    return await this.nodeGetRequest(`blocks/${blockId}`);
  }

  /**
   * Get block headers for a specific height or range of heights
   * @param startHeightInclusive The starting height (inclusive)
   * @param endHeightInclusive Optional ending height (inclusive)
   * @returns BlockHeader[]
   */
  public async getBlockByHeight(
    startHeightInclusive: number,
    endHeightInclusive?: number,
  ): Promise<NodeBlockHeader[]> {
    const toHeight = endHeightInclusive ?? startHeightInclusive;

    if (endHeightInclusive && endHeightInclusive < startHeightInclusive) {
      return [];
    }

    const headers: NodeBlockHeader[] = await this.nodeGetRequest(
      `blocks/chainSlice?fromHeight=${
        startHeightInclusive - 1
      }&toHeight=${toHeight}`,
    );

    return headers;
  }
}
