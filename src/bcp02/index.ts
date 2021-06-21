import { Bytes, toHex } from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as Utils from "../common/utils";
import { SigHashInfo, SigInfo } from "../common/utils";
import {
  API_NET,
  API_TARGET,
  FungibleTokenUnspent,
  SensibleApi,
} from "../sensible-api";
import {
  FtUtxo,
  FungibleToken,
  RouteCheckType,
  sighashType,
  SIGNER_NUM,
  SIGNER_VERIFY_NUM,
  Utxo,
} from "./FungibleToken";
import * as SizeHelper from "./SizeHelper";
import * as TokenProto from "./tokenProto";
import * as TokenUtil from "./tokenUtil";
const $ = bsv.util.preconditions;
const _ = bsv.deps._;
const defaultSignerConfigs: SignerConfig[] = [
  {
    satotxApiPrefix: "https://s1.satoplay.cn,https://s1.satoplay.com",
    satotxPubKey:
      "2b789ca49cbad4acaac0ccee962786b88373a698da3f39c69dba026b780b3b578877ed3087954433d23adcdc49fe7d72fc1f2d60a0d9b93e9e9bcf8407c69a1a3b2e894507e4229bfdffac78b21502deff8cfe6f3332b78f86622a820caf4c492f755e2a063ef00c959932dedc506d639a1af43eaf758eec6b0aa2ff5d0037ad",
  },
  {
    satotxApiPrefix: "https://satotx.showpay.top",
    satotxPubKey:
      "64a73b64fd179c72d8998e13174e2aee4c70633c7e262615893a28367343d223be653fefe07966a7b195f7883c6a88d77ad0ef5e58246b28fc6aceb8b59ef462a2bf3f3a1c6b989aa5eea41ff6ac75f57cd84292386a81c56d786091fdb749942dac6f45fb4df1b4344d8362407a8483d0ac292f7a02355303703719b481614d",
  },
  {
    satotxApiPrefix: "https://satotx.volt.id",
    satotxPubKey:
      "5eee861ac7392dc220586518adb1f55e14ed94ebf368a4a8ed55509973dcdcb3ee4bc7b84d043afe2051bb55226d0ee12c3fd188e8893044da9bddaf7a9d5b758a14ff9d5769a0a0a2b486b62897cd69c2ce0fd39e41b4b0a6868ae5515fd599b4261d7c27325798abe6aafd6fe3dbe713283d5c34076cee59fbbe275296b9c5",
  },
  {
    satotxApiPrefix: "https://satotx.metasv.com",
    satotxPubKey:
      "1dd80bcddff782ee7564daf46d780532814352b6211a65ccdcd46aae5edc7192ab468e02f746ab07aff84848ca12a7f0f90d2fff52768ce881a07317dbd754ebed528e4b9d9f96716414603bf99c9e73671881ff44ad175efb319a1505ecff5c138ae6b717dd9897f7841bfea95d33558451ac673c811350db8e01545d44197d",
  },
  {
    satotxApiPrefix: "https://satotx.tswap.io",
    satotxPubKey:
      "3ea19ecf866c53058cf6568e15111f727f965d4f4fb922576beffb07d875f2ead79b0c809b57b8d2ff469072bf16974ec4dec4732a631127a4f5a58d5c27ba9f1575eadf62d33e8005a6f3956bb6b9615e9c19f2a06fabb8955361723de70945defe86ec2fc70f60c5f7b3b039a26b85daf130199e9e065328b04ef256f0ab35",
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
  outputIndex: number;
  tokenAddress: string;
  tokenAmount: any;
  wif?: string;
};

type Purse = {
  privateKey: bsv.PrivateKey;
  address: bsv.Address;
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
  if (signers.length != 5) {
    throw new Error("only support 5 signers");
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
  public sensibleApi: SensibleApi;
  private zeroAddress: bsv.Address;
  private ft: FungibleToken;
  private debug: boolean;
  private transferPart2?: any;
  private signerSelecteds: number[] = [];
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
    signerSelecteds,
    feeb = 0.5,
    network = API_NET.MAIN,
    mock = false,
    purse,
    debug = false,
    apiTarget = API_TARGET.SENSIBLE,
  }: {
    signers: SignerConfig[];
    signerSelecteds?: number[];
    feeb?: number;
    network?: API_NET;
    mock?: boolean;
    purse?: string;
    debug?: boolean;
    apiTarget?: API_TARGET;
  }) {
    checkParamSigners(signers);
    checkParamNetwork(network);
    this.signers = signers.map(
      (v) => new SatotxSigner(v.satotxApiPrefix, v.satotxPubKey)
    );
    this.feeb = feeb;
    this.network = network;
    this.mock = mock;
    this.sensibleApi = new SensibleApi(network, apiTarget);
    this.debug = debug;

    if (network == API_NET.MAIN) {
      this.zeroAddress = new bsv.Address("1111111111111111111114oLvT2");
    } else {
      this.zeroAddress = new bsv.Address("mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8");
    }

    this.ft = new FungibleToken(
      BN.fromString(signers[0].satotxPubKey, 16),
      BN.fromString(signers[1].satotxPubKey, 16),
      BN.fromString(signers[2].satotxPubKey, 16),
      BN.fromString(signers[3].satotxPubKey, 16),
      BN.fromString(signers[4].satotxPubKey, 16)
    );

    if (purse) {
      const privateKey = bsv.PrivateKey.fromWIF(purse);
      const address = privateKey.toAddress(this.network);
      this.purse = {
        privateKey,
        address,
      };
    }

    if (signerSelecteds) {
      if (signerSelecteds.length < SIGNER_VERIFY_NUM) {
        throw new Error(
          `the length of signerSeleteds should not less than ${SIGNER_VERIFY_NUM}`
        );
      }
      this.signerSelecteds = signerSelecteds;
    } else {
      for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
        this.signerSelecteds.push(i);
      }
    }
    this.signerSelecteds.sort((a, b) => a - b);
  }

  public static async selectSigners(
    signerConfigs: SignerConfig[] = defaultSignerConfigs
  ) {
    let _signerConfigs = signerConfigs.map((v) => Object.assign({}, v));
    if (_signerConfigs.length < SIGNER_NUM) {
      throw new Error(`The length of signerArray should be ${SIGNER_NUM}`);
    }
    let results = [];
    const SIGNER_TIMEOUT = 99999;
    for (let i = 0; i < _signerConfigs.length; i++) {
      let signerConfig = _signerConfigs[i];
      let subArray = signerConfig.satotxApiPrefix.split(",");
      let ret = await new Promise(
        (
          resolve: ({
            url,
            pubKey,
            duration,
            idx,
          }: {
            url: string;
            pubKey: string;
            duration: number;
            idx: number;
          }) => void,
          reject
        ) => {
          let hasResolve = false;
          let failedCnt = 0;
          for (let j = 0; j < subArray.length; j++) {
            let url = subArray[j];
            let signer = new SatotxSigner(url);
            let d1 = Date.now();
            signer
              .getInfo()
              .then(({ pubKey }) => {
                let duration = Date.now() - d1;
                if (!hasResolve) {
                  hasResolve = true;
                  resolve({ url, pubKey, duration, idx: i });
                }
              })
              .catch((e) => {
                failedCnt++;
                if (failedCnt == subArray.length) {
                  resolve({
                    url,
                    pubKey: null,
                    duration: SIGNER_TIMEOUT,
                    idx: i,
                  });
                  // reject(`failed to get info by ${url}`);
                }
                //ignore
              });
          }
        }
      );
      signerConfig.satotxApiPrefix = ret.url;
      results.push(ret);
    }
    let signerSelecteds: number[] = results
      .filter((v) => v.duration < SIGNER_TIMEOUT)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, SIGNER_VERIFY_NUM)
      .map((v) => v.idx);
    if (signerSelecteds.length < SIGNER_VERIFY_NUM) {
      throw `Less than 3 successful signer requests`;
    }
    return {
      signers: _signerConfigs,
      signerSelecteds,
    };
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
    senderPrivateKey?: bsv.PrivateKey,
    senderPublicKey?: bsv.PublicKey
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
        tokenAddress: new bsv.Address(v.tokenAddress, this.network),
        tokenAmount: new BN(v.tokenAmount),
        publicKey: publicKeys[index],
      });
    });

    if (ftUtxos.length == 0) throw new Error("Insufficient token.");
    return { ftUtxos, ftUtxoPrivateKeys };
  }

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
    changeAddress?: string | bsv.Address;
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
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
    genesisPublicKey: string | bsv.PublicKey;
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
          bsv.Transaction.Sighash.sighash(
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
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
    genesisPublicKey: string | bsv.PublicKey;
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
          tokenAmount: BN.Zero,
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
    receiverAddress: string | bsv.Address;
    tokenAmount: string | BN;
    allowIncreaseIssues: boolean;
    utxos?: any;
    changeAddress?: string | bsv.Address;
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
    tokenAmount = new BN(tokenAmount);
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
    genesisPublicKey: string | bsv.PublicKey;
    receiverAddress: string | bsv.Address;
    tokenAmount: string | BN;
    allowIncreaseIssues?: boolean;
    utxos?: any;
    changeAddress?: string | bsv.Address;
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
    let _genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = new BN(tokenAmount);
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
      genesisPublicKey: _genesisPublicKey,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = "";
      let isP2PKH;
      if (inputIndex == 0) {
        address = _genesisPublicKey.toAddress(this.network).toString();
        isP2PKH = false;
      } else {
        address = utxoInfo.utxos[inputIndex - 1].address.toString();
        isP2PKH = true;
      }
      sigHashList.push({
        sighash: toHex(
          bsv.Transaction.Sighash.sighash(
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
    tokenAmount: BN;
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
      signerSelecteds: this.signerSelecteds,
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
  private async supplyFtUtxosInfo(ftUtxos: FtUtxo[], codehash: string) {
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
    let curDataPartObj: TokenProto.TokenDataPart;
    let curGenesisHash: Buffer;
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      const tx = new bsv.Transaction(ftUtxo.txHex);
      if (!curDataPartObj) {
        let tokenScript = tx.outputs[ftUtxo.outputIndex].script;
        curDataPartObj = TokenProto.parseDataPart(tokenScript.toBuffer());
        curGenesisHash = TokenUtil.getGenesisHashFromLockingScript(tokenScript);
      }
      let input = tx.inputs.find((input) => {
        let script = new bsv.Script(input.script);
        if (script.chunks.length > 0) {
          const lockingScriptBuf = TokenUtil.getLockingScriptFromPreimage(
            script.chunks[0].buf
          );
          if (lockingScriptBuf) {
            let lockingScript = new bsv.Script(lockingScriptBuf);
            let _codehash = Utils.getCodeHash(lockingScript);

            let dataPartObj = TokenProto.parseDataPart(
              lockingScript.toBuffer()
            );
            dataPartObj.tokenID = {
              txid: curDataPartObj.tokenID.txid,
              index: curDataPartObj.tokenID.index,
            };
            const newScriptBuf = TokenProto.updateScript(
              lockingScript.toBuffer(),
              dataPartObj
            );
            let _genesisHash = bsv.crypto.Hash.sha256ripemd160(newScriptBuf); //to avoid generate the same genesisHash,

            if (_codehash == codehash) {
              return true;
            } else if (toHex(_genesisHash) == toHex(curGenesisHash)) {
              return true;
            }
          }
        }
      });
      if (!input) throw new Error("invalid ftUtxo");
      let preTxId = input.prevTxId.toString("hex"); //第一个输入必定能够作为前序输入
      let preOutputIndex = input.outputIndex;
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
      v.preTokenAmount = new BN(v.preTokenAmount);
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

    middleChangeAddress,
    middlePrivateKey,

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

    middleChangeAddress?: any;
    middlePrivateKey?: any;

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

    if (middleChangeAddress) {
      middleChangeAddress = new bsv.Address(middleChangeAddress, this.network);
      middlePrivateKey = new bsv.PrivateKey(middlePrivateKey);
    } else {
      middleChangeAddress = utxoInfo.utxos[0].address;
      middlePrivateKey = utxoInfo.utxoPrivateKeys[0];
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
      middleChangeAddress,
      middlePrivateKey,
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
    middleChangeAddress,
  }: {
    codehash: string;
    genesis: string;
    receivers?: any[];

    senderPublicKey?: any;
    ftUtxos: any[];
    ftChangeAddress?: string | bsv.Address;
    utxos: any[];
    changeAddress?: string | bsv.Address;
    isMerge?: boolean;
    opreturnData?: any;
    middleChangeAddress?: any;
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

    if (middleChangeAddress) {
      middleChangeAddress = new bsv.Address(middleChangeAddress, this.network);
    } else {
      middleChangeAddress = utxoInfo.utxos[0].address;
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
      middleChangeAddress,
      opreturnData,
      isMerge,
    });

    let routeCheckSigHashList: SigHashInfo[] = [];
    routeCheckTx.inputs.forEach((input: any, inputIndex: number) => {
      let address = utxoInfo.utxos[inputIndex].address.toString();
      let isP2PKH = true;
      routeCheckSigHashList.push({
        sighash: toHex(
          bsv.Transaction.Sighash.sighash(
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

    middlePrivateKey,
    middleChangeAddress,

    isMerge,
    opreturnData,
    isEstimateSatoshis,
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

    middlePrivateKey?: any;
    middleChangeAddress: any;

    isMerge?: boolean;
    opreturnData?: any;
    isEstimateSatoshis?: boolean;
  }) {
    if (utxos.length > 3) {
      throw new Error(
        "The count of utxos should not be more than 3 in transfer,please merge them first"
      );
    }

    //将routeCheck的找零utxo作为transfer的输入utxo
    if (!middleChangeAddress) {
      middleChangeAddress = utxos[0].address;
      middlePrivateKey = utxoPrivateKeys[0];
    }

    let mergeUtxos: FtUtxo[] = [];
    let mergeTokenAmountSum: BN = BN.Zero;
    if (isMerge) {
      mergeUtxos = ftUtxos.slice(0, 20);
      mergeTokenAmountSum = mergeUtxos.reduce(
        (pre, cur) => cur.tokenAmount.add(pre),
        BN.Zero
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
      tokenAmount: new BN(v.amount),
    }));

    //计算输出的总金额
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => cur.tokenAmount.add(pre),
      BN.Zero
    );

    //token的选择策略
    let inputTokenAmountSum = BN.Zero;
    let _ftUtxos = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      _ftUtxos.push(ftUtxo);
      inputTokenAmountSum = ftUtxo.tokenAmount.add(inputTokenAmountSum);
      if (i == 9 && inputTokenAmountSum.gte(outputTokenAmountSum)) {
        //尽量支持到10To10
        break;
      }
      if (inputTokenAmountSum.gte(outputTokenAmountSum)) {
        break;
      }
    }

    if (isMerge) {
      _ftUtxos = mergeUtxos;
      inputTokenAmountSum = mergeTokenAmountSum;
      if (mergeTokenAmountSum.eq(BN.Zero)) {
        throw new Error("No utxos to merge.");
      }
    }

    ftUtxos = _ftUtxos;
    //完善ftUtxo的信息
    await this.supplyFtUtxosInfo(ftUtxos, codehash);

    if (inputTokenAmountSum.lt(outputTokenAmountSum)) {
      throw new Error(
        `Insufficent token. Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`
      );
    }
    //判断是否需要token找零
    let changeTokenAmount = inputTokenAmountSum.sub(outputTokenAmountSum);
    if (changeTokenAmount.gt(BN.Zero)) {
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

    if (isEstimateSatoshis) {
      return { estimateSatoshis };
    }

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
      changeAddress: middleChangeAddress,
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
        address: middleChangeAddress,
      },
    ];
    utxoPrivateKeys = utxos.map((v) => middlePrivateKey).filter((v) => v);

    let checkRabinMsgArray = Buffer.alloc(0);
    let checkRabinPaddingArray = Buffer.alloc(0);
    let checkRabinSigArray = Buffer.alloc(0);

    //先并发请求签名信息
    let sigReqArray = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let v = ftUtxos[i];
      sigReqArray[i] = [];
      for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
        const signerIndex = this.signerSelecteds[j];
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
      let tokenRabinMsg: string;
      let tokenRabinSigArray: string[] = [];
      let tokenRabinPaddingArray: Bytes[] = [];
      for (let j = 0; j < sigReqArray[i].length; j++) {
        let sigInfo = await sigReqArray[i][j];
        tokenRabinMsg = sigInfo.payload;
        tokenRabinSigArray.push("0x" + sigInfo.sigBE);
        tokenRabinPaddingArray.push(new Bytes(sigInfo.padding));
      }
      tokenRabinDatas.push({
        tokenRabinMsg,
        tokenRabinSigArray,
        tokenRabinPaddingArray,
      });
    }

    let rabinPubKeyIndexArray = this.signerSelecteds;

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
      middleChangeAddress,
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
        address = transferPart2.middleChangeAddress.toString();
        isP2PKH = true;
      } else {
        address = transferPart2.ftUtxos[inputIndex].tokenAddress.toString();
        isP2PKH = false;
      }
      sigHashList.push({
        sighash: toHex(
          bsv.Transaction.Sighash.sighash(
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
      ? 8 + 3 + bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
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
    receivers,

    senderWif,
    senderPrivateKey,
    senderPublicKey,
    ftUtxos,
    ftChangeAddress,
    isMerge,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    receivers?: any[];

    senderWif: string;
    senderPrivateKey?: any;
    senderPublicKey?: any;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: any;
    isMerge?: boolean;
    opreturnData?: any;
  }) {
    let p2pkhInputNum = 1; //至少1输入
    p2pkhInputNum = 3; //支持10输入的费用

    if (senderWif) {
      senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
      senderPublicKey = senderPrivateKey.toPublicKey();
    }

    let utxos: Utxo[] = [];
    for (let i = 0; i < p2pkhInputNum; i++) {
      utxos.push({
        txId:
          "85f583e7a8e8b9cf86e265c2594c1e4eb45db389f6781c3b1ec9aa8e48976caa", //dummy
        outputIndex: i,
        satoshis: 1000,
        address: this.zeroAddress,
      });
    }
    let utxoPrivateKeys = [];
    let changeAddress = utxos[0].address;

    //获取token的utxo
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

    let middleChangeAddress = changeAddress;

    let { estimateSatoshis } = await this._transfer({
      codehash,
      genesis,
      receivers,
      ftUtxos: ftUtxoInfo.ftUtxos,
      ftPrivateKeys: ftUtxoInfo.ftUtxoPrivateKeys,
      ftChangeAddress,
      utxos: utxos,
      utxoPrivateKeys: utxoPrivateKeys,
      changeAddress,
      opreturnData,
      isMerge,
      isEstimateSatoshis: true,
      middleChangeAddress,
    });
    return estimateSatoshis;
  }

  public async getMergeEstimateFee({
    codehash,
    genesis,
    ownerWif,
    ownerPublicKey,
    ftUtxos,
    ftChangeAddress,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    ownerWif?: string;
    ownerPublicKey?: any;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: any;
    opreturnData?: any;
  }) {
    return await this.getTransferEstimateFee({
      codehash,
      genesis,
      senderWif: ownerWif,
      senderPublicKey: ownerPublicKey,
      ftUtxos,
      ftChangeAddress,
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
  public async broadcast(txHex: string) {
    return await this.sensibleApi.broadcast(txHex);
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
        tokenAmount: BN.Zero,
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
        tokenAmount: BN.Zero,
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
      ? 8 + 3 + bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
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
