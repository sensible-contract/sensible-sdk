import { bsv, Bytes, toHex } from "scryptlib";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as Utils from "../common/utils";
import { API_NET, SensibleApi } from "../sensible-api";
import { FungibleToken, RouteCheckType } from "./FungibleToken";
import * as SizeHelper from "./SizeHelper";
import * as TokenProto from "./tokenProto";
import * as TokenUtil from "./tokenUtil";
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

function checkParamApiTarget(apiTarget) {
  if (!["metasv", "whatsonchain"].includes(apiTarget)) {
    throw `ApiTargetFormatError:only support 'metasv' and 'whatsonchain'`;
  }
}

function checkParamWif(wif, name) {
  if (typeof wif != "string" || wif.length != 52) {
    throw `WifFormatError:${name} should be a string with 52 length `;
  }
}

function checkParamAddress(address, name) {
  if (typeof address != "string" || address.length != 34) {
    throw `AddressFormatError:${name} should be a string with 34 length `;
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

function getGenesis(txid: string, index: number): string {
  const txidBuf = Buffer.from(txid, "hex").reverse();
  const indexBuf = Buffer.alloc(4, 0);
  indexBuf.writeUInt32LE(index);
  return toHex(Buffer.concat([txidBuf, indexBuf]));
}

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

FT这里有三套genesis/codehash
1.第一个用于是发行的TokenGenesis（同一个私钥发行的一样，可根据3的genesis来尝试花费）
codehash:aa1d1d2612197246fc04223442f15603befd52e3
genesis:000000000000000000000000000000000000000000000000000000000000000000000000
2.用于增发时的TokenGenesis（同一个私钥发行的codehash一样，并根据3的genesis通过API查）
3.实际转移的FT（codehash独一无二）

创建FT后返回一个3的genesis/codehash对来标识一种FT。
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
  /**
   *
   * @param {Object} param0
   * @param {Array} param0.signers - 签名器
   * @param {Number=} param0.feeb
   * @param {String=} param0.network
   * @param {String=} param0.purse
   * @param {Boolean=} param0.mock
   */
  constructor({
    signers = defaultSignerConfigs,
    feeb = 0.5,
    network = API_NET.MAIN,
    // apiTarget = "whatsonchain",
    mock = false,
    purse,
  }: {
    signers: SignerConfig[];
    feeb: number;
    network: API_NET;
    mock: boolean;
    purse: string;
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

  /**
   * genesis
   * @param {Object} param0
   * @param {String} param0.tokenName
   * @param {String} param0.tokenSymbol
   * @param {Number} param0.decimalNum
   * @param {String} param0.genesisWif
   * @param {Array=} param0.utxos
   * @param {String=} param0.changeAddress
   * @returns
   */
  async genesis({
    tokenName,
    tokenSymbol,
    decimalNum,
    genesisWif,
    utxos,
    changeAddress,
    opreturnData,
    noBroadcast = false,
  }: {
    tokenName: string;
    tokenSymbol: string;
    decimalNum: number;
    genesisWif: string;
    utxos?: any;
    changeAddress?: any;
    opreturnData?: any;
    noBroadcast?: boolean;
  }) {
    //validate params
    checkParamTokenName(tokenName);
    checkParamTokenSymbol(tokenSymbol);
    checkParamDecimalNum(decimalNum);
    checkParamWif(genesisWif, "genesisWif");
    if (changeAddress) checkParamAddress(changeAddress, "changeAddress");

    //decide utxos
    let utxoPrivateKeys = [];
    if (utxos) {
      checkParamUtxoFormat(utxos[0]);
      utxos.forEach((v) => {
        let privateKey = bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = utxoAddress;
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey);
    }
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) throw "Insufficient balance.";

    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    const issuerPrivateKey = bsv.PrivateKey.fromWIF(genesisWif);
    const issuerPk = issuerPrivateKey.toPublicKey();

    //create genesis contract
    let genesisContract = this.ft.createGenesisContract(issuerPk, {
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
          receiverAddress: changeAddress, //dummy address
          tokenAmount: BigInt(0),
        }
      );
      codehash = Utils.getCodeHash(tokenContract.lockingScript);
    }

    //check fee enough
    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }

    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id, genesis, codehash };
  }

  /**
   * token 发行
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.genesisWif
   * @param {String} param0.receiverAddress
   * @param {String} param0.tokenAmount
   * @param {Boolean} param0.allowIncreaseIssues
   * @param {Array=} param0.utxos
   * @param {String=} param0.changeAddress
   * @returns
   */
  async issue({
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
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamWif(genesisWif, "genesisWif");
    checkParamAddress(receiverAddress, "receiverAddress");
    if (changeAddress) checkParamAddress(changeAddress, "changeAddress");
    let utxoPrivateKeys = [];
    if (utxos) {
      checkParamUtxoFormat(utxos[0]);
      utxos.forEach((v) => {
        let privateKey = bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = utxoAddress;
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey);
    }
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) throw "Insufficient balance.";

    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    receiverAddress = new bsv.Address(receiverAddress, this.network);
    tokenAmount = BigInt(tokenAmount);
    const issuerPrivateKey = bsv.PrivateKey.fromWIF(genesisWif);
    let { genesisTxId, genesisOutputIndex } = parseGenesis(genesis);

    let spendByTxId;
    let spendByOutputIndex;

    let genesisContract = this.ft.createGenesisContract(
      issuerPrivateKey.toPublicKey()
    );
    let genesisContractCodehash = Utils.getCodeHash(
      genesisContract.lockingScript
    );
    let issueUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      genesisContractCodehash,
      genesis,
      this.zeroAddress
    );
    if (issueUtxos.length > 0) {
      spendByTxId = issueUtxos[0].txId;
      spendByOutputIndex = issueUtxos[0].outputIndex;
    } else {
      spendByTxId = genesisTxId;
      spendByOutputIndex = genesisOutputIndex;
    }
    if (!spendByTxId) {
      throw "No valid FungbleTokenUnspents to issue";
    }

    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);

    const preTx = new bsv.Transaction(spendByTxHex);
    let preUtxoTxId = preTx.inputs[0].prevTxId.toString("hex"); //第一个输入必定能够作为前序输入
    let preUtxoOutputIndex = preTx.inputs[0].outputIndex;
    let preUtxoTxHex = await this.sensibleApi.getRawTxData(preUtxoTxId);

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

    const spendByLockingScript = preTx.outputs[spendByOutputIndex].script;
    let dataPartObj = TokenProto.parseDataPart(spendByLockingScript.toBuffer());
    const dataPart = TokenProto.newDataPart(dataPartObj);
    genesisContract.setDataPart(dataPart.toString("hex"));
    //create token contract
    let tokenContract = this.ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      {
        receiverAddress,
        tokenAmount,
      }
    );

    //create issue tx
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
      issuerPrivateKey,
      utxoPrivateKeys,
    });

    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id };
  }

  async supplyFtUtxosInfo(ftUtxos) {
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
   * token转账
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.senderWif
   * @param {Array} param0.receivers
   * @param {Array=} param0.utxos
   * @param {String=} param0.changeAddress
   * @param {String=} param0.opreturnData
   * @returns
   */
  async transfer({
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
    utxos: any[];
    changeAddress: any;
    isMerge?: boolean;
    opreturnData?: any;
    noBroadcast?: boolean;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamWif(senderWif, "senderWif");
    checkParamReceivers(receivers);
    if (changeAddress) checkParamAddress(changeAddress, "changeAddress");

    let utxoPrivateKeys = [];
    if (utxos) {
      checkParamUtxoFormat(utxos[0]);
      utxos.forEach((v) => {
        let privateKey = bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = utxoAddress;
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey);
    }
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) {
      //检查余额
      throw "Insufficient balance.";
    }

    let changeAddress0 = utxos[0].address;
    let utxoPrivateKey0 = utxoPrivateKeys[0];
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

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
      address: bsv.Address.fromString(v.address, this.network),
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
    await this.supplyFtUtxosInfo(ftUtxos);

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

    const senderPk = senderPrivateKey.toPublicKey();

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
    utxoPrivateKeys = utxos.map((v) => utxoPrivateKey0);

    const signerSelecteds = [0, 1];

    //create routeCheck tx
    // let routeCheckTx = new bsv.Transaction(routeCheckHex);

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

    let tx = await this.ft.createTransferTx({
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
      changeAddress,
      utxoPrivateKeys,
      feeb: this.feeb,
      opreturnData,
    });

    let routeCheckTxHex = routeCheckTx.serialize(true);
    let txHex = tx.serialize(true);
    let needFee = ((routeCheckTxHex.length + txHex.length) / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }

    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(routeCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }

    return { routeCheckTxHex, txHex, routeCheckTx, txid: tx.id };
  }

  /**
   * 合并钱包最多20个token-utxo
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.senderWif
   * @param {Array=} param0.utxos
   * @param {String=} param0.changeAddress
   * @returns
   */
  async merge({
    codehash,
    genesis,
    senderWif,
    utxos,
    changeAddress,
    noBroadcast = false,
  }: {
    codehash: string;
    genesis: string;
    senderWif: string;
    utxos?: any;
    changeAddress?: any;
    noBroadcast?: boolean;
  }) {
    return await this.transfer({
      codehash,
      genesis,
      senderWif,
      utxos,
      changeAddress,
      isMerge: true,
      noBroadcast,
      receivers: [],
    });
  }

  async getBalance({ codehash, genesis, address }) {
    return await this.sensibleApi.getFungbleTokenBalance(
      codehash,
      genesis,
      address
    );
  }

  /**
   * 查询某人持有的FT Token列表。获得每个token的余额
   * @param {String} address
   * @returns
   */
  async getSummary(address: string) {
    return await this.sensibleApi.getFungbleTokenSummary(address);
  }

  async getGenesisEstimateFee({ opreturnData }) {
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

  async getIssueEstimateFee({ opreturnData, allowIncreaseIssues = true }) {
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
  async getTransferEstimateFee({
    codehash,
    genesis,
    senderWif,
    receivers,
    opreturnData,
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamWif(senderWif, "senderWif");
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
}

module.exports = { SensibleFT };
