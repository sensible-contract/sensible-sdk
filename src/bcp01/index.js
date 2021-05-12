const { bsv, Bytes, toHex, signTx } = require("scryptlib");
const { SatotxSigner } = require("../common/SatotxSigner");
const Utils = require("../common/utils");
const { SensibleApi } = require("../sensible-api");
const { TokenTxHelper } = require("./TokenTxHelper");
const defaultSignerConfigs = [
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
];

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
  if (signers.length != 1) {
    throw "only support 1 signer";
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
		}]`;
  }
}

function checkParamNetwork(network) {
  if (!["mainnet", "testnet"].includes(network)) {
    throw `NetworkFormatError:only support 'mainnet' and 'testnet' but value is ${network}`;
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
  if (typeof genesis != "string" || genesis.length != 80) {
    throw `GenesisFormatError:genesis should be a string with 80 length `;
  }
}

function checkParamCodehash(codehash) {
  if (typeof codehash != "string" || codehash.length != 40) {
    throw `CodehashFormatError:codehash should be a string with 40 length `;
  }
}

class SensibleNFT {
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
  }

  /**
   * 创世
   * @param {Object} param0
   * @param {String} param0.genesisWif 发行方私钥WIF
   * @param {String} param0.totalSupply 最大供应量
   * @param {String} param0.opreturnData 追加输出
   * @param {Array=} param0.utxos 手续费UTXO
   * @param {String=} param0.changeAddress 手续费找零地址
   * @returns {Object} {txid,genesis,codehash}
   */
  async genesis({
    genesisWif,
    totalSupply,
    opreturnData,
    utxos,
    changeAddress,
  }) {
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
      totalSupply,
      opreturnData,
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
   *
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.genesisWif 创世的私钥
   * @param {String} param0.metaTxId NFTState
   * @param {String} param0.opreturnData 追加的OPRETURN
   * @param {String} param0.receiverAddress 接受者的地址
   * @param {Array=} param0.utxos 手续费UTXO
   * @param {String=} param0.changeAddress 手续费找零地址
   * @returns {Object} {txid,tokenid}
   */
  async issue({
    genesis,
    codehash,
    genesisWif,
    receiverAddress,
    metaTxId,
    opreturnData,
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
    const issuerPublicKey = bsv.PublicKey.fromPrivateKey(issuerPrivateKey);
    const issuerAddress = issuerPrivateKey.toAddress(this.network);

    let { genesisTxId, genesisOutputIndex } = TokenTxHelper.parseGenesis(
      genesis
    );

    let issueNftUnspents = await this.sensibleApi.getNonFungbleTokenUnspents(
      codehash,
      genesis,
      issuerAddress.toString()
    );

    let issueNftUnspent = issueNftUnspents[0];
    if (!issueNftUnspent) {
      throw "No issue-utxo available to continue";
    }
    let spendByTxId = issueNftUnspent.txId;
    let spendByOutputIndex = issueNftUnspent.outputIndex;
    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);

    const preTx = new bsv.Transaction(spendByTxHex);
    const preInputIndex = preTx.inputs.length - 1; //最后一个输入必定能够作为前序输入
    let preUtxoTxId = preTx.inputs[preInputIndex].prevTxId.toString("hex");
    let preUtxoOutputIndex = preTx.inputs[preInputIndex].outputIndex;
    let preUtxoTxHex = await this.sensibleApi.getRawTxData(preUtxoTxId);

    let { tx, tokenid } = await TokenTxHelper.issue({
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
      metaTxId,
      opreturnData,

      utxos,
      utxoPrivateKeys,
      changeAddress,

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
    return { txid: tx.id, tokenid };
  }

  /**
   *
   * @param {Object} param0
   * @param {String} param0.genesis
   * @param {String} param0.codehash
   * @param {String} param0.tokenid
   * @param {String} param0.senderWif
   * @param {String} param0.receiverAddress 接受者的地址
   * @param {Array=} param0.utxos 手续费UTXO
   * @param {String=} param0.changeAddress 手续费找零地址
   * @returns {Object} {txid}
   */
  async transfer({
    genesis,
    codehash,
    tokenid,
    senderWif,
    receiverAddress,
    utxos,
    changeAddress,
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamWif(senderWif, "senderWif");
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
        utxo.address = utxoAddress;
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

    const senderPrivateKey = new bsv.PrivateKey.fromWIF(senderWif);
    let { genesisTxId, genesisOutputIndex } = TokenTxHelper.parseGenesis(
      genesis
    );

    let nftUtxo = await this.sensibleApi.getNonFungbleTokenUnspentDetail(
      codehash,
      genesis,
      tokenid
    );

    let spendByTxId = nftUtxo.txId;
    let spendByOutputIndex = nftUtxo.outputIndex;
    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);

    const spendByTx = new bsv.Transaction(spendByTxHex);
    let preInput = spendByTx.inputs[spendByTx.inputs.length - 1]; //最后一个个输入必定能够作为前序输入
    let preUtxoTxId = preInput.prevTxId.toString("hex");
    let preUtxoOutputIndex = preInput.outputIndex;
    let preUtxoTxHex = await this.sensibleApi.getRawTxData(preUtxoTxId);

    let tx = await TokenTxHelper.transfer({
      genesisTxId,
      genesisOutputIndex,
      preUtxoTxId,
      preUtxoOutputIndex,
      preUtxoTxHex,
      spendByTxId,
      spendByOutputIndex,
      spendByTxHex,

      senderPrivateKey,
      receiverAddress,

      utxos,
      changeAddress,
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

    return { txid: tx.id };
  }
}

module.exports = { SensibleNFT };
