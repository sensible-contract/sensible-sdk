import { MetaSV } from "./MetaSV";
import { Sensible } from "./Sensible";

export enum API_NET {
  MAIN = "mainnet",
  TEST = "testnet",
}

export enum API_TARGET {
  SENSIBLE = "sensible",
  METASV = "metasv",
}

export type NonFungibleTokenUnspent = {
  txId: string;
  outputIndex: number;
  tokenAddress: string;
  tokenId: number;
  metaTxId: string;
};

export type FungibleTokenUnspent = {
  txId: string;
  outputIndex: number;
  tokenAddress: string;
  tokenAmount: bigint;
};

export type SA_utxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  address: string;
};

export interface SensibleApiBase {
  authorize: (options: any) => void;
  getUnspents: (address: string) => Promise<SA_utxo[]>;
  getRawTxData: (txid: string) => Promise<string>;
  broadcast: (hex: string) => Promise<string>;
  getFungibleTokenUnspents: (
    codehash: string,
    genesis: string,
    address: string,
    size?: number
  ) => Promise<FungibleTokenUnspent[]>;
  getFungibleTokenBalance: (
    codehash: string,
    genesis: string,
    address: string
  ) => Promise<{
    balance: number;
    pendingBalance: number;
    utxoCount: number;
    decimal: number;
  }>;
  getFungibleTokenSummary(
    address: string
  ): Promise<{
    codehash: string;
    genesis: string;
    pendingBalance: number;
    balance: number;
    symbol: string;
    decimal: number;
  }>;
  getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<NonFungibleTokenUnspent[]>;
  getNonFungibleTokenUnspentDetail(
    codehash: string,
    genesis: string,
    tokenid: string
  ): Promise<NonFungibleTokenUnspent>;

  getNonFungibleTokenSummary(
    address: string
  ): Promise<{
    codehash: string;
    genesis: string;
    count: number;
    pendingCount: number;
    symbol: string;
  }>;
}

export class SensibleApi implements SensibleApiBase {
  private apiTarget: API_TARGET;
  private apiHandler: SensibleApiBase;
  constructor(apiNet: API_NET, apiTarget: API_TARGET = API_TARGET.SENSIBLE) {
    switch (apiTarget) {
      case API_TARGET.METASV: {
        this.apiHandler = new MetaSV(apiNet);
        break;
      }
      default: {
        this.apiHandler = new Sensible(apiNet);
        break;
      }
    }
  }

  authorize(options: any) {
    return this.apiHandler.authorize(options);
  }
  async getUnspents(address: string) {
    return this.apiHandler.getUnspents(address);
  }

  async getRawTxData(txid: string) {
    return this.apiHandler.getRawTxData(txid);
  }

  async broadcast(hex: string) {
    return this.apiHandler.broadcast(hex);
  }

  async getFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string,
    size?: number
  ) {
    return this.apiHandler.getFungibleTokenUnspents(
      codehash,
      genesis,
      address,
      size
    );
  }
  async getFungibleTokenBalance(
    codehash: string,
    genesis: string,
    address: string
  ) {
    return this.apiHandler.getFungibleTokenBalance(codehash, genesis, address);
  }

  async getFungibleTokenSummary(address: string) {
    return this.apiHandler.getFungibleTokenSummary(address);
  }
  async getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ) {
    return this.apiHandler.getNonFungibleTokenUnspents(
      codehash,
      genesis,
      address
    );
  }
  async getNonFungibleTokenUnspentDetail(
    codehash: string,
    genesis: string,
    tokenid: string
  ) {
    return this.apiHandler.getNonFungibleTokenUnspentDetail(
      codehash,
      genesis,
      tokenid
    );
  }

  async getNonFungibleTokenSummary(address: string) {
    return this.apiHandler.getNonFungibleTokenSummary(address);
  }
}
