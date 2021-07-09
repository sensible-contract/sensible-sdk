import { Bytes, Int, toHex } from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import * as $ from "../common/argumentCheck";
import { DustCalculator } from "../common/DustCalculator";
import { CodeError, ErrCode } from "../common/error";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import { SizeTransaction } from "../common/SizeTransaction";
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import { SigHashInfo, SigInfo } from "../common/utils";
import {
  API_NET,
  API_TARGET,
  NonFungibleTokenUnspent,
  SensibleApi,
  SensibleApiBase,
} from "../sensible-api";
import {
  ContractUtil,
  genesisTokenIDTxid,
  Nft,
  NftGenesis,
} from "./contractUtil";
import * as NftProto from "./nftProto";
import { SIGNER_VERIFY_NUM } from "./nftProto";
import {
  NftUtxo,
  NonFungibleToken,
  sighashType,
  Utxo,
} from "./NonFungibleToken";
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
  wif?: string;
  address?: any;
};
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

function checkParamUtxoFormat(utxo) {
  if (utxo) {
    if (!utxo.txId || !utxo.satoshis || !utxo.wif) {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        `UtxoFormatError-valid format example :{
				txId:'85f583e7a8e8b9cf86e265c2594c1e4eb45db389f6781c3b1ec9aa8e48976caa',
				satoshis:1000,
				outputIndex:1,
				wif:'L3J1A6Xyp7FSg9Vtj3iBKETyVpr6NibxUuLhw3uKpUWoZBLkK1hk'
			}`
      );
    }
  }
}

function checkParamSigners(signers) {
  if (signers.length != 5) {
    throw new CodeError(ErrCode.EC_INVALID_ARGUMENT, "only support 5 signers");
  }
  let signer = signers[0];
  if (
    Utils.isNull(signer.satotxApiPrefix) ||
    Utils.isNull(signer.satotxPubKey)
  ) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `SignerFormatError-valid format example :
    signers:[{
			satotxApiPrefix: "https://api.satotx.com",
    	satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
		},...]`
    );
  }
}

function checkParamNetwork(network) {
  if (!["mainnet", "testnet"].includes(network)) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `NetworkFormatError:only support 'mainnet' and 'testnet' but value is ${network}`
    );
  }
}

function checkParamGenesis(genesis) {
  if (typeof genesis != "string" || genesis.length != 72) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `GenesisFormatError:genesis should be a string with 72 length `
    );
  }
}

function checkParamCodehash(codehash) {
  if (typeof codehash != "string" || codehash.length != 40) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `CodehashFormatError:codehash should be a string with 40 length `
    );
  }
  $.checkArgument(
    codehash == ContractUtil.tokenCodeHash,
    `a valid codehash should be ${ContractUtil.tokenCodeHash}, but the provided is ${codehash} `
  );
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
type MockData = {
  sensibleApi: SensibleApiBase;
  satotxSigners: SatotxSigner[];
};

type Purse = {
  privateKey: bsv.PrivateKey;
  address: bsv.Address;
};
/**
Sensible Non Fungible Token
感应合约非同质化代币
 */
export class SensibleNFT {
  private signers: SatotxSigner[];
  private feeb: number;
  private network: API_NET;
  private mock: boolean;
  private purse: Purse;
  public sensibleApi: SensibleApiBase;
  private zeroAddress: bsv.Address;
  private nft: NonFungibleToken;
  private debug: boolean;
  private signerSelecteds: number[] = [];
  private dustCalculator: DustCalculator;
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
    purse,
    debug = false,
    apiTarget = API_TARGET.SENSIBLE,
    mockData,
    dustLimitFactor = 300,
    dustAmount,
  }: {
    signers: SignerConfig[];
    signerSelecteds?: number[];
    feeb: number;
    network: API_NET;
    purse: string;
    debug: boolean;
    apiTarget?: API_TARGET;
    mockData?: MockData;
    dustLimitFactor?: number;
    dustAmount?: number;
  }) {
    checkParamNetwork(network);
    if (mockData) {
      this.signers = mockData.satotxSigners;
    } else {
      checkParamSigners(signers);
      this.signers = signers.map(
        (v) => new SatotxSigner(v.satotxApiPrefix, v.satotxPubKey)
      );
    }

    this.feeb = feeb;
    this.network = network;
    if (mockData) {
      this.sensibleApi = mockData.sensibleApi;
    } else {
      this.sensibleApi = new SensibleApi(network, apiTarget);
    }

    this.debug = debug;

    this.dustCalculator = new DustCalculator(dustLimitFactor, dustAmount);

    if (network == API_NET.MAIN) {
      this.zeroAddress = new bsv.Address("1111111111111111111114oLvT2");
    } else {
      this.zeroAddress = new bsv.Address("mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8");
    }

    this.nft = new NonFungibleToken(
      this.signers.map((v) => BN.fromString(v.satotxPubKey, 16))
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
        throw new CodeError(
          ErrCode.EC_INVALID_ARGUMENT,
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

  public setDustThreshold({
    dustLimitFactor,
    dustAmount,
  }: {
    dustLimitFactor?: number;
    dustAmount?: number;
  }) {
    this.dustCalculator.dustAmount = dustAmount;
    this.dustCalculator.dustLimitFactor = dustLimitFactor;
  }

  public getDustThreshold(size: number) {
    return this.dustCalculator.getDustThreshold(size);
  }
  private async _pretreatUtxos(
    paramUtxos: ParamUtxo[]
  ): Promise<{ utxos: Utxo[]; utxoPrivateKeys: bsv.PrivateKey[] }> {
    let utxoPrivateKeys = [];
    let utxos: Utxo[] = [];
    //如果没有传utxos，则由purse提供
    if (!paramUtxos) {
      if (!this.purse)
        throw new CodeError(
          ErrCode.EC_INVALID_ARGUMENT,
          "Utxos or Purse must be provided."
        );
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

    if (utxos.length == 0)
      throw new CodeError(ErrCode.EC_INSUFFICENT_BSV, "Insufficient balance.");
    return { utxos, utxoPrivateKeys };
  }

  private async _pretreatNftUtxo(
    tokenIndex: string,
    codehash?: string,
    genesis?: string,
    senderPrivateKey?: bsv.PrivateKey,
    senderPublicKey?: bsv.PublicKey
  ): Promise<{ nftUtxo: NftUtxo; nftUtxoPrivateKey: bsv.PrivateKey }> {
    if (senderPrivateKey) {
      senderPublicKey = senderPrivateKey.toPublicKey();
    }

    let _res = await this.sensibleApi.getNonFungibleTokenUnspentDetail(
      codehash,
      genesis,
      tokenIndex
    );
    let nftUtxo: NftUtxo = {
      txId: _res.txId,
      outputIndex: _res.outputIndex,
      nftAddress: new bsv.Address(_res.tokenAddress, this.network),
      publicKey: senderPublicKey,
    };

    return { nftUtxo, nftUtxoPrivateKey: senderPrivateKey };
  }

  /**
   * 构造genesis交易
   * @param genesisWif 发行私钥
   * @param totalSupply 最大发行量,8字节
   * @param opreturnData (可选)追加一个opReturn输出
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)找零地址
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async genesis({
    genesisWif,
    totalSupply,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,
  }: {
    genesisWif: string | bsv.PrivateKey;
    totalSupply: string | BN;
    opreturnData?: string | Buffer | any[];
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;
  }): Promise<{
    codehash: string;
    genesis: string;
    txid: string;
    txHex: string;
    tx: bsv.Transaction;
  }> {
    const genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    const genesisPublicKey = genesisPrivateKey.toPublicKey();

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    totalSupply = new BN(totalSupply.toString());

    let { tx, codehash, genesis } = await this._genesis({
      genesisPublicKey,
      totalSupply,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });
    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { codehash, genesis, tx, txid: tx.id, txHex };
  }

  /**
   * 构造(未签名的)genesis交易
   * @param genesisPublicKey 发行公钥
   * @param totalSupply 最大发行量,8字节
   * @param opreturnData (可选)追加一个opReturn输出
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)找零地址
   * @returns
   */
  public async unsignGenesis({
    genesisPublicKey,
    totalSupply,
    opreturnData,
    utxos,
    changeAddress,
  }: {
    genesisPublicKey: string | bsv.PublicKey;
    totalSupply: string | BN;
    opreturnData?: any;
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
  }): Promise<{
    tx: bsv.Transaction;
    sigHashList: SigHashInfo[];
  }> {
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    totalSupply = new BN(totalSupply.toString());

    let { tx, codehash, genesis } = await this._genesis({
      genesisPublicKey,
      totalSupply,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = utxoInfo.utxos[inputIndex].address.toString();
      let isP2PKH = true;

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

  private async _genesis({
    genesisPublicKey,
    totalSupply,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
  }: {
    genesisPublicKey: bsv.PublicKey;
    totalSupply: BN;
    opreturnData?: any;
    utxos?: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress?: bsv.Address;
  }): Promise<{
    tx: bsv.Transaction;
    genesis: string;
    codehash: string;
  }> {
    let genesisContract = NftGenesis.createContract(genesisPublicKey, {
      totalSupply,
      rabinPubKeyHashArrayHash: toHex(this.nft.rabinPubKeyHashArrayHash),
    });
    let tx = this.nft.createGenesisTx({
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
      let tokenContract = Nft.createContract(
        genesisTxId,
        genesisOutputIndex,
        genesisContract.lockingScript,
        this.nft.unlockContractCodeHashArray,
        {
          receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
          tokenIndex: BN.One,
        }
      );
      let scriptBuf = tokenContract.lockingScript.toBuffer();
      codehash = Utils.getCodeHash(tokenContract.lockingScript);
      genesis = toHex(NftProto.getSensibleIDBuf(scriptBuf));
    }

    this._checkTxFeeRate(tx);
    return { tx, genesis, codehash };
  }

  /**
   * 构造一笔铸造NFT的交易
   * @param genesis NFT的genesis
   * @param codehash NFT的codehash
   * @param genesisWif 发行私钥wif
   * @param metaTxId NFTState
   * @param opreturnData (可选)追加一个opReturn输出
   * @param receiverAddress 接受者的地址
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns {Object} {txid,tokenIndex}
   */
  public async issue({
    genesis,
    codehash,
    genesisWif,
    receiverAddress,
    metaTxId,
    metaOutputIndex,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,
  }: {
    genesis: string;
    codehash: string;
    genesisWif: string;
    receiverAddress: string | bsv.Address;
    metaTxId?: string;
    metaOutputIndex?: number;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;
  }): Promise<{
    txHex: string;
    txid: string;
    tx: bsv.Transaction;
    tokenIndex: string;
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    const genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    const genesisPublicKey = genesisPrivateKey.toPublicKey();
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { tx, tokenIndex } = await this._issue({
      genesis,
      codehash,
      genesisPrivateKey,
      genesisPublicKey,
      receiverAddress,
      metaTxId,
      metaOutputIndex,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress: changeAddress,
    });

    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }

    return { txHex, txid: tx.id, tx, tokenIndex };
  }

  /**
   * 构造(未签名的)发行交易
   * @param genesis NFT的genesis
   * @param codehash NFT的codehash
   * @param genesisPublicKey 发行公钥
   * @param receiverAddress 接收地址
   * @param metaTxId NFT状态节点，推荐用metaid
   * @param opreturnData (可选)追加一个opReturn输出
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)找零地址
   * @returns
   */
  public async unsignIssue({
    genesis,
    codehash,
    genesisPublicKey,
    receiverAddress,
    metaTxId,
    metaOutputIndex,
    opreturnData,
    utxos,
    changeAddress,
  }: {
    genesis: string;
    codehash: string;
    genesisPublicKey: string | bsv.PublicKey;
    receiverAddress: string | bsv.Address;
    metaTxId?: string;
    metaOutputIndex?: number;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
  }): Promise<{
    tx: bsv.Transaction;
    sigHashList: SigHashInfo[];
    tokenIndex: string;
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { tx, tokenIndex } = await this._issue({
      genesis,
      codehash,
      genesisPublicKey,
      receiverAddress,
      metaTxId,
      metaOutputIndex,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress: changeAddress,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = "";
      let isP2PKH: boolean;
      if (inputIndex == 0) {
        let pubkey = genesisPublicKey as bsv.PublicKey;
        address = pubkey.toAddress(this.network).toString();
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

    return { tx, sigHashList, tokenIndex };
  }

  private async getIssueUtxo(
    codehash: string,
    genesisTxId: string,
    genesisOutputIndex: number
  ): Promise<NonFungibleTokenUnspent> {
    let originGenesis = Buffer.alloc(36, 0).toString("hex");
    let genesisUtxos = await this.sensibleApi.getNonFungibleTokenUnspents(
      codehash,
      originGenesis,
      this.zeroAddress.toString()
    );
    let genesisUtxo = genesisUtxos.find((v) => v.txId == genesisTxId);
    if (genesisUtxo) {
      return genesisUtxo;
    }

    let issueGenesis = toHex(
      TokenUtil.getOutpointBuf(genesisTxId, genesisOutputIndex)
    );
    let issueUtxos = await this.sensibleApi.getNonFungibleTokenUnspents(
      codehash,
      issueGenesis,
      this.zeroAddress.toString()
    );
    if (issueUtxos.length > 0) {
      return issueUtxos[0];
    }
  }

  private async _prepareIssueUtxo({
    genesis,
    genesisPublicKey,
  }: {
    genesis: string;
    genesisPublicKey: bsv.PublicKey;
  }) {
    let genesisContract = NftGenesis.createContract(genesisPublicKey);
    let genesisContractCodehash = Utils.getCodeHash(
      genesisContract.lockingScript
    );

    let { genesisTxId, genesisOutputIndex } = parseSensibleID(genesis);
    let issueUtxo = await this.getIssueUtxo(
      genesisContractCodehash,
      genesisTxId,
      genesisOutputIndex
    );

    if (!issueUtxo) {
      throw new CodeError(
        ErrCode.EC_FIXED_TOKEN_SUPPLY,
        "token supply is fixed"
      );
    }

    //Get preTx
    let spendByTxId = issueUtxo.txId;
    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);
    const spendByTx = new bsv.Transaction(spendByTxHex);

    let genesisUtxo = {
      txId: issueUtxo.txId,
      outputIndex: issueUtxo.outputIndex,
      satoshis: spendByTx.outputs[issueUtxo.outputIndex].satoshis,
      script: spendByTx.outputs[issueUtxo.outputIndex].script,
    };

    return {
      genesisContract,
      genesisTxId,
      genesisOutputIndex,
      genesisUtxo,
    };
  }
  private async _issue({
    genesis,
    codehash,
    genesisPrivateKey,
    genesisPublicKey,
    receiverAddress,
    metaTxId,
    metaOutputIndex,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
  }: {
    genesis: string;
    codehash: string;
    genesisPrivateKey?: bsv.PrivateKey;
    genesisPublicKey: bsv.PublicKey;
    receiverAddress: bsv.Address;
    metaTxId: string;
    metaOutputIndex: number;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys?: bsv.PrivateKey[];
    changeAddress: bsv.Address;
  }): Promise<{ tx: bsv.Transaction; tokenIndex: string }> {
    let {
      genesisContract,
      genesisTxId,
      genesisOutputIndex,
      genesisUtxo,
    } = await this._prepareIssueUtxo({ genesis, genesisPublicKey });

    let spendByTxId = genesisUtxo.txId;

    //get preTx
    let spendByTxHex = await this.sensibleApi.getRawTxData(spendByTxId);
    const spendByTx = new bsv.Transaction(spendByTxHex);
    let preUtxoTxId = spendByTx.inputs[0].prevTxId.toString("hex");
    let preUtxoOutputIndex = spendByTx.inputs[0].outputIndex;
    let preUtxoTxHex = await this.sensibleApi.getRawTxData(preUtxoTxId);

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance == 0)
      throw new CodeError(ErrCode.EC_INSUFFICENT_BSV, "Insufficient balance.");

    let estimateSatoshis = await this._calIssueEstimateFee({
      genesisUtxoSatoshis: genesisUtxo.satoshis,
      opreturnData,
      utxoMaxCount: utxos.length,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    //构造token合约
    let dataPartObj = NftProto.parseDataPart(genesisUtxo.script.toBuffer());
    const dataPart = NftProto.newDataPart(dataPartObj);
    genesisContract.setDataPart(toHex(dataPart));
    const isFirstGenesis = dataPartObj.sensibleID.txid == genesisTokenIDTxid;

    let rabinMsg: Bytes;
    let rabinPaddingArray: Bytes[] = [];
    let rabinSigArray: Int[] = [];
    let rabinPubKeyIndexArray: number[] = [];
    if (isFirstGenesis) {
      rabinMsg = new Bytes("00");
      for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
        rabinPaddingArray.push(new Bytes("00"));
        rabinSigArray.push(new Int("0"));
        rabinPubKeyIndexArray.push(i);
      }
    } else {
      for (let i = 0; i < this.signerSelecteds.length; i++) {
        try {
          let idx = this.signerSelecteds[i];
          let sigInfo = await this.signers[idx].satoTxSigUTXOSpendBy({
            index: preUtxoOutputIndex,
            txId: preUtxoTxId,
            txHex: preUtxoTxHex,
            byTxId: spendByTxId,
            byTxHex: spendByTxHex,
          });
          rabinMsg = new Bytes(sigInfo.payload);
          rabinPaddingArray.push(new Bytes(sigInfo.padding));
          rabinSigArray.push(
            new Int(BN.fromString(sigInfo.sigBE, 16).toString(10))
          );
        } catch (e) {
          console.log(e);
        }
      }
      rabinPubKeyIndexArray = this.signerSelecteds;
    }
    let rabinPubKeyArray = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = rabinPubKeyIndexArray[j];
      rabinPubKeyArray.push(this.nft.rabinPubKeyArray[signerIndex]);
    }

    let tokenContract = Nft.createContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      this.nft.unlockContractCodeHashArray,
      {
        receiverAddress,
        tokenIndex: dataPartObj.tokenIndex,
        metaTxId,
        metaOutputIndex,
      }
    );

    //构造发行交易
    let tx = this.nft.createIssueTx({
      genesisContract,
      genesisUtxo,
      opreturnData,
      utxos,
      changeAddress,
      feeb: this.feeb,
      tokenContract,

      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      rabinPubKeyIndexArray,
      rabinPubKeyArray,

      genesisPrivateKey,
      utxoPrivateKeys,
      debug: this.debug,
    });

    this._checkTxFeeRate(tx);
    return { tx, tokenIndex: dataPartObj.tokenIndex.toString(10) };
  }

  /**
   * 构造一笔转移NFT的交易并进行广播
   * @param genesis NFT的genesis
   * @param codehash NFT的genesis
   * @param tokenIndex NFT的tokenIndex
   * @param senderWif 发送者私钥wif
   * @param receiverAddress 接受者的地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @param noBroadcast (可选)是否不广播交易，默认false
   * @returns
   */
  public async transfer({
    genesis,
    codehash,
    tokenIndex,

    senderWif,
    senderPrivateKey,
    senderPublicKey,

    receiverAddress,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    senderWif?: string;
    senderPrivateKey?: string | bsv.PrivateKey;
    senderPublicKey?: string | bsv.PublicKey;
    receiverAddress: string | bsv.Address;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;
  }): Promise<{ tx: bsv.Transaction; txid: string; txHex: string }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    if (senderWif) {
      senderPrivateKey = new bsv.PrivateKey(senderWif);
      senderPublicKey = senderPrivateKey.publicKey;
    } else if (senderPrivateKey) {
      senderPrivateKey = new bsv.PrivateKey(senderPrivateKey);
      senderPublicKey = senderPrivateKey.publicKey;
    } else {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxo(
      tokenIndex,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey
    );

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { tx } = await this._transfer({
      genesis,
      codehash,
      nftUtxo: nftInfo.nftUtxo,
      nftPrivateKey: nftInfo.nftUtxoPrivateKey,
      receiverAddress,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });

    let txHex = tx.serialize(true);
    if (!noBroadcast && !this.mock) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { tx, txHex, txid: tx.id };
  }

  /**
   * 构造一笔转移NFT的交易
   * @param genesis NFT的genesis
   * @param codehash NFT的genesis
   * @param tokenIndex NFT的tokenIndex
   * @param senderPublicKey 发送者公钥
   * @param receiverAddress 接受者的地址
   * @param opreturnData (可选)追加一个opReturn输出
   * @param utxos (可选)指定utxos
   * @param changeAddress (可选)指定找零地址
   * @returns
   */
  public async unsignTransfer({
    genesis,
    codehash,
    tokenIndex,
    senderPublicKey,
    receiverAddress,
    opreturnData,
    utxos,
    changeAddress,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    senderPublicKey: string | bsv.PublicKey;
    receiverAddress: string | bsv.Address;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
  }): Promise<{ tx: bsv.Transaction; sigHashList: SigHashInfo[] }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let nftInfo = await this._pretreatNftUtxo(
      tokenIndex,
      codehash,
      genesis,
      null,
      senderPublicKey as bsv.PublicKey
    );

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { tx } = await this._transfer({
      genesis,
      codehash,
      nftUtxo: nftInfo.nftUtxo,
      receiverAddress,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });

    let sigHashList: SigHashInfo[] = [];
    tx.inputs.forEach((input: any, inputIndex: number) => {
      let address = "";
      let isP2PKH: boolean;
      if (inputIndex == 0) {
        let pubkey = senderPublicKey as bsv.PublicKey;
        address = pubkey.toAddress(this.network).toString();
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

  private async _perfectNftUtxosInfo(
    nftUtxo: NftUtxo,
    codehash: string,
    genesis: string
  ) {
    nftUtxo.txHex = await this.sensibleApi.getRawTxData(nftUtxo.txId);

    //获取前序tx raw，必须的吗？
    let curDataPartObj: NftProto.NftDataPart;
    let curGenesisHash: Buffer;

    const tx = new bsv.Transaction(nftUtxo.txHex);
    if (!curDataPartObj) {
      let tokenScript = tx.outputs[nftUtxo.outputIndex].script;
      curDataPartObj = NftProto.parseDataPart(tokenScript.toBuffer());
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
          let sensibleId = NftProto.getSensibleIDBuf(
            lockingScript.toBuffer()
          ).toString("hex");
          if (sensibleId == genesis) {
            return true;
          }
          let genesisHash = toHex(
            bsv.crypto.Hash.sha256ripemd160(lockingScriptBuf)
          );
          if (genesisHash == curDataPartObj.genesisHash) {
            return true;
          }
        }
      }
    });
    if (!input) throw new CodeError(ErrCode.EC_INNER_ERROR, "invalid nftUtxo");
    let preTxId = input.prevTxId.toString("hex");
    let preOutputIndex = input.outputIndex;
    nftUtxo.preTxId = preTxId;
    nftUtxo.preOutputIndex = preOutputIndex;

    nftUtxo.preTxHex = await this.sensibleApi.getRawTxData(preTxId);

    const preTx = new bsv.Transaction(nftUtxo.preTxHex);
    let preDataPartObj = NftProto.parseDataPart(
      preTx.outputs[nftUtxo.preOutputIndex].script.toBuffer()
    );
    if (
      preDataPartObj.nftAddress == "0000000000000000000000000000000000000000"
    ) {
      nftUtxo.preNftAddress = this.zeroAddress; //genesis 情况下为了让preTokenAddress成为合法地址，但最后并不会使用 dummy
    } else {
      nftUtxo.preNftAddress = bsv.Address.fromPublicKeyHash(
        Buffer.from(preDataPartObj.nftAddress, "hex"),
        this.network
      );
    }

    nftUtxo.preLockingScript = preTx.outputs[nftUtxo.preOutputIndex].script;
    nftUtxo.lockingScript = tx.outputs[nftUtxo.outputIndex].script;
    nftUtxo.satoshis = tx.outputs[nftUtxo.outputIndex].satoshis;

    return nftUtxo;
  }

  private async _transfer({
    genesis,
    codehash,
    nftUtxo,
    nftPrivateKey,
    receiverAddress,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
  }: {
    genesis: string;
    codehash: string;
    nftUtxo: NftUtxo;
    nftPrivateKey?: bsv.PrivateKey;
    receiverAddress: bsv.Address;
    opreturnData?: any;
    utxos: any[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;
  }): Promise<{ tx: bsv.Transaction }> {
    nftUtxo = await this._perfectNftUtxosInfo(nftUtxo, codehash, genesis);

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      opreturnData,
      utxoMaxCount: utxos.length,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    utxos.forEach((utxo) => {
      utxo.address = new bsv.Address(utxo.address, this.network);
    });

    let rabinPubKeyVerifyArray: Int[] = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = this.signerSelecteds[j];
      rabinPubKeyVerifyArray.push(this.nft.rabinPubKeyArray[signerIndex]);
    }

    let sigReqArray = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = this.signerSelecteds[j];
      sigReqArray[j] = this.signers[signerIndex].satoTxSigUTXOSpendBy({
        txId: nftUtxo.preTxId,
        index: nftUtxo.preOutputIndex,
        txHex: nftUtxo.preTxHex,
        byTxId: nftUtxo.txId,
        byTxHex: nftUtxo.txHex,
      });
    }
    let rabinMsg: Bytes;
    let rabinSigArray: Int[] = [];
    let rabinPaddingArray: Bytes[] = [];
    for (let j = 0; j < sigReqArray.length; j++) {
      let sigInfo = await sigReqArray[j];
      if (j == 0) {
        rabinMsg = new Bytes(sigInfo.payload);
      }
      rabinSigArray.push(
        new Int(BN.fromString(sigInfo.sigBE, 16).toString(10))
      );
      rabinPaddingArray.push(new Bytes(sigInfo.padding));
    }

    let tx = this.nft.createTransferTx({
      nftUtxo,
      rabinPubKeyIndexArray: this.signerSelecteds,
      rabinPubKeyVerifyArray,
      rabinMsg,
      rabinPaddingArray,
      rabinSigArray,
      receiverAddress,
      senderPrivateKey: nftPrivateKey,
      opreturnData,
      utxos,
      utxoPrivateKeys,
      changeAddress,
      feeb: this.feeb,
      debug: this.debug,
    });

    this._checkTxFeeRate(tx);
    return { tx };
  }

  /**
   * 查询某人持有的所有NFT Token列表
   * @param address 用户地址
   * @returns
   */
  async getSummary(address: string) {
    return await this.sensibleApi.getNonFungibleTokenSummary(address);
  }

  /**
   * 查询某人持有的某种NFT Token列表。
   * @param codehash NFT的codehash
   * @param genesis NFT的genesis
   * @param address 拥有者的地址
   * @returns
   */
  async getSummaryDetail(codehash: string, genesis: string, address: string) {
    return await this.sensibleApi.getNonFungibleTokenUnspents(
      codehash,
      genesis,
      address
    );
  }

  /**
   * 估算genesis所需花费
   * @param opreturnData
   * @returns
   */
  async getGenesisEstimateFee({
    opreturnData,
    utxoMaxCount = 10,
  }: {
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;
    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    stx.addOutput(NftGenesis.getLockingScriptSize());

    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();
    return stx.getFee();
  }

  /**
   * 估算铸造NFT所需花费
   * @param param0
   * @returns
   */
  async getIssueEstimateFee({
    genesis,
    genesisPublicKey,
    opreturnData,
    utxoMaxCount = 10,
  }: {
    genesis: string;
    genesisPublicKey: string | bsv.PublicKey;
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let { genesisUtxo } = await this._prepareIssueUtxo({
      genesis,
      genesisPublicKey,
    });
    return await this._calIssueEstimateFee({
      genesisUtxoSatoshis: genesisUtxo.satoshis,
      opreturnData,
      utxoMaxCount,
    });
  }

  private async _calIssueEstimateFee({
    genesisUtxoSatoshis,
    opreturnData,
    utxoMaxCount = 10,
  }: {
    genesisUtxoSatoshis: number;
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;

    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    stx.addInput(
      NftGenesis.calUnlockingScriptSize(opreturnData),
      genesisUtxoSatoshis
    );
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    stx.addOutput(NftGenesis.getLockingScriptSize());

    stx.addOutput(Nft.getLockingScriptSize());
    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();

    return stx.getFee();
  }

  private async _calTransferEstimateFee({
    nftUtxoSatoshis,
    opreturnData,
    utxoMaxCount,
  }: {
    nftUtxoSatoshis: number;
    opreturnData: any;
    utxoMaxCount: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;
    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    stx.addInput(
      Nft.calUnlockingScriptSize(p2pkhInputNum, opreturnData),
      nftUtxoSatoshis
    );
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    stx.addOutput(Nft.getLockingScriptSize());
    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();

    return stx.getFee();
  }
  /**
   * 估算转移NFT所花费金额
   * @param param0
   * @returns
   */

  public async getTransferEstimateFee({
    genesis,
    codehash,
    tokenIndex,

    senderWif,
    senderPrivateKey,
    senderPublicKey,
    opreturnData,
    utxoMaxCount = 10,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    senderWif?: string;
    senderPrivateKey?: string | bsv.PrivateKey;
    senderPublicKey?: string | bsv.PublicKey;
    opreturnData?: any;
    utxoMaxCount?: number;
  }): Promise<number> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    if (senderWif) {
      senderPrivateKey = new bsv.PrivateKey(senderWif);
      senderPublicKey = senderPrivateKey.publicKey;
    } else if (senderPrivateKey) {
      senderPrivateKey = new bsv.PrivateKey(senderPrivateKey);
      senderPublicKey = senderPrivateKey.publicKey;
    } else {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxo(
      tokenIndex,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey
    );

    let nftUtxo = await this._perfectNftUtxosInfo(
      nftInfo.nftUtxo,
      codehash,
      genesis
    );

    return await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      opreturnData,
      utxoMaxCount,
    });
  }
  /**
   * Update the signature of the transaction
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
   * Broadcast a transaction
   * @param txHex
   */
  public async broadcast(txHex: string) {
    return await this.sensibleApi.broadcast(txHex);
  }

  /**
   * Print tx
   * @param tx
   */
  public dumpTx(tx: bsv.Transaction) {
    Utils.dumpTx(tx, this.network);
  }

  private async _checkTxFeeRate(tx: bsv.Transaction) {
    //Determine whether the final fee is sufficient
    const size = tx.toBuffer().length;
    const feePaid = tx._getUnspentValue();
    const feeRate = feePaid / size;
    if (feeRate < this.feeb) {
      throw new CodeError(
        ErrCode.EC_INSUFFICENT_BSV,
        `Insufficient balance.The fee rate should not be less than ${this.feeb}, but in the end it is ${feeRate}.`
      );
    }
  }

  /**
   * Get codehash and genesis from genesis tx.
   * @param genesisTx genesis tx
   * @param genesisOutputIndex (Optional) outputIndex - default value is 0.
   * @returns
   */
  public getCodehashAndGensisByTx(
    genesisTx: bsv.Transaction,
    genesisOutputIndex: number = 0
  ) {
    let genesis: string;
    let codehash: string;
    let genesisTxId = genesisTx.id;
    let tokenContract = Nft.createContract(
      genesisTxId,
      genesisOutputIndex,
      genesisTx.outputs[genesisOutputIndex].script,
      this.nft.unlockContractCodeHashArray,
      {
        receiverAddress: new bsv.Address(this.zeroAddress), //dummy address
        tokenIndex: BN.One,
      }
    );
    let scriptBuf = tokenContract.lockingScript.toBuffer();
    codehash = Utils.getCodeHash(tokenContract.lockingScript);
    genesis = toHex(NftProto.getSensibleIDBuf(scriptBuf));

    return { codehash, genesis };
  }

  /**
   * Check if codehash is valid
   * @param codehash
   * @returns
   */
  public isSupportedToken(codehash: string): boolean {
    return codehash == ContractUtil.tokenCodeHash;
  }
}
