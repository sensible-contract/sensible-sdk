import { bsv, Bytes, toHex } from "scryptlib";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as Utils from "../common/utils";
import { SigHashInfo, SigInfo } from "../common/utils";
import { API_NET, SensibleApi } from "../sensible-api";
import { FungibleToken, RouteCheckType, sighashType } from "./FungibleToken";
import * as SizeHelper from "./SizeHelper";
import * as TokenProto from "./tokenProto";
import * as TokenUtil from "./tokenUtil";
const $ = bsv.util.preconditions;
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
const SIZE_OF_TOKEN = 7572;
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

function checkParamUtxoFormat(utxo) {
  if (utxo) {
    if (!utxo.txId || !utxo.satoshis || !utxo.wif) {
      throw `UtxoFormatError-valid format example :{
				txId:'85f583e7a8e8b9cf86e265c2594c1e4eb45db389f6781c3b1ec9aa8e48976caa',
				satoshis:1000,
				outputIndex:1,
				wif:'L3J1A6Xyp7FSg9Vtj3iBKETyVpr6NibxUuLhw3uKpUWoZBLkK1hk'
			}`;
    }
  }
}

function checkParamSigners(signers) {
  if (signers.length != 3) {
    throw "only support 3 signers";
  }
  let signer = signers[0];
  if (
    Utils.isNull(signer.satotxApiPrefix) ||
    Utils.isNull(signer.satotxPubKey)
  ) {
    throw `SignerFormatError-valid format example :
    signers:[{
			satotxApiPrefix: "https://api.satotx.com",
    	satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
		},...]`;
  }
}

function checkParamNetwork(network) {
  if (!["mainnet", "testnet"].includes(network)) {
    throw `NetworkFormatError:only support 'mainnet' and 'testnet'`;
  }
}

function checkParamGenesis(genesis) {
  if (typeof genesis != "string" || genesis.length != 72) {
    throw `GenesisFormatError:genesis should be a string with 72 length `;
  }
}

function checkParamCodehash(codehash) {
  if (typeof codehash != "string" || codehash.length != 40) {
    throw `CodehashFormatError:codehash should be a string with 40 length `;
  }
}

function checkParamTokenName(tokenName) {
  let bufLength = Buffer.from(tokenName).length;
  if (bufLength > 20) {
    throw `TokenNameFormatError:Buffer.from(tokenName).length should be <= 20, but now is ${bufLength} `;
  }
}

function checkParamTokenSymbol(tokenSymbol) {
  let bufLength = Buffer.from(tokenSymbol).length;
  if (bufLength > 10) {
    throw `TokenSymbolFormatError:Buffer.from(tokenSymbol).length should be <= 10, but now is ${bufLength} `;
  }
}

function checkParamDecimalNum(decimalNum) {}

function checkParamReceivers(receivers) {
  const ErrorName = "ReceiversFormatError";
  if (Utils.isNull(receivers)) {
    throw `${ErrorName}: param should not be null`;
  }
  if (receivers.length > 0) {
    let receiver = receivers[0];
    if (Utils.isNull(receiver.address) || Utils.isNull(receiver.amount)) {
      throw `${ErrorName}-valid format example
      [
        {
          address: "mtjjuRuA84b2qVyo28AyJQ8AoUmpbWEqs3",
          amount: "1000",
        },
      ]
      `;
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
  signers: SatotxSigner[];
  feeb: number;
  network: API_NET;
  mock: boolean;
  purse: string;
  sensibleApi: SensibleApi;
  zeroAddress: string;
  ft: FungibleToken;
  debug: boolean;
  transferPart2?: any;
  /**
   *
   * @param param0.signers - 签名器
   * @param param0.feeb (可选)交易费率，默认0.5
   * @param param0.network (可选)当前网络，mainnet/testnet，默认mainnet
   * @param param0.purse (可选)提供手续费的私钥wif，不提供则需要在genesis/issue/transfer手动传utxos
   * @param param0.mock (可选)开启后genesis/issue/transfer时不进行广播，默认关闭
   * @param param0.debug (可选)开启后将会在解锁合约时进行verify，默认关闭
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
    this.purse = purse;
    this.debug = debug;

    if (network == "mainnet") {
      this.zeroAddress = "1111111111111111111114oLvT2";
    } else {
      this.zeroAddress = "mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8";
    }

    this.ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );
  }

  private async pretreatUtxos(utxos: ParamUtxo[]) {
    let utxoPrivateKeys = [];
    if (utxos) {
      utxos.forEach((v) => {
        if (v.wif) {
          let privateKey = bsv.PrivateKey.fromWIF(v.wif);
          v.address = privateKey.toAddress(this.network);
          utxoPrivateKeys.push(privateKey);
        }
      });
    } else {
      const utxoPrivateKey = bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = utxoAddress;
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey).filter((v) => v);
    }
    if (utxos.length == 0) throw "Insufficient balance.";
    return { utxos, utxoPrivateKeys };
  }

  /**
   * 构造一笔的genesis交易,并广播
   * @param param0.tokenName 代币名称
   * @param param0.tokenSymbol 代币符号
   * @param param0.decimalNum 代币符号
   * @param param0.utxos (可选)手动传utxo
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @param param0.genesisWif 发行私钥
   * @param param0.noBroadcast (可选)不进行广播，默认false
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
  }> {
    //validate params
    checkParamTokenName(tokenName);
    checkParamTokenSymbol(tokenSymbol);
    checkParamDecimalNum(decimalNum);
    $.checkArgument(genesisWif, "genesisWif is required");
    let utxoInfo = await this.pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    let genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    let genesisPublicKey = genesisPrivateKey.toPublicKey();
    let { txHex, codehash, genesis, tx } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      genesisPublicKey,
    });

    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, codehash, genesis, txid: tx.id };
  }

  /**
   * 构造(未签名的)genesis交易
   * @param param0.tokenName 代币名称
   * @param param0.tokenSymbol 代币符号
   * @param param0.decimalNum 代币符号
   * @param param0.utxos (可选)手动传utxo
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @param param0.genesisPublicKey 发行公钥
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
    checkParamTokenName(tokenName);
    checkParamTokenSymbol(tokenSymbol);
    checkParamDecimalNum(decimalNum);
    $.checkArgument(genesisPublicKey, "genesisPublicKey is required");
    let utxoInfo = await this.pretreatUtxos(utxos);
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
      console.log(address.toString());
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
    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) throw "Insufficient balance.";
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }

    return { tx, txHex, genesis, codehash };
  }

  /**
   * 构造发行代币的交易并广播
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.genesisWif 发行私钥
   * @param param0.receiverAddress 接收地址
   * @param param0.tokenAmount 发行代币数量
   * @param param0.allowIncreaseIssues (可选)是否允许增发，默认允许
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @param param0.noBroadcast (可选)是否不广播交易，默认false
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
  }): Promise<{ txHex: string; txid: string }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    $.checkArgument(genesisWif, "genesisPublicKey is required");
    $.checkArgument(receiverAddress, "receiverAddress is required");
    $.checkArgument(tokenAmount, "tokenAmount is required");

    let utxoInfo = await this.pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    let genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    let genesisPublicKey = genesisPrivateKey.toPublicKey();
    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = BigInt(tokenAmount);
    let { txHex, tx } = await this._issue({
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

    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id };
  }

  /**
   * 构造(未签名的)发行代币的交易
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.genesisPublicKey 发行公钥
   * @param param0.receiverAddress 接收地址
   * @param param0.tokenAmount 发行代币数量
   * @param param0.allowIncreaseIssues (可选)是否允许增发，默认允许
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
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
    let utxoInfo = await this.pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = BigInt(tokenAmount);
    let { txHex, tx } = await this._issue({
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
    let issueUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      genesisContractCodehash,
      genesis,
      this.zeroAddress
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
    if (balance == 0) throw "Insufficient balance.";
    {
      //检查余额是否充足
      let inputSatoshis = Utils.getDustThreshold(SIZE_OF_GENESIS_TOKEN);
      let outputSatoshis = SIZE_OF_P2PKH * this.feeb * utxos.length;
      outputSatoshis +=
        (SIZE_OF_GENESIS_TOKEN + SIZE_OF_TOKEN + 277) * this.feeb;
      outputSatoshis +=
        SIZE_OF_TOKEN * this.feeb + Utils.getDustThreshold(SIZE_OF_TOKEN);
      if (allowIncreaseIssues) {
        outputSatoshis +=
          SIZE_OF_GENESIS_TOKEN * this.feeb +
          Utils.getDustThreshold(SIZE_OF_GENESIS_TOKEN);
      }
      let estimateSatoshis = outputSatoshis - inputSatoshis;
      if (balance < estimateSatoshis) {
        throw `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`;
      }
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
    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }
    return { txHex, tx };
  }

  private async supplyFtUtxosInfo(ftUtxos) {
    ftUtxos.forEach((v) => {
      v.tokenAmount = BigInt(v.tokenAmount);
    });

    let cachedHexs = {};
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
        ).toString();
      }
    });
    ftUtxos.forEach((v) => {
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    return ftUtxos;
  }

  /**
   * 构造转移代币的交易
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.senderWif 发送者的私钥wif
   * @param param0.receivers 接收数组，格式为[{address:'xxx',amount:'1000'}]
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @param param0.noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async transfer({
    codehash,
    genesis,
    senderWif,
    receivers,
    utxos,
    changeAddress,
    isMerge,
    opreturnData,
    noBroadcast = false,
  }: {
    codehash: string;
    genesis: string;
    senderWif: string;
    receivers?: any[];
    utxos?: any[];
    changeAddress?: any;
    isMerge?: boolean;
    opreturnData?: any;
    noBroadcast?: boolean;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);
    $.checkArgument(senderWif, "senderWif is required");

    let utxoInfo = await this.pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    const senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
    const senderPublicKey = senderPrivateKey.toPublicKey();

    let { routeCheckTxHex, txHex, tx } = await this._transfer({
      codehash,
      genesis,
      senderPrivateKey,
      senderPublicKey,
      receivers,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      opreturnData,
      isMerge,
    });
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(routeCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }

    return { routeCheckTxHex, txHex, txid: tx.id };
  }

  /**
   * 构造(未签名的)转移代币的交易
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.senderPublicKey 发送者的公钥
   * @param param0.receivers 接收数组，格式为[{address:'xxx',amount:'1000'}]
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @returns
   */
  public async unsignPreTransfer({
    codehash,
    genesis,
    senderPublicKey,
    receivers,
    utxos,
    changeAddress,
    isMerge,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    senderPublicKey: any;
    receivers?: any[];
    utxos: any[];
    changeAddress: any;
    isMerge?: boolean;
    opreturnData?: any;
  }): Promise<{
    routeCheckTx: any;
    routeCheckSigHashList: SigHashInfo[];
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);
    $.checkArgument(senderPublicKey, "senderPublicKey is required");

    let utxoInfo = await this.pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    senderPublicKey = new bsv.PublicKey(senderPublicKey);

    let { routeCheckTx } = await this._transfer({
      codehash,
      genesis,
      senderPublicKey,
      receivers,
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

  async _transfer({
    codehash,
    genesis,
    senderPrivateKey,
    senderPublicKey,
    receivers,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    isMerge,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    senderPrivateKey?: any;
    senderPublicKey?: any;
    receivers?: any[];
    utxos: any[];
    utxoPrivateKeys: any[];
    changeAddress: any;
    isMerge?: boolean;
    opreturnData?: any;
  }) {
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) {
      //检查余额
      throw "Insufficient balance.";
    }

    let senderAddress = senderPublicKey.toAddress(this.network);

    //将routeCheck的找零utxo作为transfer的输入utxo
    let changeAddress0 = utxos[0].address;
    let utxoPrivateKey0 = utxoPrivateKeys[0];

    //获取token的utxo
    let ftUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      codehash,
      genesis,
      senderAddress.toString()
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
    //完善ftUtxo的信息
    await this.supplyFtUtxosInfo(ftUtxos);

    if (inputTokenAmountSum < outputTokenAmountSum) {
      throw `insufficent token.Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`;
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
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = RouteCheckType.from6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = RouteCheckType.from10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from20To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_20To3;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else {
      throw "Too many token-utxos, should merge them to continue.";
    }

    let estimateSatoshis =
      sizeOfRouteCheck * this.feeb +
      Utils.getDustThreshold(sizeOfRouteCheck) +
      BASE_UTXO_FEE +
      (sizeOfRouteCheck +
        SIZE_OF_TOKEN * inputLength +
        SIZE_OF_TOKEN * inputLength * 2 +
        SIZE_OF_TOKEN * outputLength) *
        this.feeb +
      Utils.getDustThreshold(SIZE_OF_TOKEN) * outputLength -
      Utils.getDustThreshold(SIZE_OF_TOKEN) * inputLength -
      Utils.getDustThreshold(sizeOfRouteCheck) +
      BASE_UTXO_FEE;
    if (balance < estimateSatoshis) {
      throw `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`;
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
      },
    ];
    utxos.forEach((utxo) => {
      utxo.address = changeAddress0;
    });
    utxoPrivateKeys = utxos.map((v) => utxoPrivateKey0).filter((v) => v);
    const signerSelecteds = [0, 1];

    const tokenInputArray = ftUtxos.map((v) => {
      const preTx = new bsv.Transaction(v.preTxHex);
      const preLockingScript = preTx.outputs[v.preOutputIndex].script;
      const tx = new bsv.Transaction(v.txHex);
      const lockingScript = tx.outputs[v.outputIndex].script;
      return {
        satoshis: v.satoshis,
        txId: v.txId,
        outputIndex: v.outputIndex,
        lockingScript,
        preTxId: v.preTxId,
        preOutputIndex: v.preOutputIndex,
        preLockingScript,
        preTokenAddress: new bsv.Address(v.preTokenAddress, this.network),
        preTokenAmount: v.preTokenAmount,
      };
    });

    const satoshiInputArray = utxos.map((v) => ({
      lockingScript: bsv.Script.buildPublicKeyHashOut(v.address).toHex(),
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
    }));

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
      tokenInputArray,
      satoshiInputArray,
      rabinPubKeyIndexArray,
      checkRabinMsgArray,
      checkRabinPaddingArray,
      checkRabinSigArray,
      tokenOutputArray,
      tokenRabinDatas,
      routeCheckContract,
      senderPrivateKey,
      senderPublicKey,
      changeAddress,
      utxoPrivateKeys,
      feeb: this.feeb,
      opreturnData,
      debug: this.debug,
      changeAddress0,
    };

    if (!senderPrivateKey) {
      delete transferPart2.routeCheckTx;
      this.transferPart2 = transferPart2;
      return { routeCheckTx };
    }
    let tx = await this.ft.createTransferTx(transferPart2);

    let routeCheckTxHex = routeCheckTx.serialize(true);
    let txHex = tx.serialize(true);
    let needFee = ((routeCheckTxHex.length + txHex.length) / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }

    return { routeCheckTxHex, txHex, routeCheckTx, tx };
  }

  /**
   * 无签名转账交易的后续部分，需要前置交易先完成签名
   * @param transferPart2
   * @returns
   */
  public async unsignTransfer(routeCheckTx: any) {
    let transferPart2 = this.transferPart2;
    transferPart2.routeCheckTx = routeCheckTx;
    transferPart2.satoshiInputArray.forEach((v) => {
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
        address = transferPart2.senderPublicKey
          .toAddress(this.network)
          .toString();
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
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.senderWif 代币所有者的私钥wif
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @param param0.noBroadcast (可选)是否不广播交易，默认false
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
   * @param param0.genesis 代币的genesis
   * @param param0.codehash 代币的codehash
   * @param param0.senderWif 代币所有者的私钥wif
   * @param param0.utxos (可选)指定utxos
   * @param param0.changeAddress (可选)指定找零地址
   * @param param0.opreturnData (可选)追加一个opReturn输出
   * @returns
   */
  public async unsignPreMerge({
    codehash,
    genesis,
    ownerPublicKey,
    utxos,
    changeAddress,
    opreturnData,
  }: {
    codehash: string;
    genesis: string;
    ownerPublicKey: string;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
  }) {
    return await this.unsignPreTransfer({
      codehash,
      genesis,
      senderPublicKey: ownerPublicKey,
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
   * @param param0.codehash
   * @param param0.genesis
   * @param param0.address
   * @returns
   */
  public async getBalance({ codehash, genesis, address }) {
    let {
      balance,
      pendingBalance,
    } = await this.sensibleApi.getFungbleTokenBalance(
      codehash,
      genesis,
      address
    );
    return balance + pendingBalance;
  }

  /**
   * 查询某人持有的FT余额，以及utxo的数量
   * @param param0.codehash
   * @param param0.genesis
   * @param param0.address
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
    return await this.sensibleApi.getFungbleTokenBalance(
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
    return await this.sensibleApi.getFungbleTokenSummary(address);
  }

  /**
   * 估算genesis的费用
   * @param param0
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
    return fee;
  }

  /**
   * 估算issue的费用
   * @param param0
   * @returns
   */
  public async getIssueEstimateFee({
    opreturnData,
    allowIncreaseIssues = true,
  }) {
    let p2pkhInputNum = 1; //至少1输入
    let p2pkhOutputNum = 1; //最多1找零
    p2pkhInputNum = 10; //支持10输入的费用
    const sizeOfTokenGenesis = SizeHelper.getSizeOfTokenGenesis();
    const sizeOfToken = SizeHelper.getSizeOfToken();
    let size =
      4 +
      1 +
      p2pkhInputNum * (32 + 4 + 1 + 107 + 4) +
      (32 + 4 + 3 + sizeOfTokenGenesis + sizeOfToken + 100 + 4) +
      1 +
      (allowIncreaseIssues ? 8 + 3 + sizeOfTokenGenesis : 0) +
      (8 + 3 + sizeOfToken) +
      (opreturnData ? 8 + 3 + opreturnData.toString().length / 2 : 0) +
      p2pkhOutputNum * (8 + 1 + 25) +
      4;
    let dust = Utils.getDustThreshold(
      allowIncreaseIssues ? sizeOfTokenGenesis : 0 + sizeOfToken
    );
    let fee = Math.ceil(size * this.feeb) + dust;

    return fee;
  }

  /**
   * 提前计算费用
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.senderWif
   * @param {Array} param0.receivers
   * @param {String=} param0.opreturnData
   * @returns
   */
  public async getTransferEstimateFee({
    codehash,
    genesis,
    senderWif,
    receivers,
    opreturnData,
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);

    const senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
    const senderPublicKey = bsv.PublicKey.fromPrivateKey(senderPrivateKey);
    const senderAddress = senderPrivateKey.toAddress(this.network);

    //获取token
    let ftUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      codehash,
      genesis,
      senderAddress.toString()
    );
    ftUtxos.forEach((v) => (v.tokenAmount = BigInt(v.tokenAmount)));

    //格式化接收者
    let tokenOutputArray = receivers.map((v) => ({
      address: bsv.Address.fromString(v.address, this.network),
      tokenAmount: v.amount,
    }));

    //计算输出的总金额
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + BigInt(cur.tokenAmount),
      BigInt(0)
    );

    //token的选择策略
    let inputTokenAmountSum = BigInt(0);
    let _ftUtxos = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      _ftUtxos.push(ftUtxo);
      inputTokenAmountSum += BigInt(ftUtxo.tokenAmount);
      if (i == 9 && inputTokenAmountSum >= outputTokenAmountSum) {
        //尽量支持到10To10
        break;
      }
      if (inputTokenAmountSum >= outputTokenAmountSum) {
        break;
      }
    }

    if (inputTokenAmountSum < outputTokenAmountSum) {
      throw `insufficent token.Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`;
    }
    //找零
    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > BigInt(0)) {
      tokenOutputArray.push({
        address: senderPrivateKey.toAddress(this.network),
        tokenAmount: changeTokenAmount,
      });
    }

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
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = RouteCheckType.from6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = RouteCheckType.from10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = RouteCheckType.from20To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_20To3;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else {
      throw "Too many token-utxos, should merge them to continue.";
    }

    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = new bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
    }

    let estimateSatoshis =
      sizeOfRouteCheck * this.feeb +
      Utils.getDustThreshold(sizeOfRouteCheck) +
      BASE_UTXO_FEE +
      (sizeOfRouteCheck +
        SIZE_OF_TOKEN * inputLength +
        SIZE_OF_TOKEN * inputLength * 2 +
        SIZE_OF_TOKEN * outputLength +
        opreturnScriptHex.length / 2) *
        this.feeb +
      Utils.getDustThreshold(SIZE_OF_TOKEN) * outputLength -
      Utils.getDustThreshold(SIZE_OF_TOKEN) * inputLength -
      Utils.getDustThreshold(sizeOfRouteCheck) +
      BASE_UTXO_FEE;

    return estimateSatoshis;
  }

  /**
   * 更新交易解锁脚本
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
        receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
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
        receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
        tokenAmount: BigInt(0),
      }
    );
    let codehash = Utils.getCodeHash(tokenContract.lockingScript);

    return { codehash, genesis };
  }
}

module.exports = { SensibleFT };
