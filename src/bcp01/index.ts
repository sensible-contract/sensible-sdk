import { bsv, toHex } from "scryptlib";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as Utils from "../common/utils";
import { API_NET, SensibleApi } from "../sensible-api";
import { NonFungibleToken } from "./NonFungibleToken";
const dummyNetwork = "mainnet";
const dummyWif = "L5k7xi4diSR8aWoGKojSNTnc3YMEXEoNpJEaGzqWimdKry6CFrzz";
const dummyPrivateKey = bsv.PrivateKey.fromWIF(dummyWif);
const dummyAddress = dummyPrivateKey.toAddress(dummyNetwork);
const dummyPk = dummyPrivateKey.toPublicKey();
const dummyTxId =
  "c776133a77886693ba2484fe12d6bdfb8f8bcb7a237e4a8a6d0f69c7d1879a08";
const dummyUtxo = {
  txId: dummyTxId,
  outputIndex: 0,
  satoshis: 1000000000,
  wif: dummyWif,
};

type ParamUtxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  wif: string;
  address?: any;
};
const defaultSignerConfigs: SignerConfig[] = [
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

function getGenesis(
  txid: string,
  index: number,
  issueOutputIndex: number = 0
): string {
  const txidBuf = Buffer.from(txid, "hex").reverse();
  const indexBuf = Buffer.alloc(4, 0);
  indexBuf.writeUInt32LE(index);
  const issueOutputIndexBuf = Buffer.alloc(4, 0);
  issueOutputIndexBuf.writeUInt32LE(issueOutputIndex);
  return toHex(Buffer.concat([txidBuf, indexBuf, issueOutputIndexBuf]));
}

function parseGenesis(genesis: string) {
  let tokenIDBuf = Buffer.from(genesis, "hex");
  let genesisTxId = tokenIDBuf.slice(0, 32).reverse().toString("hex");
  let genesisOutputIndex = tokenIDBuf.readUIntLE(32, 4);
  let issueOutputIndex = tokenIDBuf.readUIntLE(36, 4);
  return {
    genesisTxId,
    genesisOutputIndex,
    issueOutputIndex,
  };
}

export class SensibleNFT {
  signers: SatotxSigner[];
  feeb: number;
  network: API_NET;
  mock: boolean;
  purse: string;
  sensibleApi: SensibleApi;
  nft: NonFungibleToken;
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
    this.signers = signers.map(
      (v) => new SatotxSigner(v.satotxApiPrefix, v.satotxPubKey)
    );

    this.feeb = feeb;
    this.network = network;
    this.mock = mock;
    this.sensibleApi = new SensibleApi(network);
    this.purse = purse;
    this.nft = new NonFungibleToken(BigInt("0x" + signers[0].satotxPubKey));
  }

  async pretreatUtxos(utxos: ParamUtxo[]) {
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
    if (utxos.length == 0) throw "Insufficient balance.";
    return { utxos, utxoPrivateKeys };
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
  }: {
    genesisWif: string;
    totalSupply: string | bigint;
    opreturnData: any;
    utxos?: ParamUtxo[];
    changeAddress?: any;
  }) {
    checkParamWif(genesisWif, "genesisWif");
    if (changeAddress) checkParamAddress(changeAddress, "changeAddress");
    let _res = await this.pretreatUtxos(utxos);
    return await this._genesis({
      genesisWif,
      totalSupply: BigInt(totalSupply),
      opreturnData,
      utxos: _res.utxos,
      utxoPrivateKeys: _res.utxoPrivateKeys,
      changeAddress: changeAddress
        ? new bsv.Address(changeAddress, this.network)
        : _res.utxos[0].address,
    });
  }

  async _genesis({
    genesisWif,
    totalSupply,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
  }: {
    genesisWif: string;
    totalSupply: bigint;
    opreturnData?: any;
    utxos?: ParamUtxo[];
    utxoPrivateKeys: any[];
    changeAddress?: any;
  }) {
    const issuerPrivateKey = bsv.PrivateKey.fromWIF(genesisWif);

    let issuerPk = issuerPrivateKey.toPublicKey();
    const utxoTxId = utxos[utxos.length - 1].txId;
    const utxoOutputIndex = utxos[utxos.length - 1].outputIndex;

    this.nft.setTxGenesisPart({
      prevTxId: utxoTxId,
      outputIndex: utxoOutputIndex,
    });
    let tx = await this.nft.makeTxGenesis({
      issuerPk,
      tokenId: BigInt(0),
      totalSupply,
      opreturnData,

      utxos,
      changeAddress,
      utxoPrivateKeys,
      feeb: this.feeb,
    });

    let genesis = toHex(getGenesis(utxoTxId, utxoOutputIndex));
    let codehash = toHex(Utils.getCodeHash(tx.outputs[0].script));

    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }
    if (!this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { tx, txid: tx.id, genesis, codehash };
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

    let _res = await this.pretreatUtxos(utxos);
    return await this._issue({
      genesis,
      codehash,
      genesisWif,
      receiverAddress: new bsv.Address(receiverAddress, this.network),
      metaTxId,
      opreturnData,
      utxos: _res.utxos,
      utxoPrivateKeys: _res.utxoPrivateKeys,
      changeAddress: changeAddress
        ? new bsv.Address(changeAddress, this.network)
        : _res.utxos[0].address,
    });
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
  async _issue({
    genesis,
    codehash,
    genesisWif,
    receiverAddress,
    metaTxId,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
  }) {
    const issuerPrivateKey = bsv.PrivateKey.fromWIF(genesisWif);
    const issuerPublicKey = bsv.PublicKey.fromPrivateKey(issuerPrivateKey);
    const issuerAddress = issuerPrivateKey.toAddress(this.network);

    let { genesisTxId, genesisOutputIndex } = parseGenesis(genesis);

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

    let issuerPk = issuerPrivateKey.toPublicKey();

    const preIssueTx = new bsv.Transaction(spendByTxHex);
    const issuerLockingScript = preIssueTx.outputs[spendByOutputIndex].script;

    this.nft.setTxGenesisPart({
      prevTxId: genesisTxId,
      outputIndex: genesisOutputIndex,
    });
    let { tx, tokenid } = await this.nft.makeTxIssue({
      issuerTxId: spendByTxId,
      issuerOutputIndex: spendByOutputIndex,
      issuerLockingScript,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },

      issuerPrivateKey,
      metaTxId,
      receiverAddress,
      opreturnData,

      signers: this.signers,
      utxos,
      changeAddress,
      utxoPrivateKeys,
      feeb: this.feeb,
    });

    let txHex = tx.serialize(true);
    let needFee = (txHex.length / 2) * this.feeb;
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance < needFee) {
      throw `Insufficient balance.It take ${needFee}, but only ${balance}.`;
    }
    if (!this.mock) {
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
    opreturnData,
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

    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxos[0].address;
    }

    const senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
    let { genesisTxId, genesisOutputIndex } = parseGenesis(genesis);

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

    utxos.forEach((utxo) => {
      utxo.address = new bsv.Address(utxo.address, this.network);
    });
    receiverAddress = new bsv.Address(receiverAddress, this.network);

    this.nft.setTxGenesisPart({
      prevTxId: genesisTxId,
      outputIndex: genesisOutputIndex,
    });

    const transferLockingScript = spendByTx.outputs[spendByOutputIndex].script;

    let tx = await this.nft.makeTxTransfer({
      transferTxId: spendByTxId,
      transferOutputIndex: spendByOutputIndex,
      transferLockingScript,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },

      senderPrivateKey,
      receiverAddress,
      opreturnData,

      utxos,
      utxoPrivateKeys,
      changeAddress,
      feeb: this.feeb,
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

  /*
  查询某人持有的所有NFT Token列表。获得持有的nft数量计数
  */
  async getSummary(address) {
    return await this.sensibleApi.getNonFungbleTokenSummary(address);
  }

  async getGenesisEstimateFee({ opreturnData }) {
    let p2pkhInputNum = 1;
    let p2pkhOutputNum = 1;
    p2pkhInputNum = 10; //支持10输入的费用

    const sizeOfNft = 3514;
    let size =
      4 +
      1 +
      p2pkhInputNum * (32 + 4 + 1 + 107 + 4) +
      1 +
      (8 + 3 + sizeOfNft) +
      (opreturnData ? 8 + 3 + opreturnData.toString().length / 2 : 0) +
      p2pkhOutputNum * (8 + 1 + 25) +
      4;

    let dust = Utils.getDustThreshold(sizeOfNft);
    let fee = Math.ceil(size * this.feeb) + dust;
    return fee;
  }

  async getIssueEstimateFee({ opreturnData }) {
    let p2pkhInputNum = 1;
    let p2pkhOutputNum = 1;
    p2pkhInputNum = 10; //支持10输入的费用

    const sizeOfNft = 3514;
    let size =
      4 +
      1 +
      p2pkhInputNum * (32 + 4 + 1 + 107 + 4) +
      (32 + 4 + 3 + sizeOfNft + 100 + 4) +
      1 +
      (8 + 3 + sizeOfNft) +
      (opreturnData ? 8 + 3 + opreturnData.toString().length / 2 : 0) +
      p2pkhOutputNum * (8 + 1 + 25) +
      4;

    let dust = Utils.getDustThreshold(sizeOfNft);
    let fee = Math.ceil(size * this.feeb) + dust;
    return fee;
  }

  async getTransferEstimateFee({ opreturnData }) {
    let p2pkhInputNum = 1;
    let p2pkhOutputNum = 1;
    p2pkhInputNum = 10; //支持10输入的费用

    const sizeOfNft = 3514;
    let size =
      4 +
      1 +
      p2pkhInputNum * (32 + 4 + 1 + 107 + 4) +
      (32 + 4 + 3 + sizeOfNft + 100 + 4) +
      1 +
      (8 + 3 + sizeOfNft) +
      (opreturnData ? 8 + 3 + opreturnData.toString().length / 2 : 0) +
      p2pkhOutputNum * (8 + 1 + 25) +
      4;

    let dust = 0;
    let fee = Math.ceil(size * this.feeb) + dust;
    return fee;
  }
}