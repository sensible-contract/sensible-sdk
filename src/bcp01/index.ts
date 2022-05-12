import { Bytes, Int, PubKey, Ripemd160, Sig, toHex } from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import { DustCalculator } from "../common/DustCalculator";
import { CodeError, ErrCode } from "../common/error";
import { hasProtoFlag } from "../common/protoheader";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import {
  getRabinData,
  getRabinDatas,
  selectSigners
} from "../common/satotxSignerUtil";
import { SizeTransaction } from "../common/SizeTransaction";
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import {
  CONTRACT_TYPE,
  PLACE_HOLDER_PUBKEY,
  PLACE_HOLDER_SIG,
  SigHashInfo,
  SigInfo
} from "../common/utils";
import {
  API_NET,
  API_TARGET,
  NonFungibleTokenUnspent,
  SensibleApi,
  SensibleApiBase
} from "../sensible-api";
import { TxComposer } from "../tx-composer";
import { NftFactory } from "./contract-factory/nft";
import { NftGenesisFactory } from "./contract-factory/nftGenesis";
import { NftSellFactory, NFT_SELL_OP } from "./contract-factory/nftSell";
import {
  NftUnlockContractCheckFactory,
  NFT_UNLOCK_CONTRACT_TYPE
} from "./contract-factory/nftUnlockContractCheck";
import * as nftProto from "./contract-proto/nft.proto";
import { SIGNER_VERIFY_NUM } from "./contract-proto/nft.proto";
import * as nftSellProto from "./contract-proto/nftSell.proto";
import { ContractUtil } from "./contractUtil";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
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

type SellUtxo = {
  txId: string;
  outputIndex: number;
  sellerAddress: string;
  satoshisPrice: number;
};
export class Prevouts {
  _buf: Buffer;
  constructor() {
    this._buf = Buffer.alloc(0);
  }

  addVout(txId: string, outputIndex: number) {
    const txidBuf = TokenUtil.getTxIdBuf(txId);
    const indexBuf = TokenUtil.getUInt32Buf(outputIndex);
    this._buf = Buffer.concat([this._buf, txidBuf, indexBuf]);
  }

  toHex() {
    return this._buf.toString("hex");
  }
}
export type Utxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  address: bsv.Address;
};

export type NftUtxo = {
  txId: string;
  outputIndex: number;
  satoshis?: number;
  lockingScript?: bsv.Script;

  satotxInfo?: {
    txId: string;
    outputIndex: number;
    txHex: string;
    preTxId: string;
    preOutputIndex: number;
    preTxHex: string;
  };

  nftAddress?: bsv.Address;
  preNftAddress?: bsv.Address;
  preLockingScript?: bsv.Script;

  publicKey?: bsv.PublicKey;
  inputIndex?: number;
};

export type RabinUtxo = {
  txId: string;
  outputIndex: number;
  txHex: string;

  preTxId: string;
  preOutputIndex: number;
  preTxHex: string;
};

export type ParamUtxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  wif?: string;
  address?: any;
};
export const defaultSignerConfigs: SignerConfig[] = [
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
  if (typeof genesis != "string" || genesis.length != 40) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `GenesisFormatError:genesis should be a string with 40 length `
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
  // $.checkArgument(
  //   codehash == ContractUtil.tokenCodeHash,
  //   `a valid codehash should be ${ContractUtil.tokenCodeHash}, but the provided is ${codehash} `
  // );
}

function checkParamSensibleId(sensibleId) {
  if (typeof sensibleId != "string" || sensibleId.length != 72) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `CodehashFormatError:sensibleId should be a string with 72 length `
    );
  }
}

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
 */
export class SensibleNFT {
  private signers: SatotxSigner[];
  private feeb: number;
  private network: API_NET;
  private purse: Purse;
  public sensibleApi: SensibleApiBase;
  private zeroAddress: bsv.Address;
  private debug: boolean;
  private signerSelecteds: number[] = [];
  private dustCalculator: DustCalculator;

  rabinPubKeyArray: Int[];
  rabinPubKeyHashArray: Bytes;
  rabinPubKeyHashArrayHash: Buffer;
  unlockContractCodeHashArray: Bytes[];

  /**
   *
   * @param signers
   * @param signerSelecteds (Optional) the indexs of the signers which is decided to verify
   * @param feeb (Optional) the fee rate. default is 0.5
   * @param network (Optional) mainnet/testnet default is mainnet
   * @param purse (Optional) the private key to offer transacions fee. If not provided, bsv utoxs must be provided in genesis/issue/transfer.
   * @param debug (Optional) specify if verify the tx when genesis/issue/transfer, default is false
   * @param apiTarget (Optional) SENSIBLE/METASV, default is SENSIBLE.
   * @param dustLimitFactor (Optional) specify the output dust rate, default is 0.25 .If the value is equal to 0, the final dust will be at least 1.
   * @param dustAmount (Optional) specify the output dust.
   */
  constructor({
    signers = defaultSignerConfigs,
    signerSelecteds,
    feeb = 0.05,
    network = API_NET.MAIN,
    purse,
    debug = false,
    apiTarget = API_TARGET.SENSIBLE,
    apiUrl,
    mockData,
    dustLimitFactor = 300,
    dustAmount,
  }: {
    signers?: SignerConfig[];
    signerSelecteds?: number[];
    feeb?: number;
    network?: API_NET;
    purse?: string;
    debug?: boolean;
    apiTarget?: API_TARGET;
    apiUrl?: string;
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
      this.sensibleApi = new SensibleApi(network, apiTarget, apiUrl);
    }

    this.debug = debug;

    this.dustCalculator = new DustCalculator(dustLimitFactor, dustAmount);

    if (network == API_NET.MAIN) {
      this.zeroAddress = new bsv.Address("1111111111111111111114oLvT2");
    } else {
      this.zeroAddress = new bsv.Address("mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8");
    }

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

    let rabinPubKeys = this.signers.map((v) => v.satotxPubKey);
    let rabinPubKeyHashArray = TokenUtil.getRabinPubKeyHashArray(rabinPubKeys);
    this.rabinPubKeyHashArrayHash =
      bsv.crypto.Hash.sha256ripemd160(rabinPubKeyHashArray);
    this.rabinPubKeyHashArray = new Bytes(toHex(rabinPubKeyHashArray));
    this.rabinPubKeyArray = rabinPubKeys.map((v) => new Int(v.toString(10)));
    this.unlockContractCodeHashArray = ContractUtil.unlockContractCodeHashArray;
  }

  /**
   * Pick the signer with the best connectivity
   * @param signerConfigs
   * @returns
   */
  public static async selectSigners(
    signerConfigs: SignerConfig[] = defaultSignerConfigs
  ) {
    return await selectSigners(
      signerConfigs,
      nftProto.SIGNER_NUM,
      nftProto.SIGNER_VERIFY_NUM
    );
  }

  /**
   * set dust. DustAmount has a higher priority than dustLimitFactor
   * @param dustLimitFactor specify the output dust rate, default is 0.25 .If the value is equal to 0, the final dust will be at least 1.
   * @param dustAmount specify the output dust
   */
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

  private getDustThreshold(size: number) {
    return this.dustCalculator.getDustThreshold(size);
  }

  private async _pretreatUtxos(
    paramUtxos: ParamUtxo[]
  ): Promise<{ utxos: Utxo[]; utxoPrivateKeys: bsv.PrivateKey[] }> {
    let utxoPrivateKeys = [];
    let utxos: Utxo[] = [];
    //If utxos are not provided, use purse to fetch utxos
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
          v.address = privateKey.toAddress(this.network).toString(); //Compatible with the old version, only wif is provided but no address is provided
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
      throw new CodeError(ErrCode.EC_INSUFFICIENT_BSV, "Insufficient balance.");
    return { utxos, utxoPrivateKeys };
  }

  private async _pretreatNftUtxoToTransfer(
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

  private async _pretreatNftUtxoToIssue({
    sensibleId,
    genesisPublicKey,
  }: {
    sensibleId: string;
    genesisPublicKey: bsv.PublicKey;
  }) {
    let genesisContract = NftGenesisFactory.createContract(genesisPublicKey);

    let { genesisTxId, genesisOutputIndex } = parseSensibleID(sensibleId);
    let genesisUtxo = await this.getIssueUtxo(
      genesisContract.getCodeHash(),
      genesisTxId,
      genesisOutputIndex
    );

    if (!genesisUtxo) {
      throw new CodeError(
        ErrCode.EC_FIXED_TOKEN_SUPPLY,
        "token supply is fixed"
      );
    }
    let txHex = await this.sensibleApi.getRawTxData(genesisUtxo.txId);
    const tx = new bsv.Transaction(txHex);
    let preTxId = tx.inputs[0].prevTxId.toString("hex");
    let preOutputIndex = tx.inputs[0].outputIndex;
    let preTxHex = await this.sensibleApi.getRawTxData(preTxId);
    genesisUtxo.satotxInfo = {
      txId: genesisUtxo.txId,
      outputIndex: genesisUtxo.outputIndex,
      txHex,
      preTxId,
      preOutputIndex,
      preTxHex,
    };

    let output = tx.outputs[genesisUtxo.outputIndex];
    genesisUtxo.satoshis = output.satoshis;
    genesisUtxo.lockingScript = output.script;
    genesisContract.setFormatedDataPartFromLockingScript(
      genesisUtxo.lockingScript
    );

    return {
      genesisContract,
      genesisTxId,
      genesisOutputIndex,
      genesisUtxo,
    };
  }

  private async _pretreatNftUtxoToTransferOn(
    nftUtxo: NftUtxo,
    codehash: string,
    genesis: string
  ) {
    let txHex = await this.sensibleApi.getRawTxData(nftUtxo.txId);
    const tx = new bsv.Transaction(txHex);
    let tokenScript = tx.outputs[nftUtxo.outputIndex].script;

    let curDataPartObj = nftProto.parseDataPart(tokenScript.toBuffer());
    let input = tx.inputs.find((input) => {
      let script = new bsv.Script(input.script);
      if (script.chunks.length > 0) {
        const lockingScriptBuf = TokenUtil.getLockingScriptFromPreimage(
          script.chunks[0].buf
        );
        if (lockingScriptBuf) {
          if (nftProto.getQueryGenesis(lockingScriptBuf) == genesis) {
            return true;
          }

          let dataPartObj = nftProto.parseDataPart(lockingScriptBuf);
          dataPartObj.sensibleID = curDataPartObj.sensibleID;
          dataPartObj.tokenIndex = BN.Zero;
          const newScriptBuf = nftProto.updateScript(
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
    if (!input) throw new CodeError(ErrCode.EC_INNER_ERROR, "invalid nftUtxo");
    let preTxId = input.prevTxId.toString("hex");
    let preOutputIndex = input.outputIndex;
    let preTxHex = await this.sensibleApi.getRawTxData(preTxId);
    const preTx = new bsv.Transaction(preTxHex);

    nftUtxo.satotxInfo = {
      txId: nftUtxo.txId,
      outputIndex: nftUtxo.outputIndex,
      txHex,
      preTxId,
      preOutputIndex,
      preTxHex,
    };

    nftUtxo.preLockingScript = preTx.outputs[preOutputIndex].script;
    nftUtxo.lockingScript = tx.outputs[nftUtxo.outputIndex].script;
    nftUtxo.satoshis = tx.outputs[nftUtxo.outputIndex].satoshis;
    nftUtxo.preNftAddress = bsv.Address.fromPublicKeyHash(
      Buffer.from(
        nftProto.getNftAddress(preTx.outputs[preOutputIndex].script.toBuffer()),
        "hex"
      ),
      this.network
    );

    return nftUtxo;
  }

  /**
   * Create a transaction for genesis
   * @param genesisWif the private key of the token genesiser
   * @param totalSupply total supply, 8 bytes unsign int
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
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
    sensibleId: string;
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

    let { txComposer } = await this._genesis({
      genesisPublicKey,
      totalSupply,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });
    let { codehash, genesis, sensibleId } = this.getCodehashAndGensisByTx(
      txComposer.tx
    );
    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }
    return {
      codehash,
      genesis,
      sensibleId,
      tx: txComposer.tx,
      txid: txComposer.tx.id,
      txHex,
    };
  }

  /**
   * create an unsigned transaction for genesis
   * @param genesisPublicKey the public key of the token genesiser
   * @param totalSupply total supply, 8 bytes unsign int
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
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

    let { txComposer } = await this._genesis({
      genesisPublicKey,
      totalSupply,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });

    let tx = txComposer.tx;
    let sigHashList = txComposer.getSigHashLit();

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
    txComposer: TxComposer;
  }> {
    let genesisContract = NftGenesisFactory.createContract(genesisPublicKey);
    genesisContract.setFormatedDataPart({
      totalSupply,
      rabinPubKeyHashArrayHash: toHex(this.rabinPubKeyHashArrayHash),
    });

    const txComposer = new TxComposer();

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: Utils.CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const genesisOutputIndex = txComposer.appendOutput({
      lockingScript: genesisContract.lockingScript,
      satoshis: this.getDustThreshold(
        genesisContract.lockingScript.toBuffer().length
      ),
    });

    //If there is opReturn, add it to the second output
    if (opreturnData) {
      txComposer.appendOpReturnOutput(opreturnData);
    }

    txComposer.appendChangeOutput(changeAddress, this.feeb);
    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);

    return { txComposer };
  }

  /**
   * Mint a NFT
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param sensibleId the sensibleId of NFT.
   * @param genesisWif the private key of the NFT genesiser
   * @param receiverAddress the NFT receiver address
   * @param metaTxId  the txid of meta info outpoint.To describe NFT status, metaId is recommended
   * @param metaOutputIndex the index of meta info outpoint.
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @returns
   */
  public async issue({
    genesis,
    codehash,
    sensibleId,
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
    sensibleId: string;
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
    checkParamSensibleId(sensibleId);

    const genesisPrivateKey = new bsv.PrivateKey(genesisWif);
    const genesisPublicKey = genesisPrivateKey.toPublicKey();
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { txComposer, tokenIndex } = await this._issue({
      genesis,
      codehash,
      sensibleId,
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

    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }

    return {
      txHex,
      txid: txComposer.getTxId(),
      tx: txComposer.getTx(),
      tokenIndex,
    };
  }

  /**
   * Create the unsigned transaction for issue NFT,
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param genesisPublicKey the public key of the NFT genesiser
   * @param receiverAddress the NFT receiver address
   * @param metaTxId  the txid of meta info outpoint.To describe NFT status, metaId is recommended
   * @param metaOutputIndex the index of meta info outpoint..
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @returns
   */
  public async unsignIssue({
    genesis,
    codehash,
    sensibleId,
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
    sensibleId: string;
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
    checkParamSensibleId(sensibleId);

    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }

    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { txComposer, tokenIndex } = await this._issue({
      genesis,
      codehash,
      sensibleId,
      genesisPublicKey,
      receiverAddress,
      metaTxId,
      metaOutputIndex,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress: changeAddress,
    });

    let tx = txComposer.getTx();
    let sigHashList = txComposer.getSigHashLit();
    return { tx, sigHashList, tokenIndex };
  }

  private async getIssueUtxo(
    codehash: string,
    genesisTxId: string,
    genesisOutputIndex: number
  ): Promise<NftUtxo> {
    let unspent: NonFungibleTokenUnspent;
    let firstGenesisTxHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let firstGenesisTx = new bsv.Transaction(firstGenesisTxHex);

    let scriptBuffer =
      firstGenesisTx.outputs[genesisOutputIndex].script.toBuffer();

    let originGenesis = nftProto.getQueryGenesis(scriptBuffer);
    let genesisUtxos = await this.sensibleApi.getNonFungibleTokenUnspents(
      codehash,
      originGenesis,
      this.zeroAddress.toString()
    );
    unspent = genesisUtxos.find(
      (v) => v.txId == genesisTxId && v.outputIndex == genesisOutputIndex
    );

    // let spent = await this.sensibleApi.getOutpointSpent(
    //   genesisTxId,
    //   genesisOutputIndex
    // );
    // if (!spent) {
    //   return {
    //     txId: genesisTxId,
    //     outputIndex: genesisOutputIndex,
    //   };
    // }

    if (!unspent) {
      let _dataPartObj = nftProto.parseDataPart(scriptBuffer);
      _dataPartObj.sensibleID = {
        txid: genesisTxId,
        index: genesisOutputIndex,
      };
      let newScriptBuf = nftProto.updateScript(scriptBuffer, _dataPartObj);
      let issueGenesis = nftProto.getQueryGenesis(newScriptBuf);
      let issueUtxos = await this.sensibleApi.getNonFungibleTokenUnspents(
        codehash,
        issueGenesis,
        this.zeroAddress.toString()
      );
      if (issueUtxos.length > 0) {
        unspent = issueUtxos[0];
      }
    }
    if (unspent) {
      return {
        txId: unspent.txId,
        outputIndex: unspent.outputIndex,
      };
    }
  }

  async prepareNftUtxo2(nftUtxo: NftUtxo) {
    let txHex = await this.sensibleApi.getRawTxData(nftUtxo.txId);
    const tx = new bsv.Transaction(txHex);
    let preTxId = tx.inputs[0].prevTxId.toString("hex");
    let preOutputIndex = tx.inputs[0].outputIndex;
    let preTxHex = await this.sensibleApi.getRawTxData(preTxId);
    nftUtxo.satotxInfo = {
      txId: nftUtxo.txId,
      outputIndex: nftUtxo.outputIndex,
      txHex,
      preTxId,
      preOutputIndex,
      preTxHex,
    };

    let output = tx.outputs[nftUtxo.outputIndex];
    nftUtxo.satoshis = output.satoshis;
    nftUtxo.lockingScript = output.script;
  }

  private async _issue({
    genesis,
    codehash,
    sensibleId,
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
    sensibleId: string;
    genesisPrivateKey?: bsv.PrivateKey;
    genesisPublicKey: bsv.PublicKey;
    receiverAddress: bsv.Address;
    metaTxId: string;
    metaOutputIndex: number;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys?: bsv.PrivateKey[];
    changeAddress: bsv.Address;
  }): Promise<{ txComposer: TxComposer; tokenIndex: string }> {
    let { genesisContract, genesisTxId, genesisOutputIndex, genesisUtxo } =
      await this._pretreatNftUtxoToIssue({ sensibleId, genesisPublicKey });

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calIssueEstimateFee({
      genesisUtxoSatoshis: genesisUtxo.satoshis,
      opreturnData,
      utxoMaxCount: utxos.length,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let originDataPart = genesisContract.getFormatedDataPart();
    genesisContract.setFormatedDataPart({
      sensibleID: {
        txid: genesisTxId,
        index: genesisOutputIndex,
      },
      tokenIndex: BN.Zero,
    });
    let genesisHash = genesisContract.getScriptHash();
    genesisContract.setFormatedDataPart(originDataPart);

    let nftContract = NftFactory.createContract(
      this.unlockContractCodeHashArray,
      codehash
    );
    nftContract.setFormatedDataPart({
      metaidOutpoint: {
        txid: metaTxId,
        index: metaOutputIndex,
      },
      nftAddress: toHex(receiverAddress.hashBuffer),
      totalSupply: genesisContract.getFormatedDataPart().totalSupply,
      tokenIndex: genesisContract.getFormatedDataPart().tokenIndex,
      genesisHash,
      rabinPubKeyHashArrayHash:
        genesisContract.getFormatedDataPart().rabinPubKeyHashArrayHash,
      sensibleID: {
        txid: genesisTxId,
        index: genesisOutputIndex,
      },
    });

    if (
      originDataPart.rabinPubKeyHashArrayHash !=
      toHex(this.rabinPubKeyHashArrayHash)
    ) {
      throw new CodeError(ErrCode.EC_INVALID_SIGNERS, "Invalid signers.");
    }

    let { rabinData, rabinPubKeyIndexArray, rabinPubKeyVerifyArray } =
      await getRabinData(
        this.signers,
        this.signerSelecteds,
        genesisContract.isFirstGenesis() ? null : genesisUtxo.satotxInfo
      );

    const txComposer = new TxComposer();

    //The first input is the genesis contract
    const genesisInputIndex = txComposer.appendInput(genesisUtxo);
    txComposer.addSigHashInfo({
      inputIndex: genesisInputIndex,
      address: genesisPublicKey.toAddress(this.network).toString(),
      sighashType,
      contractType: CONTRACT_TYPE.BCP01_NFT_GENESIS,
    });

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    let genesisContractSatoshis = 0;
    const genesisDataPartObj = genesisContract.getFormatedDataPart();
    if (
      genesisDataPartObj.tokenIndex.lt(
        genesisDataPartObj.totalSupply.sub(BN.One)
      )
    ) {
      genesisDataPartObj.tokenIndex = genesisDataPartObj.tokenIndex.add(BN.One);
      genesisDataPartObj.sensibleID =
        nftContract.getFormatedDataPart().sensibleID;
      let nextGenesisContract = genesisContract.clone();
      nextGenesisContract.setFormatedDataPart(genesisDataPartObj);
      genesisContractSatoshis = this.getDustThreshold(
        nextGenesisContract.lockingScript.toBuffer().length
      );
      txComposer.appendOutput({
        lockingScript: nextGenesisContract.lockingScript,
        satoshis: genesisContractSatoshis,
      });
    }

    //The following output is the NFT
    const nftOutputIndex = txComposer.appendOutput({
      lockingScript: nftContract.lockingScript,
      satoshis: this.getDustThreshold(
        nftContract.lockingScript.toBuffer().length
      ),
    });

    //If there is opReturn, add it to the output
    let opreturnScriptHex = "";
    if (opreturnData) {
      const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
      opreturnScriptHex = txComposer
        .getOutput(opreturnOutputIndex)
        .script.toHex();
    }

    for (let c = 0; c < 2; c++) {
      txComposer.clearChangeOutput();
      const changeOutputIndex = txComposer.appendChangeOutput(
        changeAddress,
        this.feeb
      );
      let unlockResult = genesisContract.unlock({
        txPreimage: txComposer.getInputPreimage(genesisInputIndex),
        sig: new Sig(
          genesisPrivateKey
            ? toHex(
                txComposer.getTxFormatSig(genesisPrivateKey, genesisInputIndex)
              )
            : PLACE_HOLDER_SIG
        ),
        rabinMsg: rabinData.rabinMsg,
        rabinPaddingArray: rabinData.rabinPaddingArray,
        rabinSigArray: rabinData.rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        genesisSatoshis: genesisContractSatoshis,
        nftScript: new Bytes(
          txComposer.getOutput(nftOutputIndex).script.toHex()
        ),
        nftSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
        changeAddress: new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeSatoshis:
          changeOutputIndex != -1
            ? txComposer.getOutput(changeOutputIndex).satoshis
            : 0,
        opReturnScript: new Bytes(opreturnScriptHex),
      });

      if (this.debug && genesisPrivateKey && c == 1) {
        let ret = unlockResult.verify({
          tx: txComposer.tx,
          inputIndex: genesisInputIndex,
          inputSatoshis: txComposer.getInput(genesisInputIndex).output.satoshis,
        });
        if (ret.success == false) throw ret;
      }

      txComposer
        .getInput(genesisInputIndex)
        .setScript(unlockResult.toScript() as bsv.Script);
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);
    return {
      txComposer,
      tokenIndex: nftContract.getFormatedDataPart().tokenIndex.toString(10),
    };
  }

  /**
   * Create a transaction and broadcast it to transfer a NFT.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param senderWif the private key of the token sender,can be wif or other format
   * @param senderPrivateKey the private key of the token sender
   * @param receiverAddress  the NFT receiver address
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @returns
   */
  public async transfer({
    genesis,
    codehash,
    tokenIndex,

    senderWif,
    senderPrivateKey,

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
    receiverAddress: string | bsv.Address;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;
  }): Promise<{ tx: bsv.Transaction; txid: string; txHex: string }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let senderPublicKey: bsv.PublicKey;
    if (senderWif) {
      senderPrivateKey = new bsv.PrivateKey(senderWif);
      senderPublicKey = senderPrivateKey.publicKey;
    } else if (senderPrivateKey) {
      senderPrivateKey = new bsv.PrivateKey(senderPrivateKey);
      senderPublicKey = senderPrivateKey.publicKey;
    } else {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        "senderPrivateKey should be provided!"
      );
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey as bsv.PublicKey
    );

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    receiverAddress = new bsv.Address(receiverAddress, this.network);

    let { txComposer } = await this._transfer({
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

    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { tx: txComposer.tx, txHex, txid: txComposer.tx.id };
  }

  /**
   * Create an unsigned transaction to transfer a NFT.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param senderPublicKey the public key of the NFT sender
   * @param receiverAddress  the NFT receiver address
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
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

    let nftInfo = await this._pretreatNftUtxoToTransfer(
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

    let { txComposer } = await this._transfer({
      genesis,
      codehash,
      nftUtxo: nftInfo.nftUtxo,
      receiverAddress,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
    });

    let tx = txComposer.tx;
    let sigHashList = txComposer.getSigHashLit();
    return { tx, sigHashList };
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
    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;
  }): Promise<{ txComposer: TxComposer }> {
    nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftUtxo,
      codehash,
      genesis
    );

    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");
    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      genesisScript,
      opreturnData,
      utxoMaxCount: utxos.length,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    //validate signers
    const nftScriptBuf = nftUtxo.lockingScript.toBuffer();
    let dataPartObj = nftProto.parseDataPart(nftScriptBuf);
    dataPartObj.nftAddress = toHex(receiverAddress.hashBuffer);
    const lockingScriptBuf = nftProto.updateScript(nftScriptBuf, dataPartObj);
    if (
      dataPartObj.rabinPubKeyHashArrayHash !=
      toHex(this.rabinPubKeyHashArrayHash)
    ) {
      throw new CodeError(ErrCode.EC_INVALID_SIGNERS, "Invalid signers.");
    }

    let { rabinDatas, rabinPubKeyIndexArray, rabinPubKeyVerifyArray } =
      await getRabinDatas(this.signers, this.signerSelecteds, [
        nftUtxo.satotxInfo,
      ]);

    const txComposer = new TxComposer();
    let nftInput = nftUtxo;

    let prevouts = new Prevouts();

    // token contract input
    const nftInputIndex = txComposer.appendInput(nftInput);
    prevouts.addVout(nftInput.txId, nftInput.outputIndex);
    txComposer.addSigHashInfo({
      inputIndex: nftInputIndex,
      address: nftUtxo.nftAddress.toString(),
      sighashType,
      contractType: CONTRACT_TYPE.BCP01_NFT,
    });

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      prevouts.addVout(utxo.txId, utxo.outputIndex);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    //tx addOutput nft
    const nftOutputIndex = txComposer.appendOutput({
      lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
      satoshis: this.getDustThreshold(lockingScriptBuf.length),
    });

    //tx addOutput OpReturn
    let opreturnScriptHex = "";
    if (opreturnData) {
      const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
      opreturnScriptHex = txComposer
        .getOutput(opreturnOutputIndex)
        .script.toHex();
    }

    //The first round of calculations get the exact size of the final transaction, and then change again
    //Due to the change, the script needs to be unlocked again in the second round
    //let the fee to be exact in the second round

    for (let c = 0; c < 2; c++) {
      txComposer.clearChangeOutput();
      const changeOutputIndex = txComposer.appendChangeOutput(
        changeAddress,
        this.feeb
      );

      const nftContract = NftFactory.createContract(
        this.unlockContractCodeHashArray,
        codehash
      );
      let dataPartObj = nftProto.parseDataPart(
        nftInput.lockingScript.toBuffer()
      );
      nftContract.setFormatedDataPart(dataPartObj);
      const unlockingContract = nftContract.unlock({
        txPreimage: txComposer.getInputPreimage(nftInputIndex),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsg: rabinDatas[0].rabinMsg,
        rabinPaddingArray: rabinDatas[0].rabinPaddingArray,
        rabinSigArray: rabinDatas[0].rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        prevNftAddress: new Bytes(toHex(nftInput.preNftAddress.hashBuffer)),
        genesisScript: nftInput.preNftAddress.hashBuffer.equals(
          Buffer.alloc(20, 0)
        )
          ? new Bytes(nftInput.preLockingScript.toHex())
          : new Bytes(""),
        senderPubKey: new PubKey(
          nftInput.publicKey
            ? toHex(nftInput.publicKey.toBuffer())
            : PLACE_HOLDER_PUBKEY
        ),
        senderSig: new Sig(
          nftPrivateKey
            ? toHex(txComposer.getTxFormatSig(nftPrivateKey, nftInputIndex))
            : PLACE_HOLDER_SIG
        ),
        receiverAddress: new Bytes(toHex(receiverAddress.hashBuffer)),
        nftOutputSatoshis: new Int(
          txComposer.getOutput(nftOutputIndex).satoshis
        ),
        opReturnScript: new Bytes(opreturnScriptHex),
        changeAddress: new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeSatoshis: new Int(
          changeOutputIndex != -1
            ? txComposer.getOutput(changeOutputIndex).satoshis
            : 0
        ),
        operation: nftProto.NFT_OP_TYPE.TRANSFER,
      });

      if (this.debug && nftPrivateKey) {
        let txContext = {
          tx: txComposer.tx,
          inputIndex: nftInputIndex,
          inputSatoshis: txComposer.getInput(nftInputIndex).output.satoshis,
        };
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(nftInputIndex)
        .setScript(unlockingContract.toScript() as bsv.Script);
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);
    return { txComposer };
  }

  /**
   * Create a transaction and broadcast it to sell a NFT.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param sellerPrivateKey the private key of the token seller
   * @param satoshisPrice  the satoshis price to sell.
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos which should be no more than 3
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @param middleChangeAddress (Optional) the middle bsv changeAddress
   * @param middlePrivateKey (Optional) the private key of the middle changeAddress
   * @returns
   */
  public async sell({
    genesis,
    codehash,
    tokenIndex,

    sellerWif,
    sellerPrivateKey,

    satoshisPrice,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,

    middleChangeAddress,
    middlePrivateKey,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    sellerWif?: string;
    sellerPrivateKey?: string | bsv.PrivateKey;
    satoshisPrice: number;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;

    middleChangeAddress?: string | bsv.Address;
    middlePrivateKey?: string | bsv.PrivateKey;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let sellerPublicKey: bsv.PublicKey;
    if (sellerWif) {
      sellerPrivateKey = new bsv.PrivateKey(sellerWif);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else if (sellerPrivateKey) {
      sellerPrivateKey = new bsv.PrivateKey(sellerPrivateKey);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        "sellerPrivateKey should be provided!"
      );
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      sellerPrivateKey as bsv.PrivateKey,
      sellerPublicKey as bsv.PublicKey
    );

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

    let { nftSellTxComposer, txComposer } = await this._sell({
      genesis,
      codehash,
      tokenIndex,
      nftUtxo: nftInfo.nftUtxo,
      nftPrivateKey: nftInfo.nftUtxoPrivateKey,
      satoshisPrice,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      middlePrivateKey,
      middleChangeAddress,
    });

    let nftSellTxHex = nftSellTxComposer.getRawHex();
    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(nftSellTxHex);
      await this.sensibleApi.broadcast(txHex);
    }
    return {
      tx: txComposer.tx,
      txHex,
      txid: txComposer.tx.id,
      sellTxId: nftSellTxComposer.getTxId(),
      sellTx: nftSellTxComposer.getTx(),
      sellTxHex: nftSellTxHex,
    };
  }

  private async _sell({
    genesis,
    codehash,
    tokenIndex,
    nftUtxo,
    nftPrivateKey,
    satoshisPrice,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,

    middlePrivateKey,
    middleChangeAddress,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    nftUtxo: NftUtxo;
    nftPrivateKey?: bsv.PrivateKey;
    satoshisPrice: number;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;

    middlePrivateKey?: bsv.PrivateKey;
    middleChangeAddress: bsv.Address;
  }): Promise<{ nftSellTxComposer: TxComposer; txComposer: TxComposer }> {
    if (utxos.length > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation, please merge it first "
      );
    }

    if (!middleChangeAddress) {
      middleChangeAddress = utxos[0].address;
      middlePrivateKey = utxoPrivateKeys[0];
    }

    nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftUtxo,
      codehash,
      genesis
    );

    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);

    let estimateSatoshis1 = await this._calSellEstimateFee({
      utxoMaxCount: utxos.length,
      opreturnData,
    });
    let estimateSatoshis2 = await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      genesisScript,
      opreturnData,
      utxoMaxCount: 1,
    });
    let estimateSatoshis = estimateSatoshis1 + estimateSatoshis2;
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let nftSellContract = NftSellFactory.createContract(
      new Ripemd160(toHex(nftUtxo.nftAddress.hashBuffer)),
      satoshisPrice,
      new Bytes(codehash),
      new Bytes(toHex(nftProto.getNftID(nftUtxo.lockingScript.toBuffer())))
    );
    nftSellContract.setFormatedDataPart({
      codehash,
      genesis,
      tokenIndex: BN.fromString(tokenIndex, 10),
      sellerAddress: toHex(nftUtxo.nftAddress.hashBuffer),
      satoshisPrice: BN.fromNumber(satoshisPrice),
      nftID: toHex(nftProto.getNftID(nftUtxo.lockingScript.toBuffer())),
    });

    let nftSellTxComposer: TxComposer;
    {
      const txComposer = new TxComposer();

      const p2pkhInputIndexs = utxos.map((utxo) => {
        const inputIndex = txComposer.appendP2PKHInput(utxo);
        txComposer.addSigHashInfo({
          inputIndex,
          address: utxo.address.toString(),
          sighashType,
          contractType: Utils.CONTRACT_TYPE.P2PKH,
        });
        return inputIndex;
      });

      const nftSellOutputIndex = txComposer.appendOutput({
        lockingScript: nftSellContract.lockingScript,
        satoshis: this.getDustThreshold(
          nftSellContract.lockingScript.toBuffer().length
        ),
      });

      // put opreturn data to the transfer tx
      // if (opreturnData) {
      //   txComposer.appendOpReturnOutput(opreturnData);
      // }

      let changeOutputIndex = txComposer.appendChangeOutput(
        changeAddress,
        this.feeb
      );
      if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
        p2pkhInputIndexs.forEach((inputIndex) => {
          let privateKey = utxoPrivateKeys.splice(0, 1)[0];
          txComposer.unlockP2PKHInput(privateKey, inputIndex);
        });
      }

      this._checkTxFeeRate(txComposer);

      utxos = [
        {
          txId: txComposer.getTxId(),
          satoshis: txComposer.getOutput(changeOutputIndex).satoshis,
          outputIndex: changeOutputIndex,
          address: middleChangeAddress,
        },
      ];
      utxoPrivateKeys = utxos.map((v) => middlePrivateKey).filter((v) => v);

      nftSellTxComposer = txComposer;
    }

    let { txComposer } = await this._transfer({
      genesis,
      codehash,
      nftUtxo,
      nftPrivateKey,
      receiverAddress: new bsv.Address(
        TokenUtil.getScriptHashBuf(nftSellContract.lockingScript.toBuffer())
      ),
      opreturnData,
      utxos,
      utxoPrivateKeys,
      changeAddress,
    });

    return { nftSellTxComposer, txComposer };
  }

  /**
   * Create a sellUtxo transaction.To sell a NFT you should transfer it to this sellAddress.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param sellerPrivateKey the private key of the token seller
   * @param satoshisPrice  the satoshis price to sell.
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos which should be no more than 3
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @returns
   */
  public async sell2({
    genesis,
    codehash,
    tokenIndex,

    sellerWif,
    sellerPrivateKey,

    satoshisPrice,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    sellerWif?: string;
    sellerPrivateKey?: string | bsv.PrivateKey;
    satoshisPrice: number;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let sellerPublicKey: bsv.PublicKey;
    if (sellerWif) {
      sellerPrivateKey = new bsv.PrivateKey(sellerWif);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else if (sellerPrivateKey) {
      sellerPrivateKey = new bsv.PrivateKey(sellerPrivateKey);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        "sellerPrivateKey should be provided!"
      );
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      sellerPrivateKey as bsv.PrivateKey,
      sellerPublicKey as bsv.PublicKey
    );

    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    let { txComposer, sellAddress } = await this._sell2({
      genesis,
      codehash,
      tokenIndex,
      nftUtxo: nftInfo.nftUtxo,
      satoshisPrice,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      sellerPublicKey,
    });

    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }
    return {
      tx: txComposer.tx,
      txHex,
      txid: txComposer.tx.id,
      sellAddress: sellAddress.toString(),
    };
  }

  private async _sell2({
    genesis,
    codehash,
    tokenIndex,
    nftUtxo,
    satoshisPrice,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    sellerPublicKey,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    nftUtxo: NftUtxo;
    satoshisPrice: number;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;
    sellerPublicKey: bsv.PublicKey;
  }): Promise<{ txComposer: TxComposer; sellAddress: bsv.Address }> {
    if (utxos.length > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation, please merge it first "
      );
    }

    nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftUtxo,
      codehash,
      genesis
    );

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);

    let estimateSatoshis1 = await this._calSellEstimateFee({
      utxoMaxCount: utxos.length,
      opreturnData,
    });
    let estimateSatoshis = estimateSatoshis1;
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let nftSellContract = NftSellFactory.createContract(
      new Ripemd160(toHex(sellerPublicKey.toAddress().hashBuffer)),
      satoshisPrice,
      new Bytes(codehash),
      new Bytes(toHex(nftProto.getNftID(nftUtxo.lockingScript.toBuffer())))
    );
    nftSellContract.setFormatedDataPart({
      codehash,
      genesis,
      tokenIndex: BN.fromString(tokenIndex, 10),
      sellerAddress: toHex(sellerPublicKey.toAddress().hashBuffer),
      satoshisPrice: BN.fromNumber(satoshisPrice),
      nftID: toHex(nftProto.getNftID(nftUtxo.lockingScript.toBuffer())),
    });

    const txComposer = new TxComposer();

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: Utils.CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const nftSellOutputIndex = txComposer.appendOutput({
      lockingScript: nftSellContract.lockingScript,
      satoshis: this.getDustThreshold(
        nftSellContract.lockingScript.toBuffer().length
      ),
    });

    if (opreturnData) {
      txComposer.appendOpReturnOutput(opreturnData);
    }

    let changeOutputIndex = txComposer.appendChangeOutput(
      changeAddress,
      this.feeb
    );
    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);

    let sellAddress = new bsv.Address(
      TokenUtil.getScriptHashBuf(nftSellContract.lockingScript.toBuffer()),
      this.network
    );
    return { txComposer, sellAddress };
  }
  /**
   * Create a transaction and broadcast it to put off a NFT.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param sellerPrivateKey the private key of the token seller
   * @param satoshisPrice  the satoshis price to sell.
   * @param sellUtxo (Optional) sometimes you may need to specify the sellUtxo
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos which should be no more than 3
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @param middleChangeAddress (Optional) the middle bsv changeAddress
   * @param middlePrivateKey (Optional) the private key of the middle changeAddress
   * @returns
   */
  public async cancelSell({
    genesis,
    codehash,
    tokenIndex,

    sellerWif,
    sellerPrivateKey,

    sellUtxo,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,

    middleChangeAddress,
    middlePrivateKey,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    sellerWif?: string | bsv.PrivateKey;
    sellerPrivateKey?: string | bsv.PrivateKey;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;

    sellUtxo?: SellUtxo;
    middleChangeAddress?: string | bsv.Address;
    middlePrivateKey?: string | bsv.PrivateKey;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let sellerPublicKey: bsv.PublicKey;
    if (sellerWif) {
      sellerPrivateKey = new bsv.PrivateKey(sellerWif);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else if (sellerPrivateKey) {
      sellerPrivateKey = new bsv.PrivateKey(sellerPrivateKey);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        "sellerPrivateKey should be provided!"
      );
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      sellerPrivateKey as bsv.PrivateKey,
      sellerPublicKey as bsv.PublicKey
    );

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

    if (!sellUtxo) {
      sellUtxo = await this.sensibleApi.getNftSellUtxo(
        codehash,
        genesis,
        tokenIndex
      );
    }
    if (!sellUtxo) {
      throw new CodeError(
        ErrCode.EC_NFT_NOT_ON_SELL,
        "The NFT is not for sale because  the corresponding SellUtxo cannot be found."
      );
    }

    let { unlockCheckTxComposer, txComposer } = await this._cancelSell({
      genesis,
      codehash,
      nftUtxo: nftInfo.nftUtxo,
      nftPrivateKey: nftInfo.nftUtxoPrivateKey,
      sellUtxo,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      middlePrivateKey,
      middleChangeAddress,
    });

    let unlockCheckTxHex = unlockCheckTxComposer.getRawHex();
    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(unlockCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }
    return {
      tx: txComposer.tx,
      txHex,
      txid: txComposer.tx.id,
      unlockCheckTxId: unlockCheckTxComposer.getTxId(),
      unlockCheckTx: unlockCheckTxComposer.getTx(),
      unlockCheckTxHex: unlockCheckTxHex,
    };
  }

  private async _cancelSell({
    genesis,
    codehash,
    nftUtxo,
    nftPrivateKey,
    sellUtxo,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,

    middlePrivateKey,
    middleChangeAddress,
  }: {
    genesis: string;
    codehash: string;
    nftUtxo: NftUtxo;
    nftPrivateKey?: bsv.PrivateKey;
    sellUtxo: SellUtxo;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;

    middlePrivateKey?: bsv.PrivateKey;
    middleChangeAddress: bsv.Address;
  }): Promise<{ unlockCheckTxComposer: TxComposer; txComposer: TxComposer }> {
    if (utxos.length > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation, please merge it first "
      );
    }

    if (!middleChangeAddress) {
      middleChangeAddress = utxos[0].address;
      middlePrivateKey = utxoPrivateKeys[0];
    }

    nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftUtxo,
      codehash,
      genesis
    );

    let nftAddress = nftPrivateKey.toAddress(this.network);
    let nftSellTxHex = await this.sensibleApi.getRawTxData(sellUtxo.txId);
    let nftSellTx = new bsv.Transaction(nftSellTxHex);
    let nftSellUtxo = {
      txId: sellUtxo.txId,
      outputIndex: sellUtxo.outputIndex,
      satoshis: nftSellTx.outputs[sellUtxo.outputIndex].satoshis,
      lockingScript: nftSellTx.outputs[sellUtxo.outputIndex].script,
    };

    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calCancelSellEstimateFee({
      codehash,
      nftUtxoSatoshis: nftUtxo.satoshis,
      nftSellUtxo,
      genesisScript,
      utxoMaxCount: utxos.length,
      opreturnData,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let nftInput = nftUtxo;

    let nftID = nftProto.getNftID(nftInput.lockingScript.toBuffer());
    let unlockContract = NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_6
    );
    unlockContract.setFormatedDataPart({
      nftCodeHash: Buffer.from(codehash, "hex"),
      nftID,
    });

    const unlockCheckTxComposer = new TxComposer();

    //tx addInput utxo
    const unlockCheck_p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = unlockCheckTxComposer.appendP2PKHInput(utxo);
      unlockCheckTxComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const unlockCheckOutputIndex = unlockCheckTxComposer.appendOutput({
      lockingScript: unlockContract.lockingScript,
      satoshis: this.getDustThreshold(
        unlockContract.lockingScript.toBuffer().length
      ),
    });

    let changeOutputIndex = unlockCheckTxComposer.appendChangeOutput(
      middleChangeAddress,
      this.feeb
    );

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      unlockCheck_p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        unlockCheckTxComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    utxos = [
      {
        txId: unlockCheckTxComposer.getTxId(),
        satoshis: unlockCheckTxComposer.getOutput(changeOutputIndex).satoshis,
        outputIndex: changeOutputIndex,
        address: middleChangeAddress,
      },
    ];
    utxoPrivateKeys = utxos.map((v) => middlePrivateKey).filter((v) => v);

    let unlockCheckUtxo = {
      txId: unlockCheckTxComposer.getTxId(),
      outputIndex: unlockCheckOutputIndex,
      satoshis: unlockCheckTxComposer.getOutput(unlockCheckOutputIndex)
        .satoshis,
      lockingScript: unlockCheckTxComposer.getOutput(unlockCheckOutputIndex)
        .script,
    };

    let {
      rabinDatas,
      checkRabinData,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
    } = await getRabinDatas(this.signers, this.signerSelecteds, [
      nftUtxo.satotxInfo,
    ]);

    const txComposer = new TxComposer();
    let prevouts = new Prevouts();

    const nftSellInputIndex = txComposer.appendInput(nftSellUtxo);
    prevouts.addVout(nftSellUtxo.txId, nftSellUtxo.outputIndex);
    // let nftSellContract = NftSellFactory.createFromASM(
    //   nftSellUtxo.lockingScript.toASM()
    // );
    let nftSellContract = NftSellFactory.createContract(
      new Ripemd160(
        toHex(new bsv.Address(sellUtxo.sellerAddress, this.network).hashBuffer)
      ),
      sellUtxo.satoshisPrice,
      new Bytes(codehash),
      new Bytes(toHex(nftID))
    );
    nftSellContract.setFormatedDataPart(
      nftSellProto.parseDataPart(nftSellUtxo.lockingScript.toBuffer())
    );

    const nftInputIndex = txComposer.appendInput(nftInput);
    prevouts.addVout(nftInput.txId, nftInput.outputIndex);

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      prevouts.addVout(utxo.txId, utxo.outputIndex);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const unlockCheckInputIndex = txComposer.appendInput(unlockCheckUtxo);
    prevouts.addVout(unlockCheckUtxo.txId, unlockCheckUtxo.outputIndex);

    //tx addOutput nft
    const nftScriptBuf = nftInput.lockingScript.toBuffer();
    let dataPartObj = nftProto.parseDataPart(nftScriptBuf);
    dataPartObj.nftAddress = toHex(nftAddress.hashBuffer);
    const lockingScriptBuf = nftProto.updateScript(nftScriptBuf, dataPartObj);
    const nftOutputIndex = txComposer.appendOutput({
      lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
      satoshis: this.getDustThreshold(lockingScriptBuf.length),
    });

    //tx addOutput OpReturn
    let opreturnScriptHex = "";
    if (opreturnData) {
      const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
      opreturnScriptHex = txComposer
        .getOutput(opreturnOutputIndex)
        .script.toHex();
    }

    //The first round of calculations get the exact size of the final transaction, and then change again
    //Due to the change, the script needs to be unlocked again in the second round
    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      txComposer.clearChangeOutput();
      const changeOutputIndex = txComposer.appendChangeOutput(
        changeAddress,
        this.feeb
      );

      const nftContract = NftFactory.createContract(
        this.unlockContractCodeHashArray,
        codehash
      );
      let dataPartObj = nftProto.parseDataPart(
        nftInput.lockingScript.toBuffer()
      );
      nftContract.setFormatedDataPart(dataPartObj);
      const unlockingContract = nftContract.unlock({
        txPreimage: txComposer.getInputPreimage(nftInputIndex),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsg: rabinDatas[0].rabinMsg,
        rabinPaddingArray: rabinDatas[0].rabinPaddingArray,
        rabinSigArray: rabinDatas[0].rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        prevNftAddress: new Bytes(toHex(nftInput.preNftAddress.hashBuffer)),
        checkInputIndex: unlockCheckInputIndex,
        checkScriptTx: new Bytes(unlockCheckTxComposer.getRawHex()),
        checkScriptTxOutIndex: unlockCheckOutputIndex,
        lockContractInputIndex: nftSellInputIndex,
        lockContractTx: new Bytes(nftSellTxHex),
        lockContractTxOutIndex: nftSellUtxo.outputIndex,
        operation: nftProto.NFT_OP_TYPE.UNLOCK_FROM_CONTRACT,
      });

      if (this.debug) {
        let txContext = {
          tx: txComposer.tx,
          inputIndex: nftInputIndex,
          inputSatoshis: txComposer.getInput(nftInputIndex).output.satoshis,
        };
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(nftInputIndex)
        .setScript(unlockingContract.toScript() as bsv.Script);

      let otherOutputs = Buffer.alloc(0);
      txComposer.tx.outputs.forEach((output, index) => {
        if (index != nftOutputIndex) {
          let outputBuf = output.toBufferWriter().toBuffer();
          let lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32LE(outputBuf.length);
          otherOutputs = Buffer.concat([otherOutputs, lenBuf, outputBuf]);
        }
      });
      let unlockCall = unlockContract.unlock({
        txPreimage: txComposer.getInputPreimage(unlockCheckInputIndex),
        nftInputIndex,
        nftScript: new Bytes(nftInput.lockingScript.toHex()),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsg: checkRabinData.rabinMsg,
        rabinPaddingArray: checkRabinData.rabinPaddingArray,
        rabinSigArray: checkRabinData.rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        nOutputs: txComposer.tx.outputs.length,
        nftOutputIndex,
        nftOutputAddress: new Bytes(toHex(nftAddress.hashBuffer)),
        nftOutputSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
        otherOutputArray: new Bytes(toHex(otherOutputs)),
      });

      if (this.debug) {
        let txContext = {
          tx: txComposer.getTx(),
          inputIndex: unlockCheckInputIndex,
          inputSatoshis: txComposer.getInput(unlockCheckInputIndex).output
            .satoshis,
        };
        let ret = unlockCall.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(unlockCheckInputIndex)
        .setScript(unlockCall.toScript() as bsv.Script);

      let unlockCall2 = nftSellContract.unlock({
        txPreimage: txComposer.getInputPreimage(
          nftSellInputIndex,
          Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID
        ),
        nftScript: new Bytes(nftInput.lockingScript.toHex()),
        senderPubKey: new PubKey(toHex(nftPrivateKey.publicKey.toBuffer())),
        senderSig: new Sig(
          toHex(txComposer.getTxFormatSig(nftPrivateKey, nftSellInputIndex))
        ),
        nftOutputSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
        op: NFT_SELL_OP.CANCEL,
      });
      if (this.debug) {
        let txContext = {
          tx: txComposer.getTx(),
          inputIndex: nftSellInputIndex,
          inputSatoshis: txComposer.getInput(nftSellInputIndex).output.satoshis,
        };
        let ret = unlockCall2.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(nftSellInputIndex)
        .setScript(unlockCall2.toScript() as bsv.Script);
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);
    return { unlockCheckTxComposer, txComposer };
  }

  /**
   * Create a transaction and broadcast it to buy a NFT.
   * @param genesis the genesis of NFT.
   * @param codehash the codehash of NFT.
   * @param tokenIndex the tokenIndex of NFT.
   * @param buyerPrivateKey the private key of the token buyer
   * @param sellUtxo (Optional) sometimes you may need to specify the sellUtxo
   * @param opreturnData (Optional) append an opReturn output
   * @param utxos (Optional) specify bsv utxos which should be no more than 3
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @param middleChangeAddress (Optional) the middle bsv changeAddress
   * @param middlePrivateKey (Optional) the private key of the middle changeAddress
   * @returns
   */
  public async buy({
    genesis,
    codehash,
    tokenIndex,

    buyerWif,
    buyerPrivateKey,

    sellUtxo,
    opreturnData,
    utxos,
    changeAddress,
    noBroadcast = false,

    middleChangeAddress,
    middlePrivateKey,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    buyerWif?: string;
    buyerPrivateKey?: string | bsv.PrivateKey;
    sellUtxo?: SellUtxo;
    opreturnData?: any;
    utxos?: any[];
    changeAddress?: string | bsv.Address;
    noBroadcast?: boolean;

    middleChangeAddress?: string | bsv.Address;
    middlePrivateKey?: string | bsv.PrivateKey;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let buyerPublicKey: bsv.PublicKey;
    if (buyerWif) {
      buyerPrivateKey = new bsv.PrivateKey(buyerWif);
      buyerPublicKey = buyerPrivateKey.publicKey;
    } else if (buyerPrivateKey) {
      buyerPrivateKey = new bsv.PrivateKey(buyerPrivateKey);
      buyerPublicKey = buyerPrivateKey.publicKey;
    } else {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        "buyerPrivateKey should be provided!"
      );
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      buyerPrivateKey as bsv.PrivateKey,
      buyerPublicKey as bsv.PublicKey
    );

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

    if (!sellUtxo) {
      sellUtxo = await this.sensibleApi.getNftSellUtxo(
        codehash,
        genesis,
        tokenIndex
      );
    }

    if (!sellUtxo) {
      throw new CodeError(
        ErrCode.EC_NFT_NOT_ON_SELL,
        "The NFT is not for sale because  the corresponding SellUtxo cannot be found."
      );
    }

    let { unlockCheckTxComposer, txComposer } = await this._buy({
      genesis,
      codehash,
      nftUtxo: nftInfo.nftUtxo,
      buyerPrivateKey: buyerPrivateKey as bsv.PrivateKey,
      sellUtxo,
      opreturnData,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress,
      middlePrivateKey,
      middleChangeAddress,
    });

    let unlockCheckTxHex = unlockCheckTxComposer.getRawHex();
    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(unlockCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }
    return {
      tx: txComposer.tx,
      txHex,
      txid: txComposer.tx.id,
      unlockCheckTxId: unlockCheckTxComposer.getTxId(),
      unlockCheckTx: unlockCheckTxComposer.getTx(),
      unlockCheckTxHex: unlockCheckTxHex,
    };
  }

  private async _buy({
    genesis,
    codehash,
    nftUtxo,
    buyerPrivateKey,
    sellUtxo,
    opreturnData,
    utxos,
    utxoPrivateKeys,
    changeAddress,

    middlePrivateKey,
    middleChangeAddress,
  }: {
    genesis: string;
    codehash: string;
    nftUtxo: NftUtxo;
    buyerPrivateKey?: bsv.PrivateKey;
    sellUtxo: SellUtxo;
    opreturnData?: any;
    utxos: Utxo[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;

    middlePrivateKey?: bsv.PrivateKey;
    middleChangeAddress: bsv.Address;
  }): Promise<{ unlockCheckTxComposer: TxComposer; txComposer: TxComposer }> {
    if (utxos.length > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation, please merge it first "
      );
    }

    if (!middleChangeAddress) {
      middleChangeAddress = utxos[0].address;
      middlePrivateKey = utxoPrivateKeys[0];
    }

    let nftAddress = buyerPrivateKey.toAddress(this.network);
    let nftSellTxHex = await this.sensibleApi.getRawTxData(sellUtxo.txId);
    let nftSellTx = new bsv.Transaction(nftSellTxHex);
    let nftSellUtxo = {
      txId: sellUtxo.txId,
      outputIndex: sellUtxo.outputIndex,
      satoshis: nftSellTx.outputs[sellUtxo.outputIndex].satoshis,
      lockingScript: nftSellTx.outputs[sellUtxo.outputIndex].script,
    };

    nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftUtxo,
      codehash,
      genesis
    );

    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calBuyEstimateFee({
      codehash,
      nftUtxoSatoshis: nftUtxo.satoshis,
      nftSellUtxo,
      sellUtxo,
      genesisScript,
      utxoMaxCount: utxos.length,
      opreturnData,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let nftInput = nftUtxo;
    let nftID = nftProto.getNftID(nftInput.lockingScript.toBuffer());
    let unlockContract = NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_6
    );
    unlockContract.setFormatedDataPart({
      nftCodeHash: Buffer.from(codehash, "hex"),
      nftID,
    });

    const unlockCheckTxComposer = new TxComposer();

    //tx addInput utxo
    const unlockCheck_p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = unlockCheckTxComposer.appendP2PKHInput(utxo);
      unlockCheckTxComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const unlockCheckOutputIndex = unlockCheckTxComposer.appendOutput({
      lockingScript: unlockContract.lockingScript,
      satoshis: this.getDustThreshold(
        unlockContract.lockingScript.toBuffer().length
      ),
    });

    let changeOutputIndex = unlockCheckTxComposer.appendChangeOutput(
      middleChangeAddress,
      this.feeb
    );

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      unlockCheck_p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        unlockCheckTxComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    utxos = [
      {
        txId: unlockCheckTxComposer.getTxId(),
        satoshis: unlockCheckTxComposer.getOutput(changeOutputIndex).satoshis,
        outputIndex: changeOutputIndex,
        address: middleChangeAddress,
      },
    ];
    utxoPrivateKeys = utxos.map((v) => middlePrivateKey).filter((v) => v);

    let unlockCheckUtxo = {
      txId: unlockCheckTxComposer.getTxId(),
      outputIndex: unlockCheckOutputIndex,
      satoshis: unlockCheckTxComposer.getOutput(unlockCheckOutputIndex)
        .satoshis,
      lockingScript: unlockCheckTxComposer.getOutput(unlockCheckOutputIndex)
        .script,
    };

    let {
      rabinDatas,
      checkRabinData,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
    } = await getRabinDatas(this.signers, this.signerSelecteds, [
      nftUtxo.satotxInfo,
    ]);

    const txComposer = new TxComposer();
    let prevouts = new Prevouts();

    const nftSellInputIndex = txComposer.appendInput(nftSellUtxo);
    prevouts.addVout(nftSellUtxo.txId, nftSellUtxo.outputIndex);
    // let nftSellContract = NftSellFactory.createFromASM(
    //   nftSellUtxo.lockingScript.toASM()
    // );
    let nftSellContract = NftSellFactory.createContract(
      new Ripemd160(
        toHex(new bsv.Address(sellUtxo.sellerAddress, this.network).hashBuffer)
      ),
      sellUtxo.satoshisPrice,
      new Bytes(codehash),
      new Bytes(toHex(nftID))
    );

    nftSellContract.setFormatedDataPart(
      nftSellProto.parseDataPart(nftSellUtxo.lockingScript.toBuffer())
    );

    const nftInputIndex = txComposer.appendInput(nftInput);
    prevouts.addVout(nftInput.txId, nftInput.outputIndex);

    const p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = txComposer.appendP2PKHInput(utxo);
      prevouts.addVout(utxo.txId, utxo.outputIndex);
      txComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const unlockCheckInputIndex = txComposer.appendInput(unlockCheckUtxo);
    prevouts.addVout(unlockCheckUtxo.txId, unlockCheckUtxo.outputIndex);

    let sellerAddress = bsv.Address.fromPublicKeyHash(
      Buffer.from(
        nftSellContract.constuctParams.senderAddress.value as string,
        "hex"
      ),
      this.network
    );
    let sellerSatoshis = nftSellContract.constuctParams.bsvRecAmount;
    //tx addOutput sell
    txComposer.appendP2PKHOutput({
      address: sellerAddress,
      satoshis: sellerSatoshis,
    });

    //tx addOutput nft
    const nftScriptBuf = nftInput.lockingScript.toBuffer();
    let dataPartObj = nftProto.parseDataPart(nftScriptBuf);
    dataPartObj.nftAddress = toHex(nftAddress.hashBuffer);
    const lockingScriptBuf = nftProto.updateScript(nftScriptBuf, dataPartObj);
    const nftOutputIndex = txComposer.appendOutput({
      lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
      satoshis: this.getDustThreshold(lockingScriptBuf.length),
    });

    //tx addOutput OpReturn
    let opreturnScriptHex = "";
    if (opreturnData) {
      const opreturnOutputIndex = txComposer.appendOpReturnOutput(opreturnData);
      opreturnScriptHex = txComposer
        .getOutput(opreturnOutputIndex)
        .script.toHex();
    }

    //The first round of calculations get the exact size of the final transaction, and then change again
    //Due to the change, the script needs to be unlocked again in the second round
    //let the fee to be exact in the second round

    for (let c = 0; c < 2; c++) {
      txComposer.clearChangeOutput();
      const changeOutputIndex = txComposer.appendChangeOutput(
        changeAddress,
        this.feeb
      );

      const nftContract = NftFactory.createContract(
        this.unlockContractCodeHashArray,
        codehash
      );
      let dataPartObj = nftProto.parseDataPart(
        nftInput.lockingScript.toBuffer()
      );
      nftContract.setFormatedDataPart(dataPartObj);
      const unlockingContract = nftContract.unlock({
        txPreimage: txComposer.getInputPreimage(nftInputIndex),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsg: rabinDatas[0].rabinMsg,
        rabinPaddingArray: rabinDatas[0].rabinPaddingArray,
        rabinSigArray: rabinDatas[0].rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        prevNftAddress: new Bytes(toHex(nftInput.preNftAddress.hashBuffer)),
        checkInputIndex: unlockCheckInputIndex,
        checkScriptTx: new Bytes(unlockCheckTxComposer.getRawHex()),
        checkScriptTxOutIndex: unlockCheckOutputIndex,
        lockContractInputIndex: nftSellInputIndex,
        lockContractTx: new Bytes(nftSellTxHex),
        lockContractTxOutIndex: nftSellUtxo.outputIndex,
        operation: nftProto.NFT_OP_TYPE.UNLOCK_FROM_CONTRACT,
      });

      if (this.debug) {
        let txContext = {
          tx: txComposer.tx,
          inputIndex: nftInputIndex,
          inputSatoshis: txComposer.getInput(nftInputIndex).output.satoshis,
        };
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(nftInputIndex)
        .setScript(unlockingContract.toScript() as bsv.Script);

      let otherOutputs = Buffer.alloc(0);
      txComposer.tx.outputs.forEach((output, index) => {
        if (index != nftOutputIndex) {
          let outputBuf = output.toBufferWriter().toBuffer();
          let lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32LE(outputBuf.length);
          otherOutputs = Buffer.concat([otherOutputs, lenBuf, outputBuf]);
        }
      });
      let unlockCall = unlockContract.unlock({
        txPreimage: txComposer.getInputPreimage(unlockCheckInputIndex),
        nftInputIndex,
        nftScript: new Bytes(nftInput.lockingScript.toHex()),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsg: checkRabinData.rabinMsg,
        rabinPaddingArray: checkRabinData.rabinPaddingArray,
        rabinSigArray: checkRabinData.rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        nOutputs: txComposer.tx.outputs.length,
        nftOutputIndex,
        nftOutputAddress: new Bytes(toHex(nftAddress.hashBuffer)),
        nftOutputSatoshis: txComposer.getOutput(nftOutputIndex).satoshis,
        otherOutputArray: new Bytes(toHex(otherOutputs)),
      });

      if (this.debug) {
        let txContext = {
          tx: txComposer.getTx(),
          inputIndex: unlockCheckInputIndex,
          inputSatoshis: txComposer.getInput(unlockCheckInputIndex).output
            .satoshis,
        };
        let ret = unlockCall.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(unlockCheckInputIndex)
        .setScript(unlockCall.toScript() as bsv.Script);

      let unlockCall2 = nftSellContract.unlock({
        txPreimage: txComposer.getInputPreimage(
          nftSellInputIndex,
          Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID
        ),
        op: NFT_SELL_OP.SELL,
      });
      if (this.debug) {
        let txContext = {
          tx: txComposer.getTx(),
          inputIndex: nftSellInputIndex,
          inputSatoshis: txComposer.getInput(nftSellInputIndex).output.satoshis,
        };
        let ret = unlockCall2.verify(txContext);
        if (ret.success == false) throw ret;
      }
      txComposer
        .getInput(nftSellInputIndex)
        .setScript(unlockCall2.toScript() as bsv.Script);
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }

    this._checkTxFeeRate(txComposer);
    return { unlockCheckTxComposer, txComposer };
  }

  /**
   * Query the NFT list under this address.
   * @param address
   * @returns
   */
  async getSummary(address: string) {
    return await this.sensibleApi.getNonFungibleTokenSummary(address);
  }

  /**
   * Query a kind of NFT tokens held by address.
   * @param codehash the codehash of NFT
   * @param genesis the genesis of NFT
   * @param address owner address
   * @returns
   */
  async getSummaryDetail(
    codehash: string,
    genesis: string,
    address: string,
    cursor: number = 0,
    size: number = 20
  ) {
    return await this.sensibleApi.getNonFungibleTokenUnspents(
      codehash,
      genesis,
      address,
      cursor,
      size
    );
  }

  /**
   * Estimate the cost of genesis
   * The minimum cost required in the case of 10 utxo inputs
   * @param opreturnData
   * @param utxoMaxCount Maximum number of BSV UTXOs supported
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

    stx.addOutput(NftGenesisFactory.getLockingScriptSize());

    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();
    return stx.getFee();
  }

  /**
   * Estimate the cost of issue
   * The minimum cost required in the case of 10 utxo inputs .
   * @param sensibleId
   * @param genesisPublicKey
   * @param opreturnData
   * @param utxoMaxCount Maximum number of BSV UTXOs supported
   * @returns
   */
  async getIssueEstimateFee({
    sensibleId,
    genesisPublicKey,
    opreturnData,
    utxoMaxCount = 10,
  }: {
    sensibleId: string;
    genesisPublicKey: string | bsv.PublicKey;
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let { genesisUtxo } = await this._pretreatNftUtxoToIssue({
      sensibleId,
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
      NftGenesisFactory.calUnlockingScriptSize(opreturnData),
      genesisUtxoSatoshis
    );
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    stx.addOutput(NftGenesisFactory.getLockingScriptSize());

    stx.addOutput(NftFactory.getLockingScriptSize());
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
    genesisScript,
    opreturnData,
    utxoMaxCount,
  }: {
    nftUtxoSatoshis: number;
    genesisScript: Bytes;
    opreturnData: any;
    utxoMaxCount: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;
    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    stx.addInput(
      NftFactory.calUnlockingScriptSize(
        p2pkhInputNum,
        genesisScript,
        opreturnData,
        nftProto.NFT_OP_TYPE.TRANSFER
      ),
      nftUtxoSatoshis
    );
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    stx.addOutput(NftFactory.getLockingScriptSize());
    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();

    return stx.getFee();
  }

  /**
   * Estimate the cost of transfer
   * senderPrivateKey and senderPublicKey only need to provide one of them
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
    } else if (senderPublicKey) {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey as bsv.PublicKey
    );

    let nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftInfo.nftUtxo,
      codehash,
      genesis
    );

    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");
    return await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      genesisScript,
      opreturnData,
      utxoMaxCount,
    });
  }

  private async _calSellEstimateFee({
    utxoMaxCount,
    opreturnData,
  }: {
    utxoMaxCount: number;
    opreturnData: any;
  }) {
    let p2pkhInputNum = utxoMaxCount;

    let stx = new SizeTransaction(this.feeb, this.dustCalculator);

    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }
    stx.addOutput(NftSellFactory.getLockingScriptSize());
    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();

    return stx.getFee();
  }

  public async getSellEstimateFee({
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
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    if (senderWif) {
      senderPrivateKey = new bsv.PrivateKey(senderWif);
      senderPublicKey = senderPrivateKey.publicKey;
    } else if (senderPrivateKey) {
      senderPrivateKey = new bsv.PrivateKey(senderPrivateKey);
      senderPublicKey = senderPrivateKey.publicKey;
    } else if (senderPublicKey) {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey as bsv.PublicKey
    );

    let nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftInfo.nftUtxo,
      codehash,
      genesis
    );
    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let estimateSatoshis1 = await this._calSellEstimateFee({
      utxoMaxCount,
      opreturnData,
    });
    let estimateSatoshis2 = await this._calTransferEstimateFee({
      nftUtxoSatoshis: nftUtxo.satoshis,
      genesisScript,
      opreturnData,
      utxoMaxCount: 1,
    });
    return estimateSatoshis1 + estimateSatoshis2;
  }

  public async getSell2EstimateFee({
    genesis,
    codehash,

    opreturnData,
    utxoMaxCount = 3,
  }: {
    genesis: string;
    codehash: string;
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    let estimateSatoshis1 = await this._calSellEstimateFee({
      utxoMaxCount,
      opreturnData,
    });
    return estimateSatoshis1;
  }

  private async _calCancelSellEstimateFee({
    codehash,
    nftUtxoSatoshis,
    nftSellUtxo,
    genesisScript,
    opreturnData,
    utxoMaxCount,
  }: {
    codehash: string;
    nftUtxoSatoshis: number;
    nftSellUtxo: {
      txId: string;
      outputIndex: number;
      satoshis: number;
      lockingScript: any;
    };
    genesisScript: Bytes;
    opreturnData: any;
    utxoMaxCount: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;
    if (p2pkhInputNum > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation."
      );
    }

    let nftUnlockingSize = NftFactory.calUnlockingScriptSize(
      p2pkhInputNum,
      genesisScript,
      opreturnData,
      nftProto.NFT_OP_TYPE.UNLOCK_FROM_CONTRACT
    );
    let nftSize = NftFactory.getLockingScriptSize();

    let unlockContractSize = NftUnlockContractCheckFactory.getLockingScriptSize(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_6
    );

    let nftSellUnlockingSize = NftSellFactory.calUnlockingScriptSize(
      NFT_SELL_OP.CANCEL
    );

    let stx1 = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx1.addP2PKHInput();
    }
    stx1.addOutput(unlockContractSize);
    stx1.addP2PKHOutput();

    let stx2 = new SizeTransaction(this.feeb, this.dustCalculator);
    stx2.addInput(nftSellUnlockingSize, nftSellUtxo.satoshis);
    stx2.addInput(nftUnlockingSize, nftUtxoSatoshis);

    stx2.addP2PKHInput();

    let prevouts = new Prevouts();
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);

    let otherOutputsLen = 0;
    if (opreturnData) {
      otherOutputsLen =
        otherOutputsLen +
        4 +
        8 +
        4 +
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length;
    }
    otherOutputsLen = otherOutputsLen + 4 + 8 + 4 + 25;
    let otherOutputs = new Bytes(toHex(Buffer.alloc(otherOutputsLen, 0)));

    let unlockContractUnlockingSize =
      NftUnlockContractCheckFactory.calUnlockingScriptSize(
        NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
        new Bytes(prevouts.toHex()),
        otherOutputs
      );

    stx2.addInput(
      unlockContractUnlockingSize,
      this.dustCalculator.getDustThreshold(unlockContractSize)
    );

    stx2.addOutput(nftSize);

    if (opreturnData) {
      stx2.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }

    stx2.addP2PKHOutput();

    //dummy
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();

    return stx1.getFee() + stx2.getFee();
  }

  /**
   * Estimate the cost of cancel sell
   * senderPrivateKey and senderPublicKey only need to provide one of them
   */
  public async getCancelSellEstimateFee({
    genesis,
    codehash,
    tokenIndex,

    sellerWif,
    sellerPrivateKey,
    sellerPublicKey,
    sellUtxo,

    opreturnData,
    utxoMaxCount = 3,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    sellerWif?: string;
    sellerPrivateKey?: string | bsv.PrivateKey;
    sellerPublicKey?: string | bsv.PublicKey;
    sellUtxo?: SellUtxo;
    opreturnData?: any;

    utxoMaxCount?: number;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    if (sellerWif) {
      sellerPrivateKey = new bsv.PrivateKey(sellerWif);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else if (sellerPrivateKey) {
      sellerPrivateKey = new bsv.PrivateKey(sellerPrivateKey);
      sellerPublicKey = sellerPrivateKey.publicKey;
    } else if (sellerPublicKey) {
      sellerPublicKey = new bsv.PublicKey(sellerPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      sellerPrivateKey as bsv.PrivateKey,
      sellerPublicKey as bsv.PublicKey
    );

    if (!sellUtxo) {
      sellUtxo = await this.sensibleApi.getNftSellUtxo(
        codehash,
        genesis,
        tokenIndex
      );
    }
    if (!sellUtxo) {
      throw new CodeError(
        ErrCode.EC_NFT_NOT_ON_SELL,
        "The NFT is not for sale because  the corresponding SellUtxo cannot be found."
      );
    }

    let nftSellTxHex = await this.sensibleApi.getRawTxData(sellUtxo.txId);
    let nftSellTx = new bsv.Transaction(nftSellTxHex);
    let nftSellUtxo = {
      txId: sellUtxo.txId,
      outputIndex: sellUtxo.outputIndex,
      satoshis: nftSellTx.outputs[sellUtxo.outputIndex].satoshis,
      lockingScript: nftSellTx.outputs[sellUtxo.outputIndex].script,
    };

    let nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftInfo.nftUtxo,
      codehash,
      genesis
    );
    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let estimateSatoshis = await this._calCancelSellEstimateFee({
      codehash,
      nftUtxoSatoshis: nftUtxo.satoshis,
      nftSellUtxo,
      genesisScript,
      utxoMaxCount,
      opreturnData,
    });
    return estimateSatoshis;
  }

  private async _calBuyEstimateFee({
    codehash,
    nftUtxoSatoshis,
    nftSellUtxo,
    sellUtxo,
    genesisScript,
    opreturnData,
    utxoMaxCount,
  }: {
    codehash: string;
    nftUtxoSatoshis: number;
    sellUtxo: SellUtxo;
    nftSellUtxo: {
      txId: string;
      outputIndex: number;
      satoshis: number;
      lockingScript: any;
    };
    genesisScript: Bytes;
    opreturnData: any;
    utxoMaxCount: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;

    if (p2pkhInputNum > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in this operation."
      );
    }

    let nftUnlockingSize = NftFactory.calUnlockingScriptSize(
      p2pkhInputNum,
      genesisScript,
      opreturnData,
      nftProto.NFT_OP_TYPE.UNLOCK_FROM_CONTRACT
    );
    let nftSize = NftFactory.getLockingScriptSize();

    let unlockContractSize = NftUnlockContractCheckFactory.getLockingScriptSize(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_6
    );

    let dataPart = nftSellProto.parseDataPart(
      nftSellUtxo.lockingScript.toBuffer()
    );
    // let nftSellContract = NftSellFactory.createFromASM(
    //   nftSellUtxo.lockingScript.toASM()
    // );
    let nftSellContract = NftSellFactory.createContract(
      new Ripemd160(
        toHex(new bsv.Address(sellUtxo.sellerAddress, this.network).hashBuffer)
      ),
      sellUtxo.satoshisPrice,
      new Bytes(codehash),
      new Bytes(dataPart.nftID)
    );
    nftSellContract.setFormatedDataPart(
      nftSellProto.parseDataPart(nftSellUtxo.lockingScript.toBuffer())
    );

    let nftSellUnlockingSize = NftSellFactory.calUnlockingScriptSize(
      NFT_SELL_OP.SELL
    );

    let stx1 = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx1.addP2PKHInput();
    }
    stx1.addOutput(unlockContractSize);
    stx1.addP2PKHOutput();

    let stx2 = new SizeTransaction(this.feeb, this.dustCalculator);
    stx2.addInput(nftSellUnlockingSize, nftSellUtxo.satoshis);
    stx2.addInput(nftUnlockingSize, nftUtxoSatoshis);

    stx2.addP2PKHInput();

    let prevouts = new Prevouts();
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);
    prevouts.addVout(dummyTxId, 0);

    let otherOutputsLen = 0;
    if (opreturnData) {
      otherOutputsLen =
        otherOutputsLen +
        4 +
        8 +
        4 +
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length;
    }
    otherOutputsLen = otherOutputsLen + 4 + 8 + 4 + 25;
    let otherOutputs = new Bytes(toHex(Buffer.alloc(otherOutputsLen, 0)));

    let unlockContractUnlockingSize =
      NftUnlockContractCheckFactory.calUnlockingScriptSize(
        NFT_UNLOCK_CONTRACT_TYPE.OUT_6,
        new Bytes(prevouts.toHex()),
        otherOutputs
      );

    stx2.addInput(
      unlockContractUnlockingSize,
      this.dustCalculator.getDustThreshold(unlockContractSize)
    );

    stx2.addP2PKHOutput();
    stx2.addOutput(nftSize);

    if (opreturnData) {
      stx2.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }

    stx2.addP2PKHOutput();

    //dummy
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();
    stx2.addP2PKHInput();

    return (
      stx1.getFee() +
      stx2.getFee() +
      nftSellContract.constuctParams.bsvRecAmount
    );
  }

  /**
   * Estimate the cost of buy
   * buyerPrivateKey and buyerPublicKey only need to provide one of them
   */
  public async getBuyEstimateFee({
    genesis,
    codehash,
    tokenIndex,

    buyerWif,
    buyerPrivateKey,
    buyerPublicKey,
    sellUtxo,

    opreturnData,
    utxoMaxCount = 3,
  }: {
    genesis: string;
    codehash: string;
    tokenIndex: string;
    buyerWif?: string;
    buyerPrivateKey?: string | bsv.PrivateKey;
    buyerPublicKey?: string | bsv.PublicKey;
    sellUtxo?: SellUtxo;
    opreturnData?: any;

    utxoMaxCount?: number;
  }) {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);

    if (buyerWif) {
      buyerPrivateKey = new bsv.PrivateKey(buyerWif);
      buyerPublicKey = buyerPrivateKey.publicKey;
    } else if (buyerPrivateKey) {
      buyerPrivateKey = new bsv.PrivateKey(buyerPrivateKey);
      buyerPublicKey = buyerPrivateKey.publicKey;
    } else if (buyerPublicKey) {
      buyerPublicKey = new bsv.PublicKey(buyerPublicKey);
    }

    let nftInfo = await this._pretreatNftUtxoToTransfer(
      tokenIndex,
      codehash,
      genesis,
      buyerPrivateKey as bsv.PrivateKey,
      buyerPublicKey as bsv.PublicKey
    );

    if (!sellUtxo) {
      sellUtxo = await this.sensibleApi.getNftSellUtxo(
        codehash,
        genesis,
        tokenIndex
      );
    }
    if (!sellUtxo) {
      throw new CodeError(
        ErrCode.EC_NFT_NOT_ON_SELL,
        "The NFT is not for sale because  the corresponding SellUtxo cannot be found."
      );
    }

    let nftSellTxHex = await this.sensibleApi.getRawTxData(sellUtxo.txId);
    let nftSellTx = new bsv.Transaction(nftSellTxHex);
    let nftSellUtxo = {
      txId: sellUtxo.txId,
      outputIndex: sellUtxo.outputIndex,
      satoshis: nftSellTx.outputs[sellUtxo.outputIndex].satoshis,
      lockingScript: nftSellTx.outputs[sellUtxo.outputIndex].script,
    };

    let nftUtxo = await this._pretreatNftUtxoToTransferOn(
      nftInfo.nftUtxo,
      codehash,
      genesis
    );
    let genesisScript = nftUtxo.preNftAddress.hashBuffer.equals(
      Buffer.alloc(20, 0)
    )
      ? new Bytes(nftUtxo.preLockingScript.toHex())
      : new Bytes("");

    let estimateSatoshis = await this._calBuyEstimateFee({
      codehash,
      nftUtxoSatoshis: nftUtxo.satoshis,
      nftSellUtxo,
      sellUtxo,
      genesisScript,
      utxoMaxCount,
      opreturnData,
    });
    return estimateSatoshis;
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

  private _checkTxFeeRate(txComposer: TxComposer) {
    //Determine whether the final fee is sufficient
    let feeRate = txComposer.getFeeRate();
    if (feeRate < this.feeb) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
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
    //calculate genesis/codehash
    let genesis: string, codehash: string, sensibleId: string;
    let genesisTxId = genesisTx.id;
    let genesisLockingScriptBuf =
      genesisTx.outputs[genesisOutputIndex].script.toBuffer();
    const dataPartObj = nftProto.parseDataPart(genesisLockingScriptBuf);
    dataPartObj.sensibleID = {
      txid: genesisTxId,
      index: genesisOutputIndex,
    };
    genesisLockingScriptBuf = nftProto.updateScript(
      genesisLockingScriptBuf,
      dataPartObj
    );

    let tokenContract = NftFactory.createContract(
      this.unlockContractCodeHashArray
    );
    tokenContract.setFormatedDataPart({
      rabinPubKeyHashArrayHash: toHex(this.rabinPubKeyHashArrayHash),
      sensibleID: {
        txid: genesisTxId,
        index: genesisOutputIndex,
      },
      genesisHash: toHex(TokenUtil.getScriptHashBuf(genesisLockingScriptBuf)),
    });

    let scriptBuf = tokenContract.lockingScript.toBuffer();
    genesis = nftProto.getQueryGenesis(scriptBuf);
    codehash = tokenContract.getCodeHash();
    sensibleId = toHex(
      TokenUtil.getOutpointBuf(genesisTxId, genesisOutputIndex)
    );

    return { codehash, genesis, sensibleId };
  }

  /**
   * Check if codehash is supported
   * @param codehash
   * @returns
   */
  public static isSupportedToken(codehash: string): boolean {
    return [
      "0d0fc08db6e27dc0263b594d6b203f55fb5282e2",
      "22519e29424dc4b94b9273b6500ebadad7b9ad02",
    ].includes(codehash);
  }

  /**
   * Check if codehash and sensibleID is supported
   * @param codehash
   * @param sensibleId
   * @returns
   */
  public async isSupportedToken(codehash: string, sensibleId: string) {
    let { genesisTxId } = parseSensibleID(sensibleId);
    let txHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let tx = new bsv.Transaction(txHex);
    let dataPart = nftProto.parseDataPart(tx.outputs[0].script.toBuffer());
    if (
      dataPart.rabinPubKeyHashArrayHash != toHex(this.rabinPubKeyHashArrayHash)
    ) {
      return false;
    }
    if (!SensibleNFT.isSupportedToken(codehash)) {
      return false;
    }
    return true;
  }

  /**
   * parse a output script to get NFT info
   * @param scriptBuf
   * @param network
   * @returns
   */
  public static parseTokenScript(
    scriptBuf: Buffer,
    network: API_NET = API_NET.MAIN
  ): {
    codehash: string;
    genesis: string;
    sensibleId: string;
    metaidOutpoint: nftProto.MetaidOutpoint;
    genesisFlag: number;

    nftAddress: string;
    totalSupply: BN;
    tokenIndex: BN;
    genesisHash: string;
    rabinPubKeyHashArrayHash: string;
    sensibleID: nftProto.SensibleID;
    protoVersion: number;
    protoType: number;
  } {
    if (!hasProtoFlag(scriptBuf)) {
      return null;
    }
    const dataPart = nftProto.parseDataPart(scriptBuf);
    const nftAddress = bsv.Address.fromPublicKeyHash(
      Buffer.from(dataPart.nftAddress, "hex"),
      network
    ).toString();
    const genesis = nftProto.getQueryGenesis(scriptBuf);
    const codehash = nftProto.getQueryCodehash(scriptBuf);
    const sensibleId = nftProto.getQuerySensibleID(scriptBuf);
    return {
      codehash,
      genesis,
      sensibleId,
      metaidOutpoint: dataPart.metaidOutpoint,
      genesisFlag: dataPart.genesisFlag,
      nftAddress,
      totalSupply: dataPart.totalSupply,
      tokenIndex: dataPart.tokenIndex,
      genesisHash: dataPart.genesisHash,
      rabinPubKeyHashArrayHash: dataPart.rabinPubKeyHashArrayHash,
      sensibleID: dataPart.sensibleID,
      protoVersion: dataPart.protoVersion,
      protoType: dataPart.protoType,
    };
  }

  /**
   * query the supply info of NFT
   * @param sensibleId the sensibleId fo NFT
   * @returns
   */
  async getSupplyInfo(sensibleId: string) {
    let { genesisTxId, genesisOutputIndex } = parseSensibleID(sensibleId);
    let txHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let tx = new bsv.Transaction(txHex);
    let output = tx.outputs[genesisOutputIndex];

    let codehash = toHex(
      nftProto.getContractCodeHash(output.script.toBuffer())
    );

    let genesisUtxo = await this.getIssueUtxo(
      codehash,
      genesisTxId,
      genesisOutputIndex
    );

    let genesisTxHex = await this.sensibleApi.getRawTxData(genesisUtxo.txId);
    let genesisTx = new bsv.Transaction(genesisTxHex);
    let genesisOutput = genesisTx.outputs[genesisUtxo.outputIndex];
    let genesisInfo = SensibleNFT.parseTokenScript(
      genesisOutput.script.toBuffer()
    );
    return {
      totalSupply: genesisInfo.totalSupply.toString(10),
      circulation: genesisInfo.tokenIndex.toString(10),
    };
  }

  /**
   * Query sell list of NFT tokens
   * @param codehash the codehash of NFT
   * @param genesis the genesis of NFT
   * @param cursor cursor
   * @param size size of page
   * @returns
   */
  async getSellList(
    codehash: string,
    genesis: string,
    cursor: number = 0,
    size: number = 20
  ) {
    return await this.sensibleApi.getNftSellList(
      codehash,
      genesis,
      cursor,
      size
    );
  }

  /**
   * Query sell list of NFT tokens by seller's address
   * @param address seller's address
   * @param cursor cursor
   * @param size size of page
   * @returns
   */
  async getSellListByAddress(
    address: string,
    cursor: number = 0,
    size: number = 20
  ) {
    return await this.sensibleApi.getNftSellListByAddress(
      address,
      cursor,
      size
    );
  }
}
