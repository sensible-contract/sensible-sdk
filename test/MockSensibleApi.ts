import { toHex } from "scryptlib";
import * as NftProto from "../src/bcp01/nftProto";
import * as TokenProto from "../src/bcp02/tokenProto";
import * as BN from "../src/bn.js";
import * as bsv from "../src/bsv";
import { getHeaderType, PROTO_TYPE } from "../src/common/protoheader";
import * as Utils from "../src/common/utils";
import {
  API_NET,
  AuthorizationOption,
  FungibleTokenSummary,
  FungibleTokenUnspent,
  NonFungibleTokenSummary,
  NonFungibleTokenUnspent,
  SensibleApiBase,
} from "../src/sensible-api/index";
import * as TestHelper from "./testHelper";

function getOutpoint(txid, index) {
  return txid + index;
}
enum UtxoType {
  bsv,
  ft,
  nft,
  other,
}
type UtxoPack = {
  outpoint: string;
  type: UtxoType;
  bsv?: {
    utxo: {
      txId: string;
      outputIndex: number;
      satoshis: number;
      address: string;
    };
  };
  ft?: {
    codehash: string;
    genesis: string;
    ftUtxo: FungibleTokenUnspent;
  };
  nft?: {
    codehash: string;
    genesis: string;
    nftUtxo: NonFungibleTokenUnspent;
  };
};
export class MockSensibleApi implements SensibleApiBase {
  serverBase: string;
  transactions: { [key: string]: bsv.Transaction } = {};
  utxoPacks: UtxoPack[] = [];
  network: "mainnet" | "testnet";
  constructor(apiNet: API_NET = API_NET.MAIN) {
    this.network = apiNet == API_NET.MAIN ? "mainnet" : "testnet";
  }

  public cleanCacheds() {
    this.utxoPacks = [];
    this.transactions = {};
  }

  public cleanBsvUtxos() {
    this.utxoPacks = this.utxoPacks.filter((v) => v.type != UtxoType.bsv);
  }
  public authorize(options: AuthorizationOption) {}
  /**
   * @param {string} address
   */
  public async getUnspents(
    address: string
  ): Promise<
    {
      txId: string;
      outputIndex: number;
      satoshis: number;
      address: string;
    }[]
  > {
    let arr = [];
    for (let i = 0; i < this.utxoPacks.length; i++) {
      if (this.utxoPacks[i].type == UtxoType.bsv) {
        if (this.utxoPacks[i].bsv.utxo.address == address) {
          arr.push(this.utxoPacks[i].bsv.utxo);
        }
      }
    }
    return arr;
  }

  /**
   * @param {string} hex
   */
  public async broadcast(txHex: string): Promise<string> {
    let tx = new bsv.Transaction(txHex);
    tx.inputs.forEach((input) => {
      let inputTxId = input.prevTxId.toString("hex");
      let outpoint = getOutpoint(inputTxId, input.outputIndex);

      let utxoPack = this.utxoPacks.find((v) => v.outpoint == outpoint);
      if (!utxoPack) {
        throw new Error("missing input");
      }
      this.utxoPacks = this.utxoPacks.filter((v) => v != utxoPack);

      input.output = this.transactions[inputTxId].outputs[input.outputIndex];
    });

    if (tx.inputs.length > 0) {
      if (TestHelper.verifyTx(tx) == false) {
        Utils.dumpTx(tx);
        throw new Error("verifyTx failed");
      }
    }

    tx.outputs.forEach((v, index) => {
      if (v.script.isPublicKeyHashOut()) {
        let address = new bsv.Address(v.script.getAddressInfo() as bsv.Address);
        this.utxoPacks.push({
          outpoint: getOutpoint(tx.id, index),
          type: UtxoType.bsv,
          bsv: {
            utxo: {
              txId: tx.id,
              outputIndex: index,
              satoshis: v.satoshis,
              address: address.toString(),
            },
          },
        });
      } else {
        let scriptBuf = v.script.toBuffer();
        let protoType = getHeaderType(scriptBuf);
        if (protoType == PROTO_TYPE.FT) {
          let dataPart = TokenProto.parseDataPart(scriptBuf);
          let genesis = TokenProto.getTokenID(scriptBuf).toString("hex");
          let codehash = toHex(TokenProto.getContractCodeHash(scriptBuf));
          let address = bsv.Address.fromPublicKeyHash(
            Buffer.from(dataPart.tokenAddress, "hex"),
            this.network
          );
          this.utxoPacks.push({
            outpoint: getOutpoint(tx.id, index),
            type: UtxoType.ft,
            ft: {
              genesis,
              codehash,
              ftUtxo: {
                txId: tx.id,
                outputIndex: index,
                tokenAddress: address.toString(),
                tokenAmount: dataPart.tokenAmount.toString(10),
              },
            },
          });
        } else if (protoType == PROTO_TYPE.NFT) {
          let dataPart = NftProto.parseDataPart(scriptBuf);
          let genesis = NftProto.getSensibleIDBuf(scriptBuf).toString("hex");
          let codehash = toHex(NftProto.getContractCodeHash(scriptBuf));
          let address = bsv.Address.fromPublicKeyHash(
            Buffer.from(dataPart.nftAddress, "hex"),
            this.network
          );
          this.utxoPacks.push({
            outpoint: getOutpoint(tx.id, index),
            type: UtxoType.nft,
            nft: {
              genesis,
              codehash,
              nftUtxo: {
                txId: tx.id,
                outputIndex: index,
                tokenAddress: address.toString(),
                tokenIndex: dataPart.tokenIndex.toString(10),
                metaTxId: "",
                metaOutputIndex: 0,
              },
            },
          });
        } else {
          this.utxoPacks.push({
            outpoint: getOutpoint(tx.id, index),
            type: UtxoType.other,
          });
        }
      }
    });

    this.transactions[tx.id] = tx;

    // Utils.dumpTx(tx);
    return tx.id;
  }

  /**
   * @param {string} txid
   */
  public async getRawTxData(txid: string): Promise<string> {
    let tx = this.transactions[txid];
    // if (!tx) {
    //   throw `get tx failed: ${txid}`;
    // }
    return tx.serialize(true);
  }

  /**
   * 通过FT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  public async getFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string,
    size: number = 10
  ): Promise<FungibleTokenUnspent[]> {
    let arr = [];
    for (let i = 0; i < this.utxoPacks.length; i++) {
      let utxoPack = this.utxoPacks[i];
      if (utxoPack.type == UtxoType.ft) {
        if (
          utxoPack.ft.codehash == codehash &&
          utxoPack.ft.genesis == genesis &&
          utxoPack.ft.ftUtxo.tokenAddress == address
        ) {
          arr.push(utxoPack.ft.ftUtxo);
        }
      }
    }
    return arr;
  }

  /**
   * 查询某人持有的某FT的余额
   */
  public async getFungibleTokenBalance(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<{
    balance: string;
    pendingBalance: string;
    utxoCount: number;
    decimal: number;
  }> {
    let balance = BN.Zero;
    for (let i = 0; i < this.utxoPacks.length; i++) {
      let utxoPack = this.utxoPacks[i];
      if (utxoPack.type == UtxoType.ft) {
        if (
          utxoPack.ft.codehash == codehash &&
          utxoPack.ft.genesis == genesis &&
          utxoPack.ft.ftUtxo.tokenAddress == address
        ) {
          balance = balance.add(
            BN.fromString(utxoPack.ft.ftUtxo.tokenAmount, 10)
          );
        }
      }
    }
    return {
      balance: balance.toString(),
      pendingBalance: "0",
      utxoCount: 0,
      decimal: 0,
    };
  }

  /**
   * 通过NFT合约CodeHash+溯源genesis获取某地址的utxo列表
   */
  public async getNonFungibleTokenUnspents(
    codehash: string,
    genesis: string,
    address: string
  ): Promise<NonFungibleTokenUnspent[]> {
    let arr = [];
    for (let i = 0; i < this.utxoPacks.length; i++) {
      let utxoPack = this.utxoPacks[i];
      if (utxoPack.type == UtxoType.nft) {
        if (
          utxoPack.nft.codehash == codehash &&
          utxoPack.nft.genesis == genesis &&
          utxoPack.nft.nftUtxo.tokenAddress == address
        ) {
          arr.push(utxoPack.nft.nftUtxo);
        }
      }
    }
    return arr;
  }

  /**
   * 查询某人持有的某FT的UTXO
   */
  public async getNonFungibleTokenUnspentDetail(
    codehash: string,
    genesis: string,
    tokenIndex: string
  ): Promise<NonFungibleTokenUnspent> {
    let arr = [];
    for (let i = 0; i < this.utxoPacks.length; i++) {
      let utxoPack = this.utxoPacks[i];
      if (utxoPack.type == UtxoType.nft) {
        if (
          utxoPack.nft.codehash == codehash &&
          utxoPack.nft.genesis == genesis &&
          utxoPack.nft.nftUtxo.tokenIndex == tokenIndex
        ) {
          arr.push(utxoPack.nft.nftUtxo);
        }
      }
    }
    return arr[0];
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   */
  public async getFungibleTokenSummary(
    address: string
  ): Promise<FungibleTokenSummary[]> {
    return [];
  }

  /**
   * 查询某人持有的所有NFT Token列表。获得持有的nft数量计数
   * @param {String} address
   * @returns
   */
  public async getNonFungibleTokenSummary(
    address: string
  ): Promise<NonFungibleTokenSummary[]> {
    return [];
  }
}
