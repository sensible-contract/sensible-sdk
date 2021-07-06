import { Bytes, Int, toHex } from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import { SigHashInfo, SigInfo } from "../common/utils";
import {
  API_NET,
  API_TARGET,
  FungibleTokenUnspent,
  SensibleApi,
} from "../sensible-api";
import {
  ContractUtil,
  Token,
  TokenGenesis,
  TokenTransferCheck,
  TOKEN_TRANSFER_TYPE,
} from "./contractUtil";
import {
  FtUtxo,
  FungibleToken,
  sighashType,
  SIGNER_NUM,
  SIGNER_VERIFY_NUM,
  Utxo,
} from "./FungibleToken";
import * as TokenProto from "./tokenProto";
const $ = bsv.util.preconditions;
const _ = bsv.deps._;
const defaultSignerConfigs: SignerConfig[] = [
  {
    satotxApiPrefix: "https://s1.satoplay.cn,https://s1.satoplay.com",
    satotxPubKey:
      "2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455",
  },
  {
    satotxApiPrefix: "https://satotx.showpay.top",
    satotxPubKey:
      "5b94858991d384c61ffd97174e895fcd4f62e4fea618916dc095fe4c149bbdf1188c9b33bc15cbe963a63b2522e70b80a5b722ac0e6180407917403755df4de27d69cc115c683a99face8c823cbccf73c7f0d546f1300b9ee2e96aea85542527f33b649f1885caebe19cf75d9a645807f03565c65bd4c99c8f6bb000644cfb56969eac3e9331c254b08aa279ceb64c47ef66be3f071e28b3a5a21e48cdfc3335d8b52e80a09a104a791ace6a2c1b4da88c52f9cc28c54a324e126ec91a988c1fe4e21afc8a84d0e876e01502386f74e7fc24fc32aa249075dd222361aea119d4824db2a797d58886e93bdd60556e504bb190b76a451a4e7b0431973c0410e71e808d0962415503931bbde3dfce5186b371c5bf729861f239ef626b7217d071dfd62bac877a847f2ac2dca07597a0bb9dc1969bed40606c025c4ff7b53a4a6bd921642199c16ede8165ed28da161739fa8d33f9f483212759498c1219d246092d14c9ae63808f58f03c8ca746904ba51fa326d793cea80cda411c85d35894bdb5",
  },
  {
    satotxApiPrefix: "https://satotx.volt.id",
    satotxPubKey:
      "3a62ce90c189ae322150cfc68cd00739cd681babf46a9b27793413ad780ea7c4ef22afd0042bc3711588587c2b8a953ced78496cb95579b1272b8979183ea3c66d204c8eeffebfa115c596c0c561f3569fe6d6e8e06d7e82192a24a84b739838ac846db8594a565679d617695f184eb85a3902a036eb8e82f95b83acc207f0deeac87291539865765899d97cfe41169c555480372195729269ae30b6c39324a6731d6f4e46da5ba1789c6e9bd14b16426d35fd4449eecd177e2834e87fb65d9d469176ffe0c12097fcc7e2393dbaa504631487a3ad725235b4d25fe3d09c2460f8a6c0bf4defc1ffe65d5fa28e85fae11eace2a66e48a0ae2ed6bcfb4bb94296717a4a5b1b3fa9b0fb3c165e517b9b69fa8aaca7fdc7351a0ac14d110258f442f423a780bebd87ac10173ca00ee4e9f56ced0510e7f53ed41411b91286f288438c361d2a15868d1c84d6a73510ef23eee9312ae2a7162c1fcd5438788236c0571ee822c326ebd123b8a6636e7b192db2911725a20da027bfaa79c33f58174285",
  },
  {
    satotxApiPrefix: "https://satotx.metasv.com",
    satotxPubKey:
      "19d9193ee2e95d09445d28408e8a3da730b2d557cd8d39a7ae4ebbfbceb17ed5d745623529ad33d043511f3e205c1f92b6322833424d19823c3b611b3adabb74e1006e0e93a8f1e0b97ab801c6060a4c060f775998d9f003568ab4ea7633a0395eb761c36106e229394f2c271b8522a44a5ae759254f5d22927923ba85b3729460ecccca07a5556299aa7f2518814c74a2a4d48b48013d609002631f2d93c906d07077ef58d473e3d971362d1129c1ab9b8f9b1365519f0c023c1cadad5ab57240d19e256e08022fd0708951ff90a8af0655aff806c6382d0a72c13f1e52b88222d7dfc6357179b06ffcf937f9da3b0419908aa589a731e26bbaba2fa0b754bf722e338c5627b11dc24aadc4d83c35851c034936cf0df18167e856a5f0a7121d23cd48b3f8a420869a37bd1362905d7f76ff18a991f75a0f9d1bcfc18416d76691cc357cbdcc8cc0df9dbd9318a40e08adb2fb4e78b3c47bdf07eeed4f3f4e0f7e81e37460a09b857e0194c72ec03bb564b5b409d8a1b84c153186ecbb4cfdfd",
  },
  {
    satotxApiPrefix: "https://satotx.tswap.io",
    satotxPubKey:
      "a36531727b324b34baef257d223b8ba97bac06d6b631cccb271101f20ef1de2523a0a3a5367d89d98ff354fe1a07bcfb00425ab252950ce10a90dc9040930cf86a3081f0c68ea05bfd40aab3e8bfaaaf6b5a1e7a2b202892dc9b1c0fe478210799759b31ee04e842106a58d901eb5bc538c1b58b7eb774a382e7ae0d6ed706bb0b12b9b891828da5266dd9f0b381b05ecbce99fcde628360d281800cf8ccf4630b2a0a1a25cf4d103199888984cf61edaa0dad578b80dbce25b3316985a8f846ada9bf9bdb8c930e2a43e69994a9b15ea33fe6ee29fa1a6f251f8d79a5de9f1f24152efddedc01b63e2f2468005ecce7da382a64d7936b22a7cac697e1b0a48419101a802d3be554a9b582a80e5c5d8b998e5eb9684c7aaf09ef286d3d990c71be6e3f3340fdaeb2dac70a0be928b6de6ef79f353c868def3385bccd36aa871eb7c8047d3f10b0a38135cdb3577eaafa512111a7af088e8f77821a27b195c95bf80da3c59fda5ff3dd1d40f60d61c099a608b58b6de4a76146cf7b89444c1055",
  },
];

ContractUtil.init();

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
    genesis.length == 40,
    `Invalid Argument: genesis.length must be 40`
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
 * 解析sensibleID的值
 * @param genesis
 * @returns
 */
function parseSensibleID(sensibleID: string) {
  let sensibleIDBuf = Buffer.from(sensibleID, "hex");
  let genesisTxId = sensibleIDBuf.slice(0, 32).reverse().toString("hex");
  let genesisOutputIndex = sensibleIDBuf.readUIntLE(32, 4);
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
      signers.map((v) => BN.fromString(v.satotxPubKey, 16))
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
    let retPromises = [];
    const SIGNER_TIMEOUT = 99999;
    for (let i = 0; i < _signerConfigs.length; i++) {
      let signerConfig = _signerConfigs[i];
      let subArray = signerConfig.satotxApiPrefix.split(",");
      let ret = new Promise(
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
      retPromises.push(ret);
    }

    let results = [];
    for (let i = 0; i < _signerConfigs.length; i++) {
      let signerConfig = _signerConfigs[i];
      let ret = await retPromises[i];
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
  ): Promise<{ utxos: Utxo[]; utxoPrivateKeys: bsv.PrivateKey[] }> {
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
  ): Promise<{ ftUtxos: FtUtxo[]; ftUtxoPrivateKeys: bsv.PrivateKey[] }> {
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
        tokenAmount: new BN(v.tokenAmount.toString()),
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
    tx: bsv.Transaction;
    sensibleId: string;
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
    let { codehash, genesis, sensibleId, tx } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress: changeAddress as bsv.Address,
      opreturnData,
      genesisPublicKey,
    });

    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: tx.id, tx, codehash, genesis, sensibleId };
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
    tx: bsv.Transaction;
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
      changeAddress: changeAddress as bsv.Address,
      opreturnData,
      genesisPublicKey,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: bsv.Transaction.Input, inputIndex: number) => {
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
    utxos?: Utxo[];
    utxoPrivateKeys?: bsv.PrivateKey[];
    changeAddress?: bsv.Address;
    opreturnData?: any;
    genesisPublicKey: bsv.PublicKey;
  }) {
    //create genesis contract
    let genesisContract = TokenGenesis.createContract(genesisPublicKey, {
      tokenName,
      tokenSymbol,
      decimalNum,
      rabinPubKeyHashArrayHash: toHex(this.ft.rabinPubKeyHashArrayHash),
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
    let genesis: string, codehash: string, sensibleId: string;
    {
      let genesisTxId = tx.id;
      let genesisOutputIndex = 0;
      let tokenContract = Token.createContract(
        genesisTxId,
        genesisOutputIndex,
        genesisContract.lockingScript,
        this.ft.transferCheckCodeHashArray,
        this.ft.unlockContractCodeHashArray,
        {
          receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
          tokenAmount: BN.Zero,
        }
      );
      let scriptBuf = tokenContract.lockingScript.toBuffer();
      genesis = toHex(TokenProto.getTokenID(scriptBuf));
      codehash = Utils.getCodeHash(tokenContract.lockingScript);
      sensibleId = toHex(TokenProto.getSensibleIDBuf(scriptBuf));
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

    return { tx, genesis, codehash, sensibleId };
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
    sensibleId,
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
    sensibleId: string;
    genesisWif: string;
    receiverAddress: string | bsv.Address;
    tokenAmount: string | BN;
    allowIncreaseIssues: boolean;
    utxos?: any;
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
    noBroadcast?: boolean;
  }): Promise<{ txHex: string; txid: string; tx: bsv.Transaction }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    $.checkArgument(sensibleId, "sensibleId is required");
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
    tokenAmount = new BN(tokenAmount.toString());
    let { tx } = await this._issue({
      genesis,
      codehash,
      sensibleId,
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
    sensibleId,
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
    sensibleId: string;
    genesisPublicKey: string | bsv.PublicKey;
    receiverAddress: string | bsv.Address;
    tokenAmount: string | BN;
    allowIncreaseIssues?: boolean;
    utxos?: any;
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
  }): Promise<{ tx: bsv.Transaction; sigHashList: SigHashInfo[] }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    $.checkArgument(sensibleId, "sensibleId is required");
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
    tokenAmount = new BN(tokenAmount.toString());
    let { tx } = await this._issue({
      genesis,
      codehash,
      sensibleId,
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
    tx.inputs.forEach((input: bsv.Transaction.Input, inputIndex: number) => {
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
    sensibleId,
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
    sensibleId: string;
    receiverAddress: bsv.Address;
    tokenAmount: BN;
    allowIncreaseIssues: boolean;
    utxos?: Utxo[];
    utxoPrivateKeys?: bsv.PrivateKey[];
    changeAddress?: bsv.Address;
    opreturnData?: any;
    noBroadcast?: boolean;
    genesisPrivateKey?: bsv.PrivateKey;
    genesisPublicKey: bsv.PublicKey;
  }) {
    //构造发行合约
    let genesisContract = TokenGenesis.createContract(genesisPublicKey);
    let genesisContractCodehash = Utils.getCodeHash(
      genesisContract.lockingScript
    );

    //寻找发行用的UTXO
    let spendByTxId;
    let spendByOutputIndex;
    let { genesisTxId, genesisOutputIndex } = parseSensibleID(sensibleId);

    let firstGenesisTxHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let firstGenesisTx = new bsv.Transaction(firstGenesisTxHex);

    let scriptBuffer = firstGenesisTx.outputs[
      genesisOutputIndex
    ].script.toBuffer();
    let _dataPartObj = TokenProto.parseDataPart(scriptBuffer);
    _dataPartObj.sensibleID = { txid: genesisTxId, index: genesisOutputIndex };

    let newScriptBuf = TokenProto.updateScript(scriptBuffer, _dataPartObj);
    let issueGenesis = toHex(TokenProto.getTokenID(newScriptBuf));
    let issueUtxos = await this.sensibleApi.getFungibleTokenUnspents(
      genesisContractCodehash,
      issueGenesis,
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

    let estimateSatoshis = await this.getIssueEstimateFee({
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
    genesisContract.setDataPart(toHex(dataPart));
    let tokenContract = Token.createContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      this.ft.transferCheckCodeHashArray,
      this.ft.unlockContractCodeHashArray,
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
  private async supplyFtUtxosInfo(
    ftUtxos: FtUtxo[],
    codehash: string,
    genesis: string
  ) {
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
            let tokenID = TokenProto.getTokenID(
              lockingScript.toBuffer()
            ).toString("hex");
            if (tokenID == genesis) {
              return true;
            }
            let dataPartObj = TokenProto.parseDataPart(lockingScriptBuf);
            dataPartObj.sensibleID = curDataPartObj.sensibleID;
            const newScriptBuf = TokenProto.updateScript(
              lockingScriptBuf,
              dataPartObj
            );
            let genesisHash = toHex(
              bsv.crypto.Hash.sha256ripemd160(newScriptBuf)
            );
            if (genesisHash == curDataPartObj.genesisHash) {
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
      v.preTokenAmount = new BN(v.preTokenAmount.toString());
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
    tx: bsv.Transaction;
    txHex: string;
    txid: string;
    routeCheckTx: bsv.Transaction;
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
    routeCheckTx: bsv.Transaction;
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
    routeCheckTx.inputs.forEach(
      (input: bsv.Transaction.Input, inputIndex: number) => {
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
      }
    );

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
    ftPrivateKeys: bsv.PrivateKey[];
    ftChangeAddress: bsv.Address;

    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;

    middlePrivateKey?: bsv.PrivateKey;
    middleChangeAddress: bsv.Address;

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
      tokenAmount: new BN(v.amount.toString()),
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
    await this.supplyFtUtxosInfo(ftUtxos, codehash, genesis);

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
    let inputLength = ftUtxos.length;
    let outputLength = tokenOutputArray.length;
    let tokenTransferType = TokenTransferCheck.getOptimumType(
      inputLength,
      outputLength
    );
    if (tokenTransferType == TOKEN_TRANSFER_TYPE.UNSUPPORT) {
      throw new Error("Too many token-utxos, should merge them to continue.");
    }

    let estimateSatoshis = this._calTransferSize({
      p2pkhInputNum: utxos.length,
      inputTokenNum: inputLength,
      outputTokenNum: outputLength,
      tokenTransferType,
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

    //create routeCheck contract
    let tokenTransferCheckContract = TokenTransferCheck.createContract(
      tokenTransferType,
      ftUtxos,
      tokenOutputArray,
      TokenProto.getTokenID(tokenLockingScript.toBuffer()),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    let routeCheckTx = this.ft.createRouteCheckTx({
      utxos,
      changeAddress: middleChangeAddress,
      feeb: this.feeb,
      tokenTransferCheckContract,
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

    let rabinPubKeyVerifyArray: Int[] = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = this.signerSelecteds[j];
      rabinPubKeyVerifyArray.push(this.ft.rabinPubKeyArray[signerIndex]);
    }
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
      rabinPubKeyVerifyArray,
      checkRabinMsgArray,
      checkRabinPaddingArray,
      checkRabinSigArray,
      tokenOutputArray,
      tokenRabinDatas,
      tokenTransferCheckContract,
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
  public async unsignTransfer(routeCheckTx: bsv.Transaction) {
    let transferPart2 = this.transferPart2;
    transferPart2.routeCheckTx = routeCheckTx;
    transferPart2.utxos.forEach((v) => {
      v.txId = routeCheckTx.id;
    });
    let tx = await this.ft.createTransferTx(transferPart2);

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: bsv.Transaction.Input, inputIndex: number) => {
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
    return BN.fromString(balance, 10)
      .add(BN.fromString(pendingBalance, 10))
      .toString();
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

    const sizeOfTokenGenesis = TokenGenesis.getLockingScriptSize();
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

    const tokenGenesisLockingSize = TokenGenesis.getLockingScriptSize();
    const tokenLockingSize = Token.getLockingScriptSize();

    let tokenGenesisUnlockingSize = TokenGenesis.calUnlockingScriptSize(
      opreturnData
    );
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
  public sign(
    tx: bsv.Transaction,
    sigHashList: SigHashInfo[],
    sigList: SigInfo[]
  ) {
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

  private _calTransferSize({
    p2pkhInputNum = 10,
    inputTokenNum,
    outputTokenNum,
    tokenTransferType,
    opreturnData,
  }) {
    let sumFee = 0;

    let p2pkhUnlockingSize = 32 + 4 + 1 + 107 + 4;
    let p2pkhLockingSize = 8 + 1 + 25;
    let dummyTransferCheckContract = TokenTransferCheck.getDummyInstance(
      tokenTransferType
    );
    let routeCheckLockingSize = TokenTransferCheck.getLockingScriptSize(
      tokenTransferType
    );
    let routeCheckUnlockingSize = TokenTransferCheck.calUnlockingScriptSize(
      tokenTransferType,
      p2pkhInputNum,
      inputTokenNum,
      outputTokenNum,
      opreturnData
    );
    let tokenUnlockingSize = Token.calUnlockingScriptSize(
      dummyTransferCheckContract,
      p2pkhInputNum,
      inputTokenNum,
      outputTokenNum
    );
    let tokenLockingSize = Token.getLockingScriptSize();
    //routeCheck tx
    sumFee +=
      (4 +
        p2pkhUnlockingSize * p2pkhInputNum +
        11 +
        routeCheckLockingSize +
        11 +
        p2pkhLockingSize +
        4) *
        this.feeb +
      Utils.getDustThreshold(routeCheckLockingSize);

    //transfer tx
    sumFee +=
      (4 +
        43 +
        p2pkhUnlockingSize +
        43 +
        tokenUnlockingSize * inputTokenNum +
        43 +
        routeCheckUnlockingSize +
        (11 + tokenLockingSize) * outputTokenNum +
        p2pkhLockingSize +
        4) *
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

  public isSupportedToken(codehash: string): boolean {
    return codehash == ContractUtil.tokenCodeHash;
  }

  /**
   * 计算代币的codehash和genesis
   * @param genesisTx genesis的tx
   * @param genesisOutputIndex (可选)genesis的outputIndex，默认为0
   * @returns
   */
  public getCodehashAndGensisByTx(
    genesisTx: bsv.Transaction,
    genesisOutputIndex: number = 0
  ) {
    let genesis: string;
    let codehash: string;
    let sensibleId: string;

    let genesisTxId = genesisTx.id;
    let tokenContract = Token.createContract(
      genesisTxId,
      genesisOutputIndex,
      genesisTx.outputs[genesisOutputIndex].script,
      this.ft.transferCheckCodeHashArray,
      this.ft.unlockContractCodeHashArray,
      {
        receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
        tokenAmount: BN.Zero,
      }
    );
    let scriptBuf = tokenContract.lockingScript.toBuffer();
    genesis = toHex(TokenProto.getTokenID(scriptBuf));
    codehash = Utils.getCodeHash(tokenContract.lockingScript);
    sensibleId = toHex(TokenProto.getSensibleIDBuf(scriptBuf));

    return { codehash, genesis, sensibleId };
  }
}
