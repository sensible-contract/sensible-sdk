const { bsv, Bytes, toHex, signTx } = require("scryptlib");
const { SatotxSigner } = require("../common/SatotxSigner");
const Utils = require("../common/utils");
const { SensibleApi } = require("../sensible-api");
const { TokenTxHelper } = require("./TokenTxHelper");
const TokenProto = require("./tokenProto");
const { FungibleToken } = require("./FungibleToken");
const defaultSignerConfigs = [
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

const ROUTE_CHECK_TYPE_3To3 = "3To3";
const ROUTE_CHECK_TYPE_6To6 = "6To6";
const ROUTE_CHECK_TYPE_10To10 = "10To10";
const ROUTE_CHECK_TYPE_3To100 = "3To100";
const ROUTE_CHECK_TYPE_20To3 = "20To3";

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

function checkParamDecimalNum() {}

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

FT这里有三套genesis/codehash
1.第一个用于是发行的TokenGenesis（同一个私钥发行的一样，可根据3的genesis来尝试花费）
codehash:aa1d1d2612197246fc04223442f15603befd52e3
genesis:000000000000000000000000000000000000000000000000000000000000000000000000
2.用于增发时的TokenGenesis（同一个私钥发行的codehash一样，并根据3的genesis通过API查）
3.实际转移的FT（codehash独一无二）

创建FT后返回一个3的genesis/codehash对来标识一种FT。
 */
class SensibleFT {
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
    network = "mainnet",
    // apiTarget = "whatsonchain",
    mock = false,
    purse,
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
  }

  /**
   *
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
  }) {
    checkParamTokenName(tokenName);
    checkParamTokenSymbol(tokenSymbol);
    checkParamDecimalNum(decimalNum);
    checkParamWif(genesisWif, "genesisWif");
    if (changeAddress) checkParamAddress(changeAddress, "changeAddress");

    let utxoPrivateKeys = [];
    if (utxos) {
      checkParamUtxoFormat(utxos[0]);
      utxos.forEach((v) => {
        let privateKey = new bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = new bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = toHex(utxoAddress);
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey);
    }
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) {
      //检查余额
      throw "Insufficient balance.";
    }
    if (changeAddress) {
      changeAddress = new bsv.address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    const issuerPrivateKey = new bsv.PrivateKey.fromWIF(genesisWif);
    let { tx, genesis, codehash } = await TokenTxHelper.genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos,
      changeAddress,
      issuerPrivateKey,
      utxoPrivateKeys,

      feeb: this.feeb,
      network: this.network,
      signers: this.signers,
    });

    if (!this.mock) {
      let txHex = tx.serialize(true);
      let needFee = (txHex.length / 2) * this.feeb;
      if (balance < needFee) {
        throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
      }
      await this.sensibleApi.broadcast(txHex);
    }
    return { txid: tx.id, genesis, codehash };
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
        let privateKey = new bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = new bsv.PrivateKey.fromWIF(this.purse);
      const utxoAddress = utxoPrivateKey.toAddress(this.network);
      utxos = await this.sensibleApi.getUnspents(utxoAddress.toString());
      utxos.forEach((utxo) => {
        utxo.address = toHex(utxoAddress);
      });
      utxoPrivateKeys = utxos.map((v) => utxoPrivateKey);
    }
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0) {
      //检查余额
      throw "Insufficient balance.";
    }
    if (changeAddress) {
      changeAddress = new bsv.address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    const issuerPrivateKey = new bsv.PrivateKey.fromWIF(genesisWif);
    let { genesisTxId, genesisOutputIndex } = TokenTxHelper.parseGenesis(
      genesis
    );

    let spendByTxId;
    let spendByOutputIndex;

    let issueUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      codehash,
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
    let tx = await TokenTxHelper.issue({
      genesisTxId,
      genesisOutputIndex,
      preUtxoTxId,
      preUtxoOutputIndex,
      preUtxoTxHex,
      spendByTxId,
      spendByOutputIndex,
      spendByTxHex,

      issuerPrivateKey,
      receiverAddress,
      tokenAmount,
      allowIncreaseIssues,

      utxos,
      utxoPrivateKeys,
      changeAddress,

      feeb: this.feeb,
      network: this.network,
      signers: this.signers,
    });

    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }
    if (!this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txid: tx.id };
  }

  async fetchFtUtxos(codehash, genesis, address) {
    let ftUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      codehash,
      genesis,
      address
    );

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
        v.preTokenAddress = address; //genesis 情况下为了让preTokenAddress成为合法地址，但最后并不会使用 dummy
      } else {
        v.preTokenAddress = bsv.Address.fromPublicKeyHash(
          Buffer.from(dataPartObj.tokenAddress, "hex"),
          this.network
        ).toString();
      }
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
        let privateKey = new bsv.PrivateKey.fromWIF(v.wif);
        v.address = privateKey.toAddress(this.network);
        utxoPrivateKeys.push(privateKey);
      });
    } else {
      const utxoPrivateKey = new bsv.PrivateKey.fromWIF(this.purse);
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
      changeAddress = new bsv.address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    const senderPrivateKey = new bsv.PrivateKey.fromWIF(senderWif);
    const senderPublicKey = bsv.PublicKey.fromPrivateKey(senderPrivateKey);
    const senderAddress = senderPrivateKey.toAddress(this.network);

    //获取token
    let ftUtxos = await this.fetchFtUtxos(
      codehash,
      genesis,
      senderAddress.toString()
    );

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
          tokenAmount: mergeTokenAmountSum,
        },
      ];
    }
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

    if (isMerge) {
      _ftUtxos = mergeUtxos;
      inputTokenAmountSum = mergeTokenAmountSum;
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

    let routeCheckType;
    let inputLength = ftUtxos.length;
    let outputLength = tokenOutputArray.length;
    let sizeOfRouteCheck = 0;
    if (inputLength <= 3) {
      if (outputLength <= 3) {
        routeCheckType = ROUTE_CHECK_TYPE_3To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To3;
      } else if (outputLength <= 100) {
        routeCheckType = ROUTE_CHECK_TYPE_3To100;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To100;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = ROUTE_CHECK_TYPE_6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = ROUTE_CHECK_TYPE_10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = ROUTE_CHECK_TYPE_20To3;
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
    let routeCheckTx = await TokenTxHelper.routeCheck({
      senderPrivateKey,
      receivers,
      ftUtxos,
      routeCheckType,
      utxoPrivateKeys,
      utxos,
      changeAddress: toHex(changeAddress0),
      feeb: this.feeb,
      network: this.network,
      signers: this.signers,
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
      utxo.address = toHex(changeAddress0);
    });
    utxoPrivateKeys = utxos.map((v) => utxoPrivateKey0);

    let tx = await TokenTxHelper.transfer({
      senderPrivateKey,
      receivers,
      ftUtxos,
      routeCheckType,
      routeCheckTx,
      opreturnData,

      utxos,
      changeAddress: toHex(changeAddress0),
      utxoPrivateKeys,
      signerSelecteds: [0, 1],
      feeb: this.feeb,
      network: this.network,
      signers: this.signers,
    });
    let routeCheckTxHex = routeCheckTx.serialize(true);
    let txHex = tx.serialize(true);
    let needFee = ((routeCheckTxHex.length + txHex.length) / 2) * this.feeb;
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }

    if (!this.mock) {
      await this.sensibleApi.broadcast(routeCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }

    return { txid: tx.id };
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
  async merge({ codehash, genesis, senderWif, utxos, changeAddress }) {
    return await this.transfer({
      codehash,
      genesis,
      senderWif,
      utxos,
      changeAddress,
      isMerge: true,
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
  async getSummary(address) {
    return await this.sensibleApi.getFungbleTokenSummary(address);
  }

  async getGenesisEstimateFee() {
    return 5000;
  }

  async getIssueEstimateFee({
    genesis,
    codehash,
    genesisWif,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues = true,
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamWif(genesisWif, "genesisWif");
    checkParamAddress(receiverAddress, "receiverAddress");

    const issuerPrivateKey = new bsv.PrivateKey.fromWIF(genesisWif);
    let { genesisTxId, genesisOutputIndex } = TokenTxHelper.parseGenesis(
      genesis
    );

    let spendByTxId;
    let spendByOutputIndex;

    let issueUtxos = await this.sensibleApi.getFungbleTokenUnspents(
      codehash,
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

    //检查余额是否充足
    let inputSatoshis = Utils.getDustThreshold(SIZE_OF_GENESIS_TOKEN);
    let outputSatoshis = SIZE_OF_P2PKH * this.feeb * 10;
    outputSatoshis += (SIZE_OF_GENESIS_TOKEN + SIZE_OF_TOKEN + 277) * this.feeb;
    outputSatoshis +=
      SIZE_OF_TOKEN * this.feeb + Utils.getDustThreshold(SIZE_OF_TOKEN);
    if (allowIncreaseIssues) {
      outputSatoshis +=
        SIZE_OF_GENESIS_TOKEN * this.feeb +
        Utils.getDustThreshold(SIZE_OF_GENESIS_TOKEN);
    }
    let estimateSatoshis = outputSatoshis - inputSatoshis;
    return estimateSatoshis;
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

    const senderPrivateKey = new bsv.PrivateKey.fromWIF(senderWif);
    const senderPublicKey = bsv.PublicKey.fromPrivateKey(senderPrivateKey);
    const senderAddress = senderPrivateKey.toAddress(this.network);

    //获取token
    let ftUtxos = await this.fetchFtUtxos(
      codehash,
      genesis,
      senderAddress.toString()
    );

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

    let routeCheckType;
    let inputLength = ftUtxos.length;
    let outputLength = tokenOutputArray.length;
    let sizeOfRouteCheck = 0;
    if (inputLength <= 3) {
      if (outputLength <= 3) {
        routeCheckType = ROUTE_CHECK_TYPE_3To3;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To3;
      } else if (outputLength <= 100) {
        routeCheckType = ROUTE_CHECK_TYPE_3To100;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_3To100;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 6) {
      if (outputLength <= 6) {
        routeCheckType = ROUTE_CHECK_TYPE_6To6;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_6To6;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 10) {
      if (outputLength <= 10) {
        routeCheckType = ROUTE_CHECK_TYPE_10To10;
        sizeOfRouteCheck = SIZE_OF_ROUTE_CHECK_TYPE_10To10;
      } else {
        throw `unsupport transfer from inputs(${inputLength}) to outputs(${outputLength})`;
      }
    } else if (inputLength <= 20) {
      if (outputLength <= 3) {
        routeCheckType = ROUTE_CHECK_TYPE_20To3;
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
