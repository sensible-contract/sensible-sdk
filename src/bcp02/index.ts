import { bsv, Bytes, toHex } from "scryptlib";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as Utils from "../common/utils";
import { SigHashInfo, SigInfo } from "../common/utils";
import { API_NET, FungibleTokenUnspent, SensibleApi } from "../sensible-api";
import {
  FtUtxo,
  FungibleToken,
  RouteCheckType,
  sighashType,
  Utxo,
} from "./FungibleToken";
import * as SizeHelper from "./SizeHelper";
import * as TokenProto from "./tokenProto";
import * as TokenUtil from "./tokenUtil";
const $ = bsv.util.preconditions;
const _ = bsv.deps._;
const defaultSignerConfigs: SignerConfig[] = [
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
];

const SIZE_OF_GENESIS_TOKEN = 4074;
const SIZE_OF_TOKEN = 7164;
const SIZE_OF_ROUTE_CHECK_TYPE_3To3 = 6362;
const SIZE_OF_ROUTE_CHECK_TYPE_6To6 = 10499;
const SIZE_OF_ROUTE_CHECK_TYPE_10To10 = 16015;
const SIZE_OF_ROUTE_CHECK_TYPE_3To100 = 52244;
const SIZE_OF_ROUTE_CHECK_TYPE_20To3 = 21765;
const BASE_UTXO_FEE = 1000;
const BASE_FEE = 52416;
const SIZE_OF_P2PKH = 106;

type ParamUtxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  wif?: string;
  address?: any;
};

type ParamFtUtxo = {
  txId: string;
  satoshis: number;
  outputIndex: number;
  lockingScript: string;
  tokenAddress: string;
  tokenAmount: any;
  wif?: string;
};

type Purse = {
  privateKey: any;
  address: any;
};

function checkParamUtxoFormat(utxo) {
  if (utxo) {
    if (!utxo.txId || !utxo.satoshis || !utxo.wif) {
      throw new Error(`UtxoFormatError-valid format example :{
				txId:'85f583e7a8e8b9cf86e265c2594c1e4eb45db389f6781c3b1ec9aa8e48976caa',
				satoshis:1000,
				outputIndex:1,
				wif:'L3J1A6Xyp7FSg9Vtj3iBKETyVpr6NibxUuLhw3uKpUWoZBLkK1hk'
			}`);
    }
  }
}

function checkParamSigners(signers) {
  if (signers.length != 3) {
    throw new Error("only support 3 signers");
  }
  let signer = signers[0];
  if (
    Utils.isNull(signer.satotxApiPrefix) ||
    Utils.isNull(signer.satotxPubKey)
  ) {
    throw new Error(`SignerFormatError-valid format example :
    signers:[{
			satotxApiPrefix: "https://api.satotx.com",
    	satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
		},...]`);
  }
}

function checkParamNetwork(network) {
  if (!["mainnet", "testnet"].includes(network)) {
    throw new Error(`NetworkFormatError:only support 'mainnet' and 'testnet'`);
  }
}

function checkParamGenesis(genesis) {
  $.checkArgument(
    _.isString(genesis),
    "Invalid Argument: genesis should be a string"
  );
  $.checkArgument(
    genesis.length == 72,
    `Invalid Argument: genesis.length must be 72`
  );
}

function checkParamCodehash(codehash) {
  $.checkArgument(
    _.isString(codehash),
    "Invalid Argument: codehash should be a string"
  );
  $.checkArgument(
    codehash.length == 40,
    `Invalid Argument: codehash.length must be 40`
  );
}

function checkParamReceivers(receivers) {
  const ErrorName = "ReceiversFormatError";
  if (Utils.isNull(receivers)) {
    throw new Error(`${ErrorName}: param should not be null`);
  }
  if (receivers.length > 0) {
    let receiver = receivers[0];
    if (Utils.isNull(receiver.address) || Utils.isNull(receiver.amount)) {
      throw new Error(`${ErrorName}-valid format example
      [
        {
          address: "mtjjuRuA84b2qVyo28AyJQ8AoUmpbWEqs3",
          amount: "1000",
        },
      ]
      `);
    }
  }
}

/**
 * 构造genesis值
 * @param txid
 * @param index
 * @returns
 */
function getGenesis(txid: string, index: number): string {
  const txidBuf = Buffer.from(txid, "hex").reverse();
  const indexBuf = Buffer.alloc(4, 0);
  indexBuf.writeUInt32LE(index);
  return toHex(Buffer.concat([txidBuf, indexBuf]));
}

/**
 * 解析genesis值
 * @param genesis
 * @returns
 */
function parseGenesis(genesis: string) {
  let tokenIDBuf = Buffer.from(genesis, "hex");
  let genesisTxId = tokenIDBuf.slice(0, 32).reverse().toString("hex");
  let genesisOutputIndex = tokenIDBuf.readUIntLE(32, 4);
  return {
    genesisTxId,
    genesisOutputIndex,
  };
}

/**
Sensible Fungible Token
感应合约同质化代币
 */
export class SensibleFT {
  private signers: SatotxSigner[];
  private feeb: number;
  private network: API_NET;
  private mock: boolean;
  private purse: Purse;
  private sensibleApi: SensibleApi;
  private zeroAddress: any;
  private ft: FungibleToken;
  private debug: boolean;
  private transferPart2?: any;
  /**
   *
   * @param signers - 签名器
   * @param feeb (可选)交易费率，默认0.5
   * @param network (可选)当前网络，mainnet/testnet，默认mainnet
   * @param purse (可选)提供手续费的私钥wif，不提供则需要在genesis/issue/transfer手动传utxos
   * @param mock (可选)开启后genesis/issue/transfer时不进行广播，默认关闭
   * @param debug (可选)开启后将会在解锁合约时进行verify，默认关闭
   */
  constructor({
    signers = defaultSignerConfigs,
    feeb = 0.5,
    network = API_NET.MAIN,
    mock = false,
    purse,
    debug = false,
  }: {
    signers: SignerConfig[];
    feeb?: number;
    network?: API_NET;
    mock?: boolean;
    purse?: string;
    debug?: boolean;
  }) {
    checkParamSigners(signers);
    checkParamNetwork(network);
    // checkParamApiTarget(apiTarget);
    this.signers = signers.map(
      (v) => new SatotxSigner(v.satotxApiPrefix, v.satotxPubKey)
    );
    this.feeb = feeb;
    this.network = network;
    this.mock = mock;
    this.sensibleApi = new SensibleApi(network);
    this.debug = debug;

    if (network == "mainnet") {
      this.zeroAddress = new bsv.Address("1111111111111111111114oLvT2");
    } else {
      this.zeroAddress = new bsv.Address("mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8");
    }

    this.ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );

    if (purse) {
      const privateKey = bsv.PrivateKey.fromWIF(purse);
      const address = privateKey.toAddress(this.network);
      this.purse = {
        privateKey,
        address,
      };
    }
  }

  private async _pretreatUtxos(
    paramUtxos: ParamUtxo[]
  ): Promise<{ utxos: Utxo[]; utxoPrivateKeys: any[] }> {
    let utxoPrivateKeys = [];
    let utxos: Utxo[] = [];

    //如果没有传utxos，则由purse提供
    if (!paramUtxos) {
      if (!this.purse) throw new Error("Utxos or Purse must be provided.");
      paramUtxos = await this.sensibleApi.getUnspents(
        this.purse.address.toString()
      );
      paramUtxos.forEach((v) => {
        utxoPrivateKeys.push(this.purse.privateKey);
      });
    } else {
      paramUtxos.forEach((v) => {
        if (v.wif) {
          let privateKey = new bsv.PrivateKey(v.wif);
          utxoPrivateKeys.push(privateKey);
          v.address = privateKey.toAddress(this.network).toString(); //兼容旧版本只提供wif没提供address
        }
      });
    }
    paramUtxos.forEach((v) => {
      utxos.push({
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
        address: new bsv.Address(v.address, this.network),
      });
    });

    if (utxos.length == 0) throw new Error("Insufficient balance.");
    return { utxos, utxoPrivateKeys };
  }

  private async _pretreatFtUtxos(
    paramFtUtxos: ParamFtUtxo[],
    codehash?: string,
    genesis?: string,
    senderPrivateKey?: any,
    senderPublicKey?: any
  ): Promise<{ ftUtxos: FtUtxo[]; ftUtxoPrivateKeys: any[] }> {
    let ftUtxos: FtUtxo[] = [];
    let ftUtxoPrivateKeys = [];

    let publicKeys = [];
    if (!paramFtUtxos) {
      if (senderPrivateKey) {
        senderPublicKey = senderPrivateKey.toPublicKey();
      }
      if (!senderPublicKey)
        throw new Error(
          "ftUtxos or senderPublicKey or senderPrivateKey must be provided."
        );

      paramFtUtxos = await this.sensibleApi.getFungibleTokenUnspents(
        codehash,
        genesis,
        senderPublicKey.toAddress(this.network).toString(),
        20
      );

      paramFtUtxos.forEach((v) => {
        if (senderPrivateKey) {
          ftUtxoPrivateKeys.push(senderPrivateKey);
        }
        publicKeys.push(senderPublicKey);
      });
    } else {
      paramFtUtxos.forEach((v) => {
        if (v.wif) {
          let privateKey = new bsv.PrivateKey(v.wif);
          ftUtxoPrivateKeys.push(privateKey);
          publicKeys.push(privateKey.toPublicKey());
        }
      });
    }

    paramFtUtxos.forEach((v, index) => {
      ftUtxos.push({
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
        tokenAddress: new bsv.Address(v.tokenAddress, this.network),
        tokenAmount: BigInt(v.tokenAmount),
        publicKey: publicKeys[index],
      });
    });

    if (ftUtxos.length == 0) throw new Error("Insufficient token.");
    return { ftUtxos, ftUtxoPrivateKeys };
  }

  private _selectFtUtxos() {}

  /**
   * 构造一笔的genesis交易,并广播
   * @param tokenName 代币名称
   * @param tokenSymbol 代币符号
   * @param decimalNum 代币符号
   * @param utxos (可选)手动传utxo
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param genesisWif 发行私钥
   * @param noBroadcast (可选)不进行广播，默认false
   * @returns
   */
  public async genesis({
    tokenName,
    tokenSymbol,
    decimalNum,
    utxos,
    changeAddress,
    opreturnData,
    genesisWif,
    noBroadcast = false,
  }: {
    tokenName: string;
    tokenSymbol: string;
    decimalNum: number;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
    genesisWif: any;
    noBroadcast?: any;
  }): Promise<{
    txHex: string;
    txid: string;
    genesis: string;
    codehash: string;
    tx: any;
  }> {
    //validate params
    $.checkArgument(
      _.isString(tokenName),
      "Invalid Argument: tokenName should be a string"
    );
    $.checkArgument(
      Buffer.from(tokenName).length <= 20,
      `Invalid Argument: Buffer.from(tokenName).length must not be larger than 20`
    );
    $.checkArgument(
      _.isString(tokenSymbol),
      "Invalid Argument: tokenSymbol should be a string"
    );
    $.checkArgument(
      Buffer.from(tokenSymbol).length <= 10,
      `Invalid Argument:  Buffer.from(tokenSymbol).length must not be larger than 10`
    );
    $.checkArgument(
      _.isNumber(decimalNum),
      "Invalid Argument: decimalNum should be a number"
    );
    $.checkArgument(
      decimalNum >= 0 && decimalNum <= 255,
      `Invalid Argument:  decimalNum must be between 0 and 255`
    );
    $.checkArgument(genesisWif, "genesisWif is required");
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    let genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    let genesisPublicKey = genesisPrivateKey.toPublicKey();
    let { codehash, genesis, tx } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      genesisPublicKey,
    });

    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id, tx, codehash, genesis };
  }

  /**
   * 构造(未签名的)genesis交易
   * @param tokenName 代币名称
   * @param tokenSymbol 代币符号
   * @param decimalNum 代币符号
   * @param utxos (可选)手动传utxo
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param genesisPublicKey 发行公钥
   * @returns
   */
  public async unsignGenesis({
    tokenName,
    tokenSymbol,
    decimalNum,
    utxos,
    changeAddress,
    opreturnData,
    genesisPublicKey,
  }: {
    tokenName: string;
    tokenSymbol: string;
    decimalNum: number;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
    genesisPublicKey: any;
  }): Promise<{
    tx: any;
    sigHashList: SigHashInfo[];
  }> {
    //validate params
    $.checkArgument(
      _.isString(tokenName),
      "Invalid Argument: tokenName should be a string"
    );
    $.checkArgument(
      Buffer.from(tokenName).length <= 20,
      `Invalid Argument: Buffer.from(tokenName).length must not be larger than 20`
    );
    $.checkArgument(
      _.isString(tokenSymbol),
      "Invalid Argument: tokenSymbol should be a string"
    );
    $.checkArgument(
      Buffer.from(tokenSymbol).length <= 10,
      `Invalid Argument:  Buffer.from(tokenSymbol).length must not be larger than 10`
    );
    $.checkArgument(
      _.isNumber(decimalNum),
      "Invalid Argument: decimalNum should be a number"
    );
    $.checkArgument(
      decimalNum >= 0 && decimalNum <= 255,
      `Invalid Argument:  decimalNum must be between 0 and 255`
    );
    $.checkArgument(genesisPublicKey, "genesisPublicKey is required");
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let { tx } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      changeAddress,
      opreturnData,
      genesisPublicKey,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = utxoInfo.utxos[inputIndex].address.toString();
      sigHashList.push({
        sighash: toHex(
          bsv.Transaction.sighash.sighash(
            tx,
            sighashType,
            inputIndex,
            input.output.script,
            input.output.satoshisBN
          )
        ),
        sighashType,
        address,
        inputIndex,
        isP2PKH: true,
      });
    });

    return { tx, sigHashList };
  }

  private async _genesis({
    tokenName,
    tokenSymbol,
    decimalNum,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    opreturnData,
    genesisPublicKey,
  }: {
    tokenName: string;
    tokenSymbol: string;
    decimalNum: number;
    utxos?: any;
    utxoPrivateKeys?: any;
    changeAddress?: any;
    opreturnData?: any;
    genesisPublicKey: any;
  }) {
    //create genesis contract
    let genesisContract = this.ft.createGenesisContract(genesisPublicKey, {
      tokenName,
      tokenSymbol,
      decimalNum,
    });

    //create genesis tx
    let tx = this.ft.createGenesisTx({
      utxos,
      changeAddress,
      feeb: this.feeb,
      genesisContract,
      utxoPrivateKeys,
      opreturnData,
    });

    //calculate genesis/codehash
    let genesis, codehash;
    {
      let genesisTxId = tx.id;
      let genesisOutputIndex = 0;
      genesis = getGenesis(genesisTxId, genesisOutputIndex);
      let tokenContract = this.ft.createTokenContract(
        genesisTxId,
        genesisOutputIndex,
        genesisContract.lockingScript,
        {
          receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
          tokenAmount: BigInt(0),
        }
      );
      codehash = Utils.getCodeHash(tokenContract.lockingScript);
    }

    //check fee enough
    const size = tx.toBuffer().length;
    const feePaid = tx._getUnspentValue();
    const feeRate = feePaid / size;
    if (feeRate < this.feeb) {
      throw new Error(
        `Insufficient balance.The fee rate should not be less than ${this.feeb}, but in the end it is ${feeRate}.`
      );
    }

    return { tx, genesis, codehash };
  }

  /**
   * 构造发行代币的交易并广播
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param genesisWif 发行私钥
   * @param receiverAddress 接收地址
   * @param tokenAmount 发行代币数量
   * @param allowIncreaseIssues (可选)是否允许增发，默认允许
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async issue({
    genesis,
    codehash,
    genesisWif,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues = true,
    utxos,
    changeAddress,
    opreturnData,
    noBroadcast = false,
  }: {
    genesis: string;
    codehash: string;
    genesisWif: string;
    receiverAddress: any;
    tokenAmount: string | bigint;
    allowIncreaseIssues: boolean;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
    noBroadcast?: boolean;
  }): Promise<{ txHex: string; txid: string; tx: any }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    $.checkArgument(genesisWif, "genesisWif is required");
    $.checkArgument(receiverAddress, "receiverAddress is required");
    $.checkArgument(tokenAmount, "tokenAmount is required");

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    let genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    let genesisPublicKey = genesisPrivateKey.toPublicKey();
    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = BigInt(tokenAmount);
    let { tx } = await this._issue({
      genesis,
      codehash,
      receiverAddress,
      tokenAmount,
      allowIncreaseIssues,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      genesisPrivateKey,
      genesisPublicKey,
    });

    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id, tx };
  }

  /**
   * 构造(未签名的)发行代币的交易
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param genesisPublicKey 发行公钥
   * @param receiverAddress 接收地址
   * @param tokenAmount 发行代币数量
   * @param allowIncreaseIssues (可选)是否允许增发，默认允许
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @returns
   */
  public async unsignIssue({
    genesis,
    codehash,
    genesisPublicKey,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues = true,
    utxos,
    changeAddress,
    opreturnData,
  }: {
    genesis: string;
    codehash: string;
    genesisPublicKey: any;
    receiverAddress: any;
    tokenAmount: string | bigint;
    allowIncreaseIssues?: boolean;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
  }): Promise<{ tx: any; sigHashList: SigHashInfo[] }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    $.checkArgument(genesisPublicKey, "genesisPublicKey is required");
    $.checkArgument(receiverAddress, "receiverAddress is required");
    $.checkArgument(tokenAmount, "tokenAmount is required");
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = BigInt(tokenAmount);
    let { tx } = await this._issue({
      genesis,
      codehash,
      receiverAddress,
      tokenAmount,
      allowIncreaseIssues,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      genesisPublicKey,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = "";
      let isP2PKH;
      if (inputIndex == 0) {
        address = genesisPublicKey.toAddress(this.network).toString();
        isP2PKH = false;
      } else {
        address = utxoInfo.utxos[inputIndex - 1].address.toString();
        isP2PKH = true;
      }
      sigHashList.push({
        sighash: toHex(
          bsv.Transaction.sighash.sighash(
            tx,
            sighashType,
            inputIndex,
            input.output.script,
            input.output.satoshisBN
          )
        ),
        sighashType,
        address,
        inputIndex,
        isP2PKH,
      });
    });

    return { tx, sigHashList };
  }

  private async _issue({
    genesis,
    codehash,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues = true,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    opreturnData,
    genesisPrivateKey,
    genesisPublicKey,
  }: {
    genesis: string;
    codehash: string;
    receiverAddress: any;
    tokenAmount: bigint;
    allowIncreaseIssues: boolean;
    utxos?: any;
    utxoPrivateKeys?: any;
    changeAddress?: any;
    opreturnData?: any;
    noBroadcast?: boolean;
    genesisPrivateKey?: any;
    genesisPublicKey: any;
  }) {
    //构造发行合约
    let genesisContract = this.ft.createGenesisContract(genesisPublicKey);
    let genesisContractCodehash = Utils.getCodeHash(
      genesisContract.lockingScript
    );

    //寻找发行用的UTXO
    let spendByTxId;
    let spendByOutputIndex;
    let { genesisTxId, genesisOutputIndex } = parseGenesis(genesis);
    let issueUtxos = await this.sensibleApi.getFungibleTokenUnspents(
      genesisContractCodehash,
      genesis,
      this.zeroAddress.toString()
    );
    if (issueUtxos.length > 0) {
      //非首次发行
      spendByTxId = issueUtxos[0].txId;
      spendByOutputIndex = issueUtxos[0].outputIndex;
    } else {
      //首次发行
      spendByTxId = genesisTxId;
      spendByOutputIndex = genesisOutputIndex;
    }
    //当出现重复发行时会在verify的时候不通过
    //应该在这里提前判断
    //todo

    //查询前序交易的信息
    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);
    const spendByTx = new bsv.Transaction(spendByTxHex);
    let preUtxoTxId = spendByTx.inputs[0].prevTxId.toString("hex"); //第一个输入必定能够作为前序输入
    let preUtxoOutputIndex = spendByTx.inputs[0].outputIndex;
    let preUtxoTxHex = await this.sensibleApi.getRawTxData(preUtxoTxId);

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) throw new Error("Insufficient balance.");

    let estimateSatoshis = this.getIssueEstimateFee({
      opreturnData,
      allowIncreaseIssues,
    });
    if (balance < estimateSatoshis) {
      throw new Error(
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    //构造token合约
    const spendByLockingScript = spendByTx.outputs[spendByOutputIndex].script;
    let dataPartObj = TokenProto.parseDataPart(spendByLockingScript.toBuffer());
    const dataPart = TokenProto.newDataPart(dataPartObj);
    genesisContract.setDataPart(dataPart.toString("hex"));
    let tokenContract = this.ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      {
        receiverAddress,
        tokenAmount,
      }
    );

    //构造发行交易
    let tx = await this.ft.createIssueTx({
      genesisContract,

      spendByTxId,
      spendByOutputIndex,
      spendByLockingScript,

      utxos,
      changeAddress,
      feeb: this.feeb,
      tokenContract,
      allowIncreaseIssues,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },
      signers: this.signers,

      opreturnData,
      genesisPrivateKey,
      utxoPrivateKeys,
      debug: this.debug,
    });

    //判断最终手续费是否充足
    const size = tx.toBuffer().length;
    const feePaid = tx._getUnspentValue();
    const feeRate = feePaid / size;
    if (feeRate < this.feeb) {
      throw new Error(
        `Insufficient balance.The fee rate should not be less than ${this.feeb}, but in the end it is ${feeRate}.`
      );
    }
    return { tx };
  }

  /**
   * 仅在决定使用哪些ftUtxo后才去请求txHex，避免没必要的网络请求
   * @param ftUtxos
   * @returns
   */
  private async supplyFtUtxosInfo(ftUtxos: FtUtxo[]) {
    let cachedHexs: {
      [txid: string]: { waitingRes?: Promise<string>; hex?: string };
    } = {};
    //获取当前花费的tx raw
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      if (!cachedHexs[ftUtxo.txId]) {
        //防止冗余查询
        cachedHexs[ftUtxo.txId] = {
          waitingRes: this.sensibleApi.getRawTxData(ftUtxo.txId), //异步请求
        };
      }
    }
    for (let id in cachedHexs) {
      //等异步请求完毕
      if (cachedHexs[id].waitingRes && !cachedHexs[id].hex) {
        cachedHexs[id].hex = await cachedHexs[id].waitingRes;
      }
    }
    ftUtxos.forEach((v) => {
      v.txHex = cachedHexs[v.txId].hex;
    });
    //获取前序tx raw，必须的吗？
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      const tx = new bsv.Transaction(ftUtxo.txHex);
      let preTxId = tx.inputs[0].prevTxId.toString("hex"); //第一个输入必定能够作为前序输入
      let preOutputIndex = tx.inputs[0].outputIndex;
      ftUtxo.preTxId = preTxId;
      ftUtxo.preOutputIndex = preOutputIndex;
      if (!cachedHexs[preTxId]) {
        //防止冗余查询
        cachedHexs[preTxId] = {
          waitingRes: this.sensibleApi.getRawTxData(preTxId),
        }; //异步请求
      }
    }
    for (let id in cachedHexs) {
      //等异步请求完毕
      if (cachedHexs[id].waitingRes && !cachedHexs[id].hex) {
        cachedHexs[id].hex = await cachedHexs[id].waitingRes;
      }
    }
    ftUtxos.forEach((v) => {
      v.preTxHex = cachedHexs[v.preTxId].hex;
      const tx = new bsv.Transaction(v.preTxHex);
      let dataPartObj = TokenProto.parseDataPart(
        tx.outputs[v.preOutputIndex].script.toBuffer()
      );
      v.preTokenAmount = dataPartObj.tokenAmount;
      if (
        dataPartObj.tokenAddress == "0000000000000000000000000000000000000000"
      ) {
        v.preTokenAddress = this.zeroAddress; //genesis 情况下为了让preTokenAddress成为合法地址，但最后并不会使用 dummy
      } else {
        v.preTokenAddress = bsv.Address.fromPublicKeyHash(
          Buffer.from(dataPartObj.tokenAddress, "hex"),
          this.network
        );
      }
    });
    ftUtxos.forEach((v) => {
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    return ftUtxos;
  }

  /**
   * 构造转移代币的交易
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param senderWif 发送者的私钥wif
   * @param receivers 接收数组，格式为[{address:'xxx',amount:'1000'}]
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async transfer({
    codehash,
    genesis,
    receivers,

    senderWif,
    senderPrivateKey,
    senderPublicKey,
    ftUtxos,
    ftChangeAddress,

    utxos,
    changeAddress,
    isMerge,
    opreturnData,
    noBroadcast = false,
  }: {
    codehash: string;
    genesis: string;
    receivers?: any[];

    senderWif?: string;
    senderPrivateKey?: any;
    senderPublicKey?: any;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: any;
    utxos?: ParamUtxo[];
    changeAddress?: any;
    isMerge?: boolean;
    opreturnData?: any;
    noBroadcast?: boolean;
  }): Promise<{
    tx: any;
    txHex: string;
    txid: string;
    routeCheckTx: any;
    routeCheckTxHex: string;
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);

    if (senderWif) {
      senderPrivateKey = new bsv.PrivateKey(senderWif);
    }

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    let ftUtxoInfo = await this._pretreatFtUtxos(
      ftUtxos,
      codehash,
      genesis,
      senderPrivateKey,
      senderPublicKey
    );
    if (ftChangeAddress) {
      ftChangeAddress = new bsv.Address(ftChangeAddress, this.network);
    } else {
      ftChangeAddress = ftUtxoInfo.ftUtxos[0].tokenAddress;
    }

    let { tx, routeCheckTx } = await this._transfer({
      codehash,
      genesis,
      receivers,
      ftUtxos: ftUtxoInfo.ftUtxos,
      ftPrivateKeys: ftUtxoInfo.ftUtxoPrivateKeys,
      ftChangeAddress,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      isMerge,
    });
    let routeCheckTxHex = routeCheckTx.serialize(true);
    let txHex = tx.serialize(true);

    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(routeCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }

    return { tx, txHex, routeCheckTx, routeCheckTxHex, txid: tx.id };
  }

  /**
   * 构造(未签名的)转移代币的交易
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param senderPublicKey 发送者的公钥
   * @param receivers 接收数组，格式为[{address:'xxx',amount:'1000'}]
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @returns
   */
  public async unsignPreTransfer({
    codehash,
    genesis,
    receivers,

    senderPublicKey,
    ftUtxos,
    ftChangeAddress,

    utxos,
    changeAddress,
    isMerge,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    receivers?: any[];

    senderPublicKey?: any;
    ftUtxos: any[];
    ftChangeAddress?: string;
    utxos: any[];
    changeAddress?: string;
    isMerge?: boolean;
    opreturnData?: any;
  }): Promise<{
    routeCheckTx: any;
    routeCheckSigHashList: SigHashInfo[];
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    let ftUtxoInfo = await this._pretreatFtUtxos(
      ftUtxos,
      codehash,
      genesis,
      null,
      senderPublicKey
    );
    if (ftChangeAddress) {
      ftChangeAddress = new bsv.Address(ftChangeAddress, this.network);
    } else {
      ftChangeAddress = ftUtxoInfo.ftUtxos[0].tokenAddress;
    }

    let { routeCheckTx } = await this._transfer({
      codehash,
      genesis,
      receivers,
      ftUtxos: ftUtxoInfo.ftUtxos,
      ftPrivateKeys: ftUtxoInfo.ftUtxoPrivateKeys,
      ftChangeAddress,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      isMerge,
    });

    let routeCheckSigHashList: SigHashInfo[] = [];
    routeCheckTx.inputs.forEach((input: any, inputIndex: number) => {
      let address = utxoInfo.utxos[inputIndex].address.toString();
      let isP2PKH = true;
      routeCheckSigHashList.push({
        sighash: toHex(
          bsv.Transaction.sighash.sighash(
            routeCheckTx,
            sighashType,
            inputIndex,
            input.output.script,
            input.output.satoshisBN
          )
        ),
        sighashType,
        address,
        inputIndex,
        isP2PKH,
      });
    });

    return {
      routeCheckTx,
      routeCheckSigHashList,
    };
  }

  private async _transfer({
    codehash,
    genesis,

    receivers,

    ftUtxos,
    ftPrivateKeys,
    ftChangeAddress,

    utxos,
    utxoPrivateKeys,
    changeAddress,

    isMerge,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;

    receivers?: any[];

    ftUtxos: FtUtxo[];
    ftPrivateKeys: any[];
    ftChangeAddress: any;

    utxos: Utxo[];
    utxoPrivateKeys: any[];
    changeAddress: any;

    isMerge?: boolean;
    opreturnData?: any;
  }) {
    //将routeCheck的找零utxo作为transfer的输入utxo
    let changeAddress0 = utxos[0].address;
    let utxoPrivateKey0 = utxoPrivateKeys[0];

    let mergeUtxos: FtUtxo[] = [];
    let mergeTokenAmountSum: bigint = BigInt(0);
    if (isMerge) {
      mergeUtxos = ftUtxos.slice(0, 20);
      mergeTokenAmountSum = mergeUtxos.reduce(
        (pre, cur) => pre + cur.tokenAmount,
        BigInt(0)
      );
      receivers = [
        {
          address: ftChangeAddress.toString(),
          amount: mergeTokenAmountSum,
        },
      ];
    }
    //格式化接收者
    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, this.network),
      tokenAmount: BigInt(v.amount),
    }));

    //计算输出的总金额
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      BigInt(0)
    );

    //token的选择策略
    let inputTokenAmountSum = BigInt(0);
    let _ftUtxos = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      _ftUtxos.push(ftUtxo);
      inputTokenAmountSum += ftUtxo.tokenAmount;
      if (i == 9 && inputTokenAmountSum >= outputTokenAmountSum) {
        //尽量支持到10To10
        break;
      }
      if (inputTokenAmountSum >= outputTokenAmountSum) {
        break;
      }
    }

    if (isMerge) {
      _ftUtxos = mergeUtxos;
      inputTokenAmountSum = mergeTokenAmountSum;
      if (mergeTokenAmountSum == BigInt(0)) {
        throw new Error("No utxos to merge.");
      }
    }

    ftUtxos = _ftUtxos;
    //完善ftUtxo的信息
    await this.supplyFtUtxosInfo(ftUtxos);

    if (inputTokenAmountSum < outputTokenAmountSum) {
      throw new Error(
        `Insufficent token. Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`
      );
    }
    //判断是否需要token找零
    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > BigInt(0)) {
      tokenOutputArray.push({
        address: ftChangeAddress,
        tokenAmount: changeTokenAmount,
      });
    }

    //选择xTox的转账方案
    let routeCheckType: RouteCheckType;
    let inputLength = ftUtxos.length;
    let outputLength = tokenOutputArray.length;
    let sizeOfRouteCheck = 0;
    if (inputLength <= 3) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from3To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To3;
      } else if (outputLength <= 100) {
        routeCheckType = RouteCheckType.from3To100;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To100;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = RouteCheckType.from6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = RouteCheckType.from10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from20To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_20To3;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else {
      throw new Error("Too many token-utxos, should merge them to continue.");
    }

    let estimateSatoshis = this._calTransferSize({
      p2pkhInputNum: utxos.length,
      inputTokenNum: inputLength,
      outputTokenNum: outputLength,
      tokenLockingSize: SIZE_OF_TOKEN,
      routeCheckLockingSize: sizeOfRouteCheck,
      opreturnData,
    });
    const balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance < estimateSatoshis) {
      throw new Error(
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    const defaultFtUtxo = ftUtxos[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;
    let dataPartObj = TokenProto.parseDataPart(tokenLockingScript.toBuffer());

    //create routeCheck contract
    let routeCheckContract = this.ft.createRouteCheckContract(
      routeCheckType,
      ftUtxos,
      tokenOutputArray,
      TokenProto.newTokenID(
        dataPartObj.tokenID.txid,
        dataPartObj.tokenID.index
      ),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    let routeCheckTx = this.ft.createRouteCheckTx({
      utxos,
      changeAddress,
      feeb: this.feeb,
      routeCheckContract,
      utxoPrivateKeys,
    });

    utxos = [
      {
        txId: routeCheckTx.id,
        satoshis:
          routeCheckTx.outputs[routeCheckTx.outputs.length - 1].satoshis,
        outputIndex: routeCheckTx.outputs.length - 1,
        address: changeAddress0,
      },
    ];
    utxoPrivateKeys = utxos.map((v) => utxoPrivateKey0).filter((v) => v);

    const signerSelecteds = [0, 1];

    let checkRabinMsgArray = Buffer.alloc(0);
    let checkRabinPaddingArray = Buffer.alloc(0);
    let checkRabinSigArray = Buffer.alloc(0);

    //先并发请求签名信息
    let sigReqArray = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let v = ftUtxos[i];
      sigReqArray[i] = [];
      for (let j = 0; j < 2; j++) {
        const signerIndex = signerSelecteds[j];
        sigReqArray[i][j] = this.signers[signerIndex].satoTxSigUTXOSpendByUTXO({
          txId: v.preTxId,
          index: v.preOutputIndex,
          txHex: v.preTxHex,
          byTxIndex: v.outputIndex,
          byTxId: v.txId,
          byTxHex: v.txHex,
        });
      }
    }

    //提供给routeCheck的签名信息
    for (let i = 0; i < sigReqArray.length; i++) {
      for (let j = 0; j < sigReqArray[i].length; j++) {
        let sigInfo = await sigReqArray[i][j];
        if (j == 0) {
          checkRabinMsgArray = Buffer.concat([
            checkRabinMsgArray,
            Buffer.from(sigInfo.byTxPayload, "hex"),
          ]);
        }

        const sigBuf = TokenUtil.toBufferLE(
          sigInfo.byTxSigBE,
          TokenUtil.RABIN_SIG_LEN
        );
        checkRabinSigArray = Buffer.concat([checkRabinSigArray, sigBuf]);
        const paddingCountBuf = Buffer.alloc(2, 0);
        paddingCountBuf.writeUInt16LE(sigInfo.byTxPadding.length / 2);
        const padding = Buffer.alloc(sigInfo.byTxPadding.length / 2, 0);
        padding.write(sigInfo.byTxPadding, "hex");
        checkRabinPaddingArray = Buffer.concat([
          checkRabinPaddingArray,
          paddingCountBuf,
          padding,
        ]);
      }
    }

    //提供给token的签名信息
    const tokenRabinDatas = [];
    for (let i = 0; i < sigReqArray.length; i++) {
      let tokenRabinMsg;
      let tokenRabinSigArray = [];
      let tokenRabinPaddingArray = [];
      for (let j = 0; j < sigReqArray[i].length; j++) {
        let sigInfo = await sigReqArray[i][j];
        tokenRabinMsg = sigInfo.payload;
        tokenRabinSigArray.push(BigInt("0x" + sigInfo.sigBE));
        tokenRabinPaddingArray.push(new Bytes(sigInfo.padding));
      }
      tokenRabinDatas.push({
        tokenRabinMsg,
        tokenRabinSigArray,
        tokenRabinPaddingArray,
      });
    }

    let rabinPubKeyIndexArray = signerSelecteds;

    let transferPart2 = {
      routeCheckTx,
      ftUtxos,
      utxos,
      rabinPubKeyIndexArray,
      checkRabinMsgArray,
      checkRabinPaddingArray,
      checkRabinSigArray,
      tokenOutputArray,
      tokenRabinDatas,
      routeCheckContract,
      ftPrivateKeys,
      changeAddress,
      utxoPrivateKeys,
      feeb: this.feeb,
      opreturnData,
      debug: this.debug,
      changeAddress0,
    };

    if (ftPrivateKeys.length == 0) {
      delete transferPart2.routeCheckTx;
      this.transferPart2 = transferPart2;
      return { routeCheckTx };
    }
    let tx = await this.ft.createTransferTx(transferPart2);

    const size = tx.toBuffer().length;
    const feePaid = tx._getUnspentValue();
    const feeRate = feePaid / size;
    if (feeRate < this.feeb) {
      throw new Error(
        `Insufficient balance.The fee rate should not be less than ${this.feeb}, but in the end it is ${feeRate}.`
      );
    }

    return { routeCheckTx, tx };
  }

  /**
   * 无签名转账交易的后续部分，需要前置交易先完成签名
   * @param transferPart2
   * @returns
   */
  public async unsignTransfer(routeCheckTx: any) {
    let transferPart2 = this.transferPart2;
    transferPart2.routeCheckTx = routeCheckTx;
    transferPart2.utxos.forEach((v) => {
      v.txId = routeCheckTx.id;
    });
    let tx = await this.ft.createTransferTx(transferPart2);

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = "";
      let isP2PKH;
      if (inputIndex == tx.inputs.length - 1) {
        //routeCheck不需要签名
        return;
      } else if (inputIndex == tx.inputs.length - 2) {
        address = transferPart2.changeAddress0.toString();
        isP2PKH = true;
      } else {
        address = transferPart2.ftUtxos[inputIndex].tokenAddress;
        isP2PKH = false;
      }
      sigHashList.push({
        sighash: toHex(
          bsv.Transaction.sighash.sighash(
            tx,
            sighashType,
            inputIndex,
            input.output.script,
            input.output.satoshisBN
          )
        ),
        sighashType,
        address,
        inputIndex,
        isP2PKH,
      });
    });
    return { tx, sigHashList };
  }

  /**
   * 构造合并代币的交易，最多合并20个utxo
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param senderWif 代币所有者的私钥wif
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async merge({
    codehash,
    genesis,
    ownerWif,
    utxos,
    changeAddress,
    noBroadcast = false,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    ownerWif: string;
    utxos?: any;
    changeAddress?: any;
    noBroadcast?: boolean;
    opreturnData?: any;
  }) {
    $.checkArgument(ownerWif, "ownerWif is required");
    return await this.transfer({
      codehash,
      genesis,
      senderWif: ownerWif,
      utxos,
      changeAddress,
      isMerge: true,
      noBroadcast,
      receivers: [],
      opreturnData,
    });
  }

  /**
   * 构造(未签名的)合并代币的第一部分交易，最多合并20个utxo
   * @param genesis 代币的genesis
   * @param codehash 代币的codehash
   * @param senderWif 代币所有者的私钥wif
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @returns
   */
  public async unsignPreMerge({
    codehash,
    genesis,
    ownerPublicKey,
    ftUtxos,
    ftChangeAddress,
    utxos,
    changeAddress,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    ownerPublicKey: string;
    ftUtxos?: any;
    ftChangeAddress?: any;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
  }) {
    return await this.unsignPreTransfer({
      codehash,
      genesis,
      senderPublicKey: ownerPublicKey,
      ftUtxos,
      ftChangeAddress,
      utxos,
      changeAddress,
      isMerge: true,
      receivers: [],
      opreturnData,
    });
  }

  /**
   * 构造(未签名的)合并代币的第二部分交易
   * @param routeCheckTx
   * @returns
   */
  public async unsignMerge(routeCheckTx) {
    return await this.unsignTransfer(routeCheckTx);
  }

  /**
   * 查询某人持有的FT余额
   * @param codehash
   * @param genesis
   * @param address
   * @returns
   */
  public async getBalance({ codehash, genesis, address }) {
    let {
      balance,
      pendingBalance,
    } = await this.sensibleApi.getFungibleTokenBalance(
      codehash,
      genesis,
      address
    );
    return balance + pendingBalance;
  }

  /**
   * 查询某人持有的FT余额，以及utxo的数量
   * @param codehash
   * @param genesis
   * @param address
   * @returns
   */
  public async getBalanceDetail({
    codehash,
    genesis,
    address,
  }: {
    codehash: string;
    genesis: string;
    address: string;
  }) {
    return await this.sensibleApi.getFungibleTokenBalance(
      codehash,
      genesis,
      address
    );
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   * @param address
   * @returns
   */
  public async getSummary(address: string) {
    return await this.sensibleApi.getFungibleTokenSummary(address);
  }

  /**
   * 估算genesis的费用
   * @param opreturnData
   * @returns
   */
  public async getGenesisEstimateFee({ opreturnData }) {
    let p2pkhInputNum = 1;
    let p2pkhOutputNum = 1;
    p2pkhInputNum = 10; //支持10输入的费用

    const sizeOfTokenGenesis = SizeHelper.getSizeOfTokenGenesis();
    let size =
      4 +
      1 +
      p2pkhInputNum * (32 + 4 + 1 + 107 + 4) +
      1 +
      (8 + 3 + sizeOfTokenGenesis) +
      (opreturnData ? 8 + 3 + opreturnData.toString().length / 2 : 0) +
      p2pkhOutputNum * (8 + 1 + 25) +
      4;

    let dust = Utils.getDustThreshold(sizeOfTokenGenesis);
    let fee = Math.ceil(size * this.feeb) + dust;
    return Math.ceil(fee);
  }

  /**
   * 估算issue费用
   * 在10个utxo输入的情况下所需要的最小费用
   * @param param0
   * @returns
   */
  public async getIssueEstimateFee({
    opreturnData,
    allowIncreaseIssues = true,
  }) {
    let p2pkhUnlockingSize = 32 + 4 + 1 + 107 + 4;
    let p2pkhLockingSize = 8 + 1 + 25;

    let p2pkhInputNum = 1; //至少1输入
    let p2pkhOutputNum = 1; //最多1找零
    p2pkhInputNum = 10; //支持10输入的费用

    const tokenGenesisLockingSize = SizeHelper.getSizeOfTokenGenesis();
    const tokenLockingSize = SIZE_OF_TOKEN;
    const preimageSize = 159 + tokenGenesisLockingSize;
    const sigSize = 72;
    const rabinMsgSize = 96;
    const rabinPaddingArraySize = 2 * 2;
    const rabinSigArraySize = 128 * 2;
    const rabinPubKeyIndexArraySize = 2;
    const genesisContractSatoshisSize = 8;
    const tokenContractSatoshisSize = 8;
    const changeAddressSize = 20;
    const changeAmountSize = 8;
    const opreturnSize = opreturnData
      ? 8 + 3 + new bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      : 0;
    let tokenGenesisUnlockingSize =
      preimageSize +
      sigSize +
      rabinMsgSize +
      rabinPaddingArraySize +
      rabinSigArraySize +
      rabinPubKeyIndexArraySize +
      genesisContractSatoshisSize +
      tokenLockingSize +
      tokenContractSatoshisSize +
      changeAddressSize +
      changeAmountSize +
      opreturnSize;

    let sumSize =
      p2pkhInputNum * p2pkhUnlockingSize + tokenGenesisUnlockingSize;
    if (allowIncreaseIssues) {
      sumSize += tokenGenesisLockingSize;
    }
    sumSize += tokenLockingSize;
    sumSize += p2pkhLockingSize;

    let fee = 0;
    fee = sumSize * this.feeb;
    if (allowIncreaseIssues) {
      fee += Utils.getDustThreshold(tokenGenesisLockingSize);
    }
    fee += Utils.getDustThreshold(tokenLockingSize);
    fee -= Utils.getDustThreshold(tokenGenesisLockingSize);

    return Math.ceil(fee);
  }

  /**
   * 提前计算费用
   * @param genesis
   * @param codehash
   * @param senderWif
   * @param receivers
   * @param opreturnData
   * @returns
   */
  public async getTransferEstimateFee({
    codehash,
    genesis,
    senderWif,
    receivers,
    opreturnData,
    isMerge,
  }: {
    codehash: string;
    genesis: string;
    senderWif: string;
    receivers: any;
    opreturnData?: any;
    isMerge?: boolean;
  }) {
    let p2pkhInputNum = 1; //至少1输入
    p2pkhInputNum = 10; //支持10输入的费用

    const senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
    const senderPublicKey = senderPrivateKey.toPublicKey();

    let senderAddress = senderPublicKey.toAddress(this.network);

    //获取token的utxo
    let ftUtxos = await this.sensibleApi.getFungibleTokenUnspents(
      codehash,
      genesis,
      senderAddress.toString(),
      20
    );
    ftUtxos.forEach((v) => (v.tokenAmount = BigInt(v.tokenAmount)));

    let mergeUtxos = [];
    let mergeTokenAmountSum = BigInt(0);
    if (isMerge) {
      mergeUtxos = ftUtxos.slice(0, 20);
      mergeTokenAmountSum = mergeUtxos.reduce(
        (pre, cur) => pre + BigInt(cur.tokenAmount),
        BigInt(0)
      );
      receivers = [
        {
          address: senderAddress.toString(),
          amount: mergeTokenAmountSum,
        },
      ];
    }
    //格式化接收者
    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, this.network),
      tokenAmount: BigInt(v.amount),
    }));

    //计算输出的总金额
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      BigInt(0)
    );

    //token的选择策略
    let inputTokenAmountSum = BigInt(0);
    let _ftUtxos = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      _ftUtxos.push(ftUtxo);
      inputTokenAmountSum += ftUtxo.tokenAmount;
      if (i == 9 && inputTokenAmountSum >= outputTokenAmountSum) {
        //尽量支持到10To10
        break;
      }
      if (inputTokenAmountSum >= outputTokenAmountSum) {
        break;
      }
    }

    if (isMerge) {
      _ftUtxos = mergeUtxos;
      inputTokenAmountSum = mergeTokenAmountSum;
    }

    ftUtxos = _ftUtxos;

    if (inputTokenAmountSum < outputTokenAmountSum) {
      throw new Error(
        `insufficent token.Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`
      );
    }
    //判断是否需要token找零
    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > BigInt(0)) {
      tokenOutputArray.push({
        address: senderPublicKey.toAddress(this.network),
        tokenAmount: changeTokenAmount,
      });
    }

    //选择xTox的转账方案
    let routeCheckType: RouteCheckType;
    let inputLength = ftUtxos.length;
    let outputLength = tokenOutputArray.length;
    let sizeOfRouteCheck = 0;
    if (inputLength <= 3) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from3To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To3;
      } else if (outputLength <= 100) {
        routeCheckType = RouteCheckType.from3To100;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To100;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = RouteCheckType.from6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = RouteCheckType.from10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from20To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_20To3;
      } else {
        throw new Error(
          `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`
        );
      }
    } else {
      throw new Error("Too many token-utxos, should merge them to continue.");
    }

    let estimateSatoshis = this._calTransferSize({
      inputTokenNum: inputLength,
      outputTokenNum: outputLength,
      tokenLockingSize: SIZE_OF_TOKEN,
      routeCheckLockingSize: sizeOfRouteCheck,
      opreturnData,
    });

    return estimateSatoshis;
  }

  public async getMergeEstimateFee({
    codehash,
    genesis,
    ownerWif,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    ownerWif: string;
    opreturnData?: any;
  }) {
    $.checkArgument(ownerWif, "ownerWif is required");
    return await this.getTransferEstimateFee({
      codehash,
      genesis,
      senderWif: ownerWif,
      opreturnData,
      receivers: [],
      isMerge: true,
    });
  }
  /**
   * 更新交易的解锁脚本
   * @param tx
   * @param sigHashList
   * @param sigList
   */
  public sign(tx: any, sigHashList: SigHashInfo[], sigList: SigInfo[]) {
    Utils.sign(tx, sigHashList, sigList);
  }

  /**
   * 广播一笔交易
   * @param txHex
   * @param apiTarget 广播节点，可选sensible、metasv，默认sensible
   */
  public async broadcast(txHex: string, apiTarget?: string) {
    return await this.sensibleApi.broadcast(txHex, apiTarget);
  }

  /**
   * 计算代币的codehash和genesis
   * @param genesisTxId genesis的txid
   * @param genesisOutputIndex (可选)genesis的outputIndex，默认为0
   * @returns
   */
  public async getCodehashAndGensis(
    genesisTxId: string,
    genesisOutputIndex: number = 0
  ) {
    let genesisTxHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let genesisTx = new bsv.Transaction(genesisTxHex);
    let genesis = getGenesis(genesisTxId, genesisOutputIndex);
    let tokenContract = this.ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisTx.outputs[genesisOutputIndex].script,
      {
        receiverAddress: this.zeroAddress, //dummy address
        tokenAmount: BigInt(0),
      }
    );
    let codehash = Utils.getCodeHash(tokenContract.lockingScript);

    return { codehash, genesis };
  }

  /**
   * 计算代币的codehash和genesis
   * @param genesisTx genesis的tx
   * @param genesisOutputIndex (可选)genesis的outputIndex，默认为0
   * @returns
   */
  public getCodehashAndGensisByTx(
    genesisTx: any,
    genesisOutputIndex: number = 0
  ) {
    let genesisTxId = genesisTx.id;
    let genesis = getGenesis(genesisTxId, genesisOutputIndex);
    let tokenContract = this.ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisTx.outputs[genesisOutputIndex].script,
      {
        receiverAddress: this.zeroAddress, //dummy address
        tokenAmount: BigInt(0),
      }
    );
    let codehash = Utils.getCodeHash(tokenContract.lockingScript);

    return { codehash, genesis };
  }

  private _calTransferSize({
    p2pkhInputNum = 10,
    inputTokenNum,
    outputTokenNum,
    tokenLockingSize,
    routeCheckLockingSize,
    opreturnData,
  }) {
    let sumFee = 0;

    let tokenUnlockingSizeSum = 0;
    for (let i = 0; i < inputTokenNum; i++) {
      let preimageSize = 159 + tokenLockingSize;
      let tokenInputIndexSize = 1;
      let prevoutsSize = (inputTokenNum + 1 + 1) * 36;
      let tokenRabinMsgSize = 96;
      let tokenRabinPaddingArraySize = 2 * 2;
      let tokenRabinSigArraySize = 128 * 2;
      let rabinPubKeyIndexArraySize = 2;
      let routeCheckInputIndexSize = 1;
      let tokenOutputLenSize = 1;
      let tokenAddressSize = 20;
      let preTokenAmountSize = 8;
      let senderPublicKeySize = 33;
      let sigSize = 72;
      let tokenUnlockingSize =
        preimageSize +
        tokenInputIndexSize +
        prevoutsSize +
        tokenRabinMsgSize +
        tokenRabinPaddingArraySize +
        tokenRabinSigArraySize +
        rabinPubKeyIndexArraySize +
        routeCheckInputIndexSize +
        routeCheckLockingSize +
        1 +
        tokenOutputLenSize +
        tokenAddressSize +
        preTokenAmountSize +
        senderPublicKeySize +
        sigSize +
        1 +
        1 +
        1 +
        1;
      tokenUnlockingSizeSum += tokenUnlockingSize;
    }

    let preimageSize = 159 + routeCheckLockingSize;
    let prevoutsSize = (inputTokenNum + 1 + 1) * 36;
    let checkRabinMsgArraySize = 64 * inputTokenNum;
    let checkRabinPaddingArraySize = 8 * inputTokenNum;
    let checkRabinSigArraySize = 256 * inputTokenNum;
    let rabinPubKeyIndexArraySize = 2;
    let inputTokenAddressArraySize = 20 * inputTokenNum;
    let inputTokenAmountArray = 8 * inputTokenNum;
    let outputSatoshiArraySize = 8 * outputTokenNum;
    let changeAmountSize = 8;
    let changeAddressSize = 20;
    let opreturnSize = opreturnData
      ? 8 + 3 + new bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      : 0;
    let routeCheckUnlockingSize =
      preimageSize +
      tokenLockingSize +
      prevoutsSize +
      checkRabinMsgArraySize +
      checkRabinPaddingArraySize +
      checkRabinSigArraySize +
      rabinPubKeyIndexArraySize +
      inputTokenAddressArraySize +
      inputTokenAmountArray +
      outputSatoshiArraySize +
      changeAmountSize +
      changeAddressSize +
      opreturnSize;

    let p2pkhUnlockingSize = 32 + 4 + 1 + 107 + 4;
    let p2pkhLockingSize = 8 + 1 + 25;

    //routeCheck tx
    sumFee +=
      (p2pkhUnlockingSize * p2pkhInputNum +
        routeCheckLockingSize +
        p2pkhLockingSize) *
        this.feeb +
      Utils.getDustThreshold(routeCheckLockingSize);

    //transfer tx
    sumFee +=
      (p2pkhUnlockingSize +
        tokenUnlockingSizeSum +
        routeCheckUnlockingSize +
        tokenLockingSize * outputTokenNum +
        p2pkhLockingSize) *
        this.feeb +
      Utils.getDustThreshold(tokenLockingSize) * outputTokenNum -
      Utils.getDustThreshold(tokenLockingSize) * inputTokenNum -
      Utils.getDustThreshold(routeCheckLockingSize);

    return Math.ceil(sumFee);
  }

  /**
   * 打印交易
   * @param tx
   */
  public dumpTx(tx) {
    Utils.dumpTx(tx, this.network);
  }

  public async getFtUtxos(
    codehash: string,
    genesis: string,
    address: string,
    count: number = 20
  ): Promise<FungibleTokenUnspent[]> {
    return await this.sensibleApi.getFungibleTokenUnspents(
      codehash,
      genesis,
      address,
      count
    );
  }
}

module.exports = { SensibleFT };
