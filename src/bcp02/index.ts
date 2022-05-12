import { Bytes, Int, PubKey, Ripemd160, Sig, toHex } from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import * as $ from "../common/argumentCheck";
import { dummyTxId } from "../common/dummy";
import { DustCalculator } from "../common/DustCalculator";
import { CodeError, ErrCode } from "../common/error";
import { Prevouts } from "../common/Prevouts";
import { hasProtoFlag } from "../common/protoheader";
import { SatotxSigner, SignerConfig } from "../common/SatotxSigner";
import {
  getRabinData,
  getRabinDatas,
  selectSigners,
} from "../common/satotxSignerUtil";
import { SizeTransaction } from "../common/SizeTransaction";
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import {
  CONTRACT_TYPE,
  PLACE_HOLDER_PUBKEY,
  PLACE_HOLDER_SIG,
  SigHashInfo,
  SigInfo,
} from "../common/utils";
import {
  API_NET,
  API_TARGET,
  FungibleTokenUnspent,
  SensibleApi,
  SensibleApiBase,
} from "../sensible-api";
import { TxComposer } from "../tx-composer";
import { TokenFactory } from "./contract-factory/token";
import { TokenGenesisFactory } from "./contract-factory/tokenGenesis";
import {
  TokenTransferCheckFactory,
  TOKEN_TRANSFER_TYPE,
} from "./contract-factory/tokenTransferCheck";
import * as ftProto from "./contract-proto/token.proto";
import { ContractUtil } from "./contractUtil";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
const PLACE_HOLDER_UNSIGN_TXID =
  "4444444444444444444444444444444888888888888888888888888888888888";
const PLACE_HOLDER_UNSIGN_TXID_REVERSE =
  "8888888888888888888888888888888884444444444444444444444444444444";
const PLACE_HOLDER_UNSIGN_PREVOUTS =
  "4444444444444444444444444444444444444444444444444444444444444444";
const PLACE_HOLDER_UNSIGN_CHECKTX = "PLACE_HOLDER_UNSIGN_CHECKTX";
const _ = bsv.deps._;
export const defaultSignerConfigs: SignerConfig[] = [
  {
    satotxApiPrefix: "https://s1.satoplay.cn,https://s1.satoplay.com",
    satotxPubKey:
      "2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455",
  },
  {
    satotxApiPrefix: "https://satotx.showpay.top,https://cnsatotx.showpay.top",
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
  address?: string | bsv.Address;
};

type ParamFtUtxo = {
  txId: string;
  outputIndex: number;
  tokenAddress: string;
  tokenAmount: string;
  wif?: string;
};

type Purse = {
  privateKey: bsv.PrivateKey;
  address: bsv.Address;
};

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
  if (signers.length != ftProto.SIGNER_NUM) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `only support ${ftProto.SIGNER_NUM} signers`
    );
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
      `NetworkFormatError:only support 'mainnet' and 'testnet'`
    );
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
  $.checkArgument(
    codehash == ContractUtil.tokenCodeHash,
    `a valid codehash should be ${ContractUtil.tokenCodeHash}, but the provided is ${codehash} `
  );
}

type TokenReceiver = {
  address: string;
  amount: string;
};

function checkParamReceivers(receivers: TokenReceiver[]) {
  const ErrorName = "ReceiversFormatError";
  if (Utils.isNull(receivers)) {
    throw new CodeError(
      ErrCode.EC_INVALID_ARGUMENT,
      `${ErrorName}: param should not be null`
    );
  }
  if (receivers.length > 0) {
    let receiver = receivers[0];
    if (Utils.isNull(receiver.address) || Utils.isNull(receiver.amount)) {
      throw new CodeError(
        ErrCode.EC_INVALID_ARGUMENT,
        `${ErrorName}-valid format example
      [
        {
          address: "mtjjuRuA84b2qVyo28AyJQ8AoUmpbWEqs3",
          amount: "1000",
        },
      ]
      `
      );
    }

    let amount = new BN(receiver.amount.toString());
    if (amount.lten(0)) {
      throw `receiver amount must greater than 0 but now is ${receiver.amount}`;
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

type MockData = {
  sensibleApi: SensibleApiBase;
  satotxSigners: SatotxSigner[];
};

export type Utxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  address: bsv.Address;
};

export type FtUtxo = {
  txId: string;
  outputIndex: number;
  satoshis?: number;
  lockingScript?: bsv.Script;

  tokenAddress?: bsv.Address;
  tokenAmount?: BN;

  satotxInfo?: {
    txId?: string;
    outputIndex?: number;
    txHex?: string;
    preTxId?: string;
    preOutputIndex?: number;
    preTxHex?: string;
  };

  preTokenAddress?: bsv.Address;
  preTokenAmount?: BN;
  preLockingScript?: bsv.Script;

  publicKey?: bsv.PublicKey;
};

/**
Sensible Fungible Token
 */
export class SensibleFT {
  private signers: SatotxSigner[];
  private feeb: number;
  private network: API_NET;
  private purse: Purse;
  public sensibleApi: SensibleApiBase;
  private zeroAddress: bsv.Address;
  private debug: boolean;
  private transferPart2?: any;
  private signerSelecteds: number[] = [];
  private dustCalculator?: DustCalculator;

  rabinPubKeyArray: Int[];
  rabinPubKeyHashArray: Bytes;
  rabinPubKeyHashArrayHash: Buffer;
  transferCheckCodeHashArray: Bytes[];
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
      if (signerSelecteds.length < ftProto.SIGNER_VERIFY_NUM) {
        throw new CodeError(
          ErrCode.EC_INVALID_ARGUMENT,
          `the length of signerSeleteds should not less than ${ftProto.SIGNER_VERIFY_NUM}`
        );
      }
      this.signerSelecteds = signerSelecteds;
    } else {
      for (let i = 0; i < ftProto.SIGNER_VERIFY_NUM; i++) {
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
    this.transferCheckCodeHashArray = ContractUtil.transferCheckCodeHashArray;
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
      ftProto.SIGNER_NUM,
      ftProto.SIGNER_VERIFY_NUM
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
        throw new CodeError(
          ErrCode.EC_INVALID_ARGUMENT,
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

    if (ftUtxos.length == 0)
      throw new CodeError(ErrCode.EC_INSUFFICIENT_FT, "Insufficient token.");

    return { ftUtxos, ftUtxoPrivateKeys };
  }

  /**
   * Create a transaction for genesis
   * @param tokenName token name, limited to 20 bytes
   * @param tokenSymbol the token symbol, limited to 10 bytes
   * @param decimalNum the decimal number, range 0-255
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
   * @param genesisWif the private key of the token genesiser
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
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
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
    genesisWif: string | bsv.PrivateKey;
    noBroadcast?: boolean;
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
      _.isString(tokenName) && Buffer.from(tokenName).length <= 20,
      `tokenName should be a string and not be larger than 20 bytes`
    );

    $.checkArgument(
      _.isString(tokenSymbol) && Buffer.from(tokenSymbol).length <= 10,
      "tokenSymbol should be a string and not be larger than 10 bytes"
    );

    $.checkArgument(
      _.isNumber(decimalNum) && decimalNum >= 0 && decimalNum <= 255,
      "decimalNum should be a number and must be between 0 and 255"
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
    let { txComposer } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      utxoPrivateKeys: utxoInfo.utxoPrivateKeys,
      changeAddress: changeAddress as bsv.Address,
      opreturnData,
      genesisPublicKey,
    });

    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }

    let { codehash, genesis, sensibleId } = this.getCodehashAndGensisByTx(
      txComposer.getTx()
    );
    return {
      txHex,
      txid: txComposer.getTxId(),
      tx: txComposer.getTx(),
      codehash,
      genesis,
      sensibleId,
    };
  }

  /**
   * create an unsigned transaction for genesis
   * @param tokenName token name, limited to 20 bytes
   * @param tokenSymbol the token symbol, limited to 10 bytes
   * @param decimalNum the decimal number, range 0-255
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
   * @param genesisPublicKey the public key of the token genesiser
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
   * @returns
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
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
    opreturnData?: any;
    genesisPublicKey: string | bsv.PublicKey;
  }): Promise<{
    tx: bsv.Transaction;
    sigHashList: SigHashInfo[];
  }> {
    //validate params
    $.checkArgument(
      _.isString(tokenName) && Buffer.from(tokenName).length <= 20,
      `tokenName should be a string and Buffer.from(tokenName).length must not be larger than 20`
    );

    $.checkArgument(
      _.isString(tokenSymbol) && Buffer.from(tokenSymbol).length <= 10,
      "tokenSymbol should be a string and Buffer.from(tokenSymbol).length must not be larger than 10"
    );

    $.checkArgument(
      _.isNumber(decimalNum) && decimalNum >= 0 && decimalNum <= 255,
      "decimalNum should be a number and must be between 0 and 255"
    );

    $.checkArgument(genesisPublicKey, "genesisPublicKey is required");
    let utxoInfo = await this._pretreatUtxos(utxos);
    if (changeAddress) {
      changeAddress = new bsv.Address(changeAddress, this.network);
    } else {
      changeAddress = utxoInfo.utxos[0].address;
    }
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let { txComposer } = await this._genesis({
      tokenName,
      tokenSymbol,
      decimalNum,
      utxos: utxoInfo.utxos,
      changeAddress: changeAddress as bsv.Address,
      opreturnData,
      genesisPublicKey,
    });

    return { tx: txComposer.getTx(), sigHashList: txComposer.getSigHashLit() };
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
    let genesisContract = TokenGenesisFactory.createContract(genesisPublicKey);
    genesisContract.setFormatedDataPart({
      tokenName,
      tokenSymbol,
      decimalNum,
      rabinPubKeyHashArrayHash: toHex(this.rabinPubKeyHashArrayHash),
    });

    let estimateSatoshis = await this.getGenesisEstimateFee({
      opreturnData,
      utxoMaxCount: utxos.length,
    });
    const balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }
    const txComposer = new TxComposer();
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
   * Issue tokens.
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param sensibleId the sensibleId of token.
   * @param genesisWif the private key of the token genesiser
   * @param receiverAddress the token receiver address
   * @param tokenAmount the token amount to issue
   * @param allowIncreaseIssues (Optional) if allow to increase issues.default is true
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
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
    utxos?: ParamUtxo[];
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
    let { txComposer } = await this._issue({
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

    let txHex = txComposer.getRawHex();
    if (!noBroadcast) {
      await this.sensibleApi.broadcast(txHex);
    }
    return { txHex, txid: txComposer.getTxId(), tx: txComposer.getTx() };
  }

  /**
   * Create the unsigned transaction for issue tokens,
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param genesisPublicKey the public key of the token genesiser
   * @param receiverAddress the token receiver address
   * @param tokenAmount the token amount to issue
   * @param allowIncreaseIssues (Optional) if allow to increase issues.default is true
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
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
    utxos?: ParamUtxo[];
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
    let { txComposer } = await this._issue({
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

    return { tx: txComposer.getTx(), sigHashList: txComposer.getSigHashLit() };
  }

  private async _getIssueUtxo(
    codehash: string,
    genesisTxId: string,
    genesisOutputIndex: number
  ): Promise<FtUtxo> {
    let unspent: FungibleTokenUnspent;
    let firstGenesisTxHex = await this.sensibleApi.getRawTxData(genesisTxId);
    let firstGenesisTx = new bsv.Transaction(firstGenesisTxHex);

    let scriptBuffer =
      firstGenesisTx.outputs[genesisOutputIndex].script.toBuffer();
    let originGenesis = ftProto.getQueryGenesis(scriptBuffer);
    let genesisUtxos = await this.sensibleApi.getFungibleTokenUnspents(
      codehash,
      originGenesis,
      this.zeroAddress.toString()
    );

    unspent = genesisUtxos.find(
      (v) => v.txId == genesisTxId && v.outputIndex == genesisOutputIndex
    );

    if (!unspent) {
      let _dataPartObj = ftProto.parseDataPart(scriptBuffer);
      _dataPartObj.sensibleID = {
        txid: genesisTxId,
        index: genesisOutputIndex,
      };
      let newScriptBuf = ftProto.updateScript(scriptBuffer, _dataPartObj);
      let issueGenesis = ftProto.getQueryGenesis(newScriptBuf);
      let issueUtxos = await this.sensibleApi.getFungibleTokenUnspents(
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

  private async _prepareIssueUtxo({
    sensibleId,
    genesisPublicKey,
  }: {
    sensibleId: string;
    genesisPublicKey: bsv.PublicKey;
  }) {
    let genesisContract = TokenGenesisFactory.createContract(genesisPublicKey);

    //Looking for UTXO for issue
    let { genesisTxId, genesisOutputIndex } = parseSensibleID(sensibleId);
    let genesisUtxo = await this._getIssueUtxo(
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
    let { genesisContract, genesisTxId, genesisOutputIndex, genesisUtxo } =
      await this._prepareIssueUtxo({ sensibleId, genesisPublicKey });

    let balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    let estimateSatoshis = await this._calIssueEstimateFee({
      genesisUtxoSatoshis: genesisUtxo.satoshis,
      opreturnData,
      allowIncreaseIssues,
      utxoMaxCount: utxos.length,
    });
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    let newGenesisContract = genesisContract.clone();
    newGenesisContract.setFormatedDataPart({
      sensibleID: {
        txid: genesisTxId,
        index: genesisOutputIndex,
      },
    });

    let tokenContract = TokenFactory.createContract(
      this.transferCheckCodeHashArray,
      this.unlockContractCodeHashArray
    );
    tokenContract.setFormatedDataPart(
      Object.assign({}, newGenesisContract.getFormatedDataPart(), {
        tokenAddress: toHex(receiverAddress.hashBuffer),
        tokenAmount,
        genesisHash: newGenesisContract.getScriptHash(),
      })
    );

    if (
      genesisContract.getFormatedDataPart().rabinPubKeyHashArrayHash !=
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
      contractType: CONTRACT_TYPE.BCP02_TOKEN_GENESIS,
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

    //If increase issues is allowed, add a new issue contract as the first output
    let newGenesisOutputIndex = -1;
    if (allowIncreaseIssues) {
      newGenesisOutputIndex = txComposer.appendOutput({
        lockingScript: newGenesisContract.lockingScript,
        satoshis: this.getDustThreshold(
          newGenesisContract.lockingScript.toBuffer().length
        ),
      });
    }

    //The following output is the Token
    const tokenOutputIndex = txComposer.appendOutput({
      lockingScript: tokenContract.lockingScript,
      satoshis: this.getDustThreshold(
        tokenContract.lockingScript.toBuffer().length
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

    //The first round of calculations get the exact size of the final transaction, and then change again
    //Due to the change, the script needs to be unlocked again in the second round
    //let the fee to be exact in the second round
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
        genesisSatoshis:
          newGenesisOutputIndex != -1
            ? txComposer.getOutput(newGenesisOutputIndex).satoshis
            : 0,
        tokenScript: new Bytes(
          txComposer.getOutput(tokenOutputIndex).script.toHex()
        ),
        tokenSatoshis: txComposer.getOutput(tokenOutputIndex).satoshis,
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
    return { txComposer };
  }

  /**
   * After deciding which ftUxtos to use, perfect the information of FtUtxo
   * txHex,preTxId,preOutputIndex,preTxHex,preTokenAddress,preTokenAmount
   */
  private async perfectFtUtxosInfo(
    ftUtxos: FtUtxo[],
    codehash: string,
    genesis: string
  ): Promise<FtUtxo[]> {
    //Cache txHex to prevent redundant queries
    let cachedHexs: {
      [txid: string]: { waitingRes?: Promise<string>; hex?: string };
    } = {};

    //Get txHex
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      if (!cachedHexs[ftUtxo.txId]) {
        cachedHexs[ftUtxo.txId] = {
          waitingRes: this.sensibleApi.getRawTxData(ftUtxo.txId), //async request
        };
      }
    }
    for (let id in cachedHexs) {
      //Wait for all async requests to complete
      if (cachedHexs[id].waitingRes && !cachedHexs[id].hex) {
        cachedHexs[id].hex = await cachedHexs[id].waitingRes;
      }
    }
    ftUtxos.forEach((v) => {
      v.satotxInfo = v.satotxInfo || {};
      v.satotxInfo.txHex = cachedHexs[v.txId].hex;
      v.satotxInfo.txId = v.txId;
      v.satotxInfo.outputIndex = v.outputIndex;
    });

    //Get preTxHex
    let curDataPartObj: ftProto.FormatedDataPart;
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      const tx = new bsv.Transaction(ftUtxo.satotxInfo.txHex);
      if (!curDataPartObj) {
        let tokenScript = tx.outputs[ftUtxo.outputIndex].script;
        curDataPartObj = ftProto.parseDataPart(tokenScript.toBuffer());
        if (
          curDataPartObj.rabinPubKeyHashArrayHash !=
          toHex(this.rabinPubKeyHashArrayHash)
        ) {
          throw new CodeError(
            ErrCode.EC_INNER_ERROR,
            "The currently used signers does not correspond to the token."
          );
        }
      }
      //Find a valid preTx
      let input = tx.inputs.find((input) => {
        let script = new bsv.Script(input.script);
        if (script.chunks.length > 0) {
          const lockingScriptBuf = TokenUtil.getLockingScriptFromPreimage(
            script.chunks[0].buf
          );
          if (lockingScriptBuf) {
            if (ftProto.getQueryGenesis(lockingScriptBuf) == genesis) {
              return true;
            }
            let dataPartObj = ftProto.parseDataPart(lockingScriptBuf);
            dataPartObj.sensibleID = curDataPartObj.sensibleID;
            const newScriptBuf = ftProto.updateScript(
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
      if (!input)
        throw new CodeError(
          ErrCode.EC_INNER_ERROR,
          "There is no valid preTx of the ftUtxo. "
        );
      let preTxId = input.prevTxId.toString("hex");
      let preOutputIndex = input.outputIndex;
      ftUtxo.satotxInfo.preTxId = preTxId;
      ftUtxo.satotxInfo.preOutputIndex = preOutputIndex;

      ftUtxo.satoshis = tx.outputs[ftUtxo.outputIndex].satoshis;
      ftUtxo.lockingScript = tx.outputs[ftUtxo.outputIndex].script;

      if (!cachedHexs[preTxId]) {
        cachedHexs[preTxId] = {
          waitingRes: this.sensibleApi.getRawTxData(preTxId),
        };
      }
    }
    for (let id in cachedHexs) {
      //Wait for all async requests to complete
      if (cachedHexs[id].waitingRes && !cachedHexs[id].hex) {
        cachedHexs[id].hex = await cachedHexs[id].waitingRes;
      }
    }
    ftUtxos.forEach((v) => {
      v.satotxInfo.preTxHex = cachedHexs[v.satotxInfo.preTxId].hex;

      const preTx = new bsv.Transaction(v.satotxInfo.preTxHex);
      let dataPartObj = ftProto.parseDataPart(
        preTx.outputs[v.satotxInfo.preOutputIndex].script.toBuffer()
      );
      v.preTokenAmount = dataPartObj.tokenAmount;
      if (
        dataPartObj.tokenAddress == "0000000000000000000000000000000000000000"
      ) {
        v.preTokenAddress = this.zeroAddress;
      } else {
        v.preTokenAddress = bsv.Address.fromPublicKeyHash(
          Buffer.from(dataPartObj.tokenAddress, "hex"),
          this.network
        );
      }
      v.preLockingScript = preTx.outputs[v.satotxInfo.preOutputIndex].script;
    });

    ftUtxos.forEach((v) => {
      v.preTokenAmount = new BN(v.preTokenAmount.toString());
    });

    return ftUtxos;
  }

  /**
   * Transfer tokens
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param receivers token receivers.[{address:'xxx',amount:'1000'}]
   * @param senderWif the private key of the token sender,can be wif or other format
   * @param ftUtxos (Optional) specify token utxos
   * @param ftChangeAddress (Optional) specify ft changeAddress 
   * @param utxos (Optional) specify bsv utxos which should be no more than 3 
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param middleChangeAddress (Optional) the middle bsv changeAddress
   * @param middlePrivateKey (Optional) the private key of the middle changeAddress
   * @param isMerge (Optional) do not use this param.Please use function Merge.
   * @param opreturnData (Optional) append an opReturn output
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false

   * @returns
   */
  public async transfer({
    codehash,
    genesis,
    receivers,

    senderWif,
    ftUtxos,
    ftChangeAddress,

    utxos,
    changeAddress,

    middleChangeAddress,
    middlePrivateKey,

    minUtxoSet = true,
    isMerge,
    opreturnData,
    noBroadcast = false,
  }: {
    codehash: string;
    genesis: string;
    receivers?: TokenReceiver[];

    senderWif?: string;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: string | bsv.Address;

    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;

    middleChangeAddress?: string | bsv.Address;
    middlePrivateKey?: string | bsv.PrivateKey;

    minUtxoSet?: boolean;
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

    let senderPrivateKey: bsv.PrivateKey;
    let senderPublicKey: bsv.PublicKey;
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

    let { txComposer, transferCheckTxComposer } = await this._transfer({
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
      minUtxoSet,
    });
    let routeCheckTxHex = transferCheckTxComposer.getRawHex();
    let txHex = txComposer.getRawHex();

    if (!noBroadcast) {
      await this.sensibleApi.broadcast(routeCheckTxHex);
      await this.sensibleApi.broadcast(txHex);
    }

    return {
      tx: txComposer.getTx(),
      txHex,
      routeCheckTx: transferCheckTxComposer.getTx(),
      routeCheckTxHex,
      txid: txComposer.getTxId(),
    };
  }

  /**
   * create the first part of unsigned transaction to transfer tokens.
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param receivers token receivers.[{address:'xxx',amount:'1000'}]
   * @param senderPublicKey the public key of the token sender
   * @param ftUtxos (Optional) specify token utxos
   * @param ftChangeAddress (Optional) specify ft changeAddress
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param middleChangeAddress (Optional) the middle bsv changeAddress
   * @param isMerge (Optional) specify if this is a merge
   * @param opreturnData (Optional) append an opReturn output
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
    minUtxoSet = true,
  }: {
    codehash: string;
    genesis: string;
    receivers?: TokenReceiver[];

    senderPublicKey?: string | bsv.PublicKey;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: string | bsv.Address;
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
    isMerge?: boolean;
    opreturnData?: any;
    middleChangeAddress?: string | bsv.Address;
    minUtxoSet?: boolean;
  }): Promise<{
    routeCheckTx: bsv.Transaction;
    routeCheckSigHashList: SigHashInfo[];
    unsignTxRaw: string;
  }> {
    checkParamGenesis(genesis);
    checkParamCodehash(codehash);
    checkParamReceivers(receivers);

    if (senderPublicKey) {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

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
      senderPublicKey as bsv.PublicKey
    );
    if (ftChangeAddress) {
      ftChangeAddress = new bsv.Address(ftChangeAddress, this.network);
    } else {
      ftChangeAddress = ftUtxoInfo.ftUtxos[0].tokenAddress;
    }

    let { transferCheckTxComposer, txComposer } = await this._transfer({
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
      minUtxoSet,
    });

    let routeCheckTx = transferCheckTxComposer.getTx();
    let routeCheckSigHashList = transferCheckTxComposer.getSigHashLit();

    let routeCheckTxBuf = routeCheckTx.toBuffer();
    let unsignTxRaw = JSON.stringify(txComposer.toObject())
      .replace(new RegExp(routeCheckTx.id, "g"), PLACE_HOLDER_UNSIGN_TXID)
      .replace(
        new RegExp(toHex(Buffer.from(routeCheckTx.id, "hex").reverse()), "g"),
        PLACE_HOLDER_UNSIGN_TXID_REVERSE
      )
      .replace(
        new RegExp(txComposer.getPrevoutsHash(), "g"),
        PLACE_HOLDER_UNSIGN_PREVOUTS
      )
      .replace(
        new RegExp(
          toHex(Utils.getVarPushdataHeader(routeCheckTxBuf.length)) +
            toHex(routeCheckTxBuf),
          "g"
        ),
        toHex(
          Utils.getVarPushdataHeader(
            Buffer.from(PLACE_HOLDER_UNSIGN_CHECKTX, "hex").length
          )
        ) + PLACE_HOLDER_UNSIGN_CHECKTX
      );

    return {
      routeCheckTx,
      routeCheckSigHashList,
      unsignTxRaw,
    };
  }

  public async unsignTransfer(
    routeCheckTx: bsv.Transaction,
    unsignTxRaw: string
  ): Promise<{
    tx: bsv.Transaction;
    sigHashList: SigHashInfo[];
  }> {
    let routeCheckTxBuf = routeCheckTx.toBuffer();
    unsignTxRaw = unsignTxRaw
      .replace(new RegExp(PLACE_HOLDER_UNSIGN_TXID, "g"), routeCheckTx.id)
      .replace(
        new RegExp(PLACE_HOLDER_UNSIGN_TXID_REVERSE, "g"),
        toHex(Buffer.from(routeCheckTx.id, "hex").reverse())
      )
      .replace(
        new RegExp(
          toHex(
            Utils.getVarPushdataHeader(
              Buffer.from(PLACE_HOLDER_UNSIGN_CHECKTX, "hex").length
            )
          ) + PLACE_HOLDER_UNSIGN_CHECKTX,
          "g"
        ),
        toHex(Utils.getVarPushdataHeader(routeCheckTxBuf.length)) +
          toHex(routeCheckTxBuf)
      );
    let txComposer = TxComposer.fromObject(JSON.parse(unsignTxRaw));
    unsignTxRaw = unsignTxRaw.replace(
      new RegExp(PLACE_HOLDER_UNSIGN_PREVOUTS, "g"),
      txComposer.getPrevoutsHash()
    );
    txComposer = TxComposer.fromObject(JSON.parse(unsignTxRaw));
    return {
      tx: txComposer.getTx(),
      sigHashList: txComposer.getSigHashLit(),
    };
  }

  private async _prepareTransferTokens({
    codehash,
    genesis,
    receivers,
    ftUtxos,
    ftChangeAddress,
    isMerge,
    minUtxoSet,
  }: {
    codehash: string;
    genesis: string;
    receivers?: TokenReceiver[];
    ftUtxos: FtUtxo[];
    ftChangeAddress: bsv.Address;
    isMerge?: boolean;
    minUtxoSet: boolean;
  }) {
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
          amount: mergeTokenAmountSum.toString(),
        },
      ];
    }

    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, this.network),
      tokenAmount: new BN(v.amount.toString()),
    }));

    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => cur.tokenAmount.add(pre),
      BN.Zero
    );

    let inputTokenAmountSum = BN.Zero;
    let _ftUtxos = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let ftUtxo = ftUtxos[i];
      _ftUtxos.push(ftUtxo);
      inputTokenAmountSum = ftUtxo.tokenAmount.add(inputTokenAmountSum);
      if (minUtxoSet && inputTokenAmountSum.gte(outputTokenAmountSum)) {
        break;
      }
    }

    if (isMerge) {
      _ftUtxos = mergeUtxos;
      inputTokenAmountSum = mergeTokenAmountSum;
      if (mergeTokenAmountSum.eq(BN.Zero)) {
        throw new CodeError(ErrCode.EC_INNER_ERROR, "No utxos to merge.");
      }
    }

    //Decide whether to change the token
    let changeTokenAmount = inputTokenAmountSum.sub(outputTokenAmountSum);
    if (changeTokenAmount.gt(BN.Zero)) {
      tokenOutputArray.push({
        address: ftChangeAddress,
        tokenAmount: changeTokenAmount,
      });
    }

    if (inputTokenAmountSum.lt(outputTokenAmountSum)) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_FT,
        `Insufficient token. Need ${outputTokenAmountSum} But only ${inputTokenAmountSum}`
      );
    }

    ftUtxos = _ftUtxos;
    await this.perfectFtUtxosInfo(ftUtxos, codehash, genesis);

    let tokenInputArray = ftUtxos;

    //Choose a transfer plan
    let inputLength = tokenInputArray.length;
    let outputLength = tokenOutputArray.length;
    let tokenTransferType = TokenTransferCheckFactory.getOptimumType(
      inputLength,
      outputLength
    );
    if (tokenTransferType == TOKEN_TRANSFER_TYPE.UNSUPPORT) {
      throw new CodeError(
        ErrCode.EC_TOO_MANY_FT_UTXOS,
        "Too many token-utxos, should merge them to continue."
      );
    }

    return {
      tokenInputArray,
      tokenOutputArray,
      tokenTransferType,
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
    minUtxoSet,
  }: {
    codehash: string;
    genesis: string;

    receivers?: TokenReceiver[];

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
    minUtxoSet: boolean;
  }) {
    if (utxos.length > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in the transfer operation, please merge it first "
      );
    }

    if (!middleChangeAddress) {
      middleChangeAddress = utxos[0].address;
      middlePrivateKey = utxoPrivateKeys[0];
    }

    let { tokenInputArray, tokenOutputArray, tokenTransferType } =
      await this._prepareTransferTokens({
        codehash,
        genesis,
        receivers,
        ftUtxos,
        ftChangeAddress,
        isMerge,
        minUtxoSet,
      });

    let estimateSatoshis = this._calTransferEstimateFee({
      p2pkhInputNum: utxos.length,
      tokenInputArray,
      tokenOutputArray,
      tokenTransferType,
      opreturnData,
    });

    const balance = utxos.reduce((pre, cur) => pre + cur.satoshis, 0);
    if (balance < estimateSatoshis) {
      throw new CodeError(
        ErrCode.EC_INSUFFICIENT_BSV,
        `Insufficient balance.It take more than ${estimateSatoshis}, but only ${balance}.`
      );
    }

    ftUtxos = tokenInputArray;
    const defaultFtUtxo = tokenInputArray[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.satotxInfo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;

    //create routeCheck contract
    let tokenTransferCheckContract =
      TokenTransferCheckFactory.createContract(tokenTransferType);
    tokenTransferCheckContract.setFormatedDataPart({
      nSenders: tokenInputArray.length,
      receiverTokenAmountArray: tokenOutputArray.map((v) => v.tokenAmount),

      receiverArray: tokenOutputArray.map((v) => v.address),
      nReceivers: tokenOutputArray.length,
      tokenCodeHash: toHex(
        ftProto.getContractCodeHash(tokenLockingScript.toBuffer())
      ),
      tokenID: toHex(ftProto.getTokenID(tokenLockingScript.toBuffer())),
    });

    const transferCheckTxComposer = new TxComposer();

    //tx addInput utxo
    const transferCheck_p2pkhInputIndexs = utxos.map((utxo) => {
      const inputIndex = transferCheckTxComposer.appendP2PKHInput(utxo);
      transferCheckTxComposer.addSigHashInfo({
        inputIndex,
        address: utxo.address.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.P2PKH,
      });
      return inputIndex;
    });

    const transferCheckOutputIndex = transferCheckTxComposer.appendOutput({
      lockingScript: tokenTransferCheckContract.lockingScript,
      satoshis: this.getDustThreshold(
        tokenTransferCheckContract.lockingScript.toBuffer().length
      ),
    });

    let changeOutputIndex = transferCheckTxComposer.appendChangeOutput(
      middleChangeAddress,
      this.feeb
    );
    let unsignSigPlaceHolderSize = 0;
    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      transferCheck_p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        transferCheckTxComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    } else {
      //To supplement the size calculation when unsigned
      transferCheck_p2pkhInputIndexs.forEach((v) => {
        unsignSigPlaceHolderSize += Utils.P2PKH_UNLOCK_SIZE;
      });
      //Each ftUtxo need to unlock with the size
      unsignSigPlaceHolderSize = unsignSigPlaceHolderSize * ftUtxos.length;
    }

    utxos = [
      {
        txId: transferCheckTxComposer.getTxId(),
        satoshis: transferCheckTxComposer.getOutput(changeOutputIndex).satoshis,
        outputIndex: changeOutputIndex,
        address: middleChangeAddress,
      },
    ];
    utxoPrivateKeys = utxos.map((v) => middlePrivateKey).filter((v) => v);

    let transferCheckUtxo = {
      txId: transferCheckTxComposer.getTxId(),
      outputIndex: transferCheckOutputIndex,
      satoshis: transferCheckTxComposer.getOutput(transferCheckOutputIndex)
        .satoshis,
      lockingScript: transferCheckTxComposer.getOutput(transferCheckOutputIndex)
        .script,
    };

    let transferCheckTx = transferCheckTxComposer.getTx();

    let {
      rabinDatas,
      checkRabinDatas,
      rabinPubKeyIndexArray,
      rabinPubKeyVerifyArray,
    } = await getRabinDatas(
      this.signers,
      this.signerSelecteds,
      ftUtxos.map((v) => v.satotxInfo)
    );

    const txComposer = new TxComposer();
    let prevouts = new Prevouts();

    let inputTokenScript: bsv.Script;
    let inputTokenAmountArray = Buffer.alloc(0);
    let inputTokenAddressArray = Buffer.alloc(0);

    const ftUtxoInputIndexs = ftUtxos.map((ftUtxo) => {
      const inputIndex = txComposer.appendInput(ftUtxo);
      prevouts.addVout(ftUtxo.txId, ftUtxo.outputIndex);
      txComposer.addSigHashInfo({
        inputIndex,
        address: ftUtxo.tokenAddress.toString(),
        sighashType,
        contractType: CONTRACT_TYPE.BCP02_TOKEN,
      });
      inputTokenScript = ftUtxo.lockingScript;
      inputTokenAddressArray = Buffer.concat([
        inputTokenAddressArray,
        ftUtxo.tokenAddress.hashBuffer,
      ]);

      inputTokenAmountArray = Buffer.concat([
        inputTokenAmountArray,
        ftUtxo.tokenAmount.toBuffer({
          endian: "little",
          size: 8,
        }),
      ]);
      return inputIndex;
    });

    //tx addInput utxo
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

    //添加routeCheck为最后一个输入
    const transferCheckInputIndex = txComposer.appendInput(transferCheckUtxo);
    prevouts.addVout(transferCheckUtxo.txId, transferCheckUtxo.outputIndex);

    let recervierArray = Buffer.alloc(0);
    let receiverTokenAmountArray = Buffer.alloc(0);
    let outputSatoshiArray = Buffer.alloc(0);
    const tokenOutputLen = tokenOutputArray.length;

    for (let i = 0; i < tokenOutputLen; i++) {
      const tokenOutput = tokenOutputArray[i];
      const address = tokenOutput.address;
      const outputTokenAmount = tokenOutput.tokenAmount;

      const lockingScriptBuf = ftProto.getNewTokenScript(
        inputTokenScript.toBuffer(),
        address.hashBuffer,
        outputTokenAmount
      );
      let outputIndex = txComposer.appendOutput({
        lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
        satoshis: this.getDustThreshold(lockingScriptBuf.length),
      });
      recervierArray = Buffer.concat([recervierArray, address.hashBuffer]);
      const tokenBuf = outputTokenAmount.toBuffer({
        endian: "little",
        size: 8,
      });
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        tokenBuf,
      ]);
      const satoshiBuf = BN.fromNumber(
        txComposer.getOutput(outputIndex).satoshis
      ).toBuffer({
        endian: "little",
        size: 8,
      });
      outputSatoshiArray = Buffer.concat([outputSatoshiArray, satoshiBuf]);
    }

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
        this.feeb,
        unsignSigPlaceHolderSize
      );
      let rabinPubKeyArray = [];
      for (let j = 0; j < ftProto.SIGNER_VERIFY_NUM; j++) {
        const signerIndex = rabinPubKeyIndexArray[j];
        rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
      }
      ftUtxoInputIndexs.forEach((inputIndex, idx) => {
        let ftUtxo = ftUtxos[idx];
        let senderPrivateKey = ftPrivateKeys[idx];

        let dataPartObj = ftProto.parseDataPart(
          ftUtxo.lockingScript.toBuffer()
        );
        if (
          dataPartObj.rabinPubKeyHashArrayHash !=
          toHex(this.rabinPubKeyHashArrayHash)
        ) {
          throw new CodeError(ErrCode.EC_INVALID_SIGNERS, "Invalid signers.");
        }
        const dataPart = ftProto.newDataPart(dataPartObj);

        const tokenContract = TokenFactory.createContract(
          this.transferCheckCodeHashArray,
          this.unlockContractCodeHashArray
        );

        tokenContract.setDataPart(toHex(dataPart));
        const unlockingContract = tokenContract.unlock({
          txPreimage: txComposer.getInputPreimage(inputIndex),
          tokenInputIndex: inputIndex,
          prevouts: new Bytes(prevouts.toHex()),
          rabinMsg: rabinDatas[idx].rabinMsg,
          rabinPaddingArray: rabinDatas[idx].rabinPaddingArray,
          rabinSigArray: rabinDatas[idx].rabinSigArray,
          rabinPubKeyIndexArray,
          rabinPubKeyVerifyArray,
          rabinPubKeyHashArray: this.rabinPubKeyHashArray,
          checkInputIndex: transferCheckInputIndex,
          checkScriptTx: new Bytes(transferCheckTx.serialize(true)),
          nReceivers: tokenOutputLen,
          prevTokenAddress: new Bytes(toHex(ftUtxo.preTokenAddress.hashBuffer)),
          prevTokenAmount: new Int(ftUtxo.preTokenAmount.toString(10)),
          senderPubKey: new PubKey(
            ftUtxo.publicKey
              ? toHex(ftUtxo.publicKey.toBuffer())
              : PLACE_HOLDER_PUBKEY
          ),
          senderSig: new Sig(
            senderPrivateKey
              ? toHex(txComposer.getTxFormatSig(senderPrivateKey, inputIndex))
              : PLACE_HOLDER_SIG
          ),
          operation: ftProto.OP_TRANSFER,
        });
        if (this.debug && senderPrivateKey) {
          let txContext = {
            tx: txComposer.getTx(),
            inputIndex: inputIndex,
            inputSatoshis: txComposer.getInput(inputIndex).output.satoshis,
          };
          let ret = unlockingContract.verify(txContext);
          if (ret.success == false) throw ret;
        }

        txComposer
          .getInput(inputIndex)
          .setScript(unlockingContract.toScript() as bsv.Script);
      });

      let unlockingContract = tokenTransferCheckContract.unlock({
        txPreimage: txComposer.getInputPreimage(transferCheckInputIndex),
        tokenScript: new Bytes(inputTokenScript.toHex()),
        prevouts: new Bytes(prevouts.toHex()),
        rabinMsgArray: checkRabinDatas.rabinMsgArray,
        rabinPaddingArray: checkRabinDatas.rabinPaddingArray,
        rabinSigArray: checkRabinDatas.rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        rabinPubKeyHashArray: this.rabinPubKeyHashArray,
        inputTokenAddressArray: new Bytes(toHex(inputTokenAddressArray)),
        inputTokenAmountArray: new Bytes(toHex(inputTokenAmountArray)),
        receiverSatoshiArray: new Bytes(toHex(outputSatoshiArray)),
        changeSatoshis: new Int(
          changeOutputIndex != -1
            ? txComposer.getOutput(changeOutputIndex).satoshis
            : 0
        ),
        changeAddress: new Ripemd160(toHex(changeAddress.hashBuffer)),
        opReturnScript: new Bytes(opreturnScriptHex),
      });

      if (this.debug) {
        let txContext = {
          tx: txComposer.getTx(),
          inputIndex: transferCheckInputIndex,
          inputSatoshis: txComposer.getInput(transferCheckInputIndex).output
            .satoshis,
        };
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }

      txComposer
        .getInput(transferCheckInputIndex)
        .setScript(unlockingContract.toScript() as bsv.Script);
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      p2pkhInputIndexs.forEach((inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        txComposer.unlockP2PKHInput(privateKey, inputIndex);
      });
    }
    this._checkTxFeeRate(txComposer);

    return { transferCheckTxComposer, txComposer };
  }

  /**
   * Create a transaction for merging tokens, merging up to 20 utxo
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param ownerWif the private key of the token owner,can be wif or other format
   * @param utxos (Optional) specify bsv utxos which should be no more than 3
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
   * @param noBroadcast (Optional) whether not to broadcast the transaction, the default is false
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
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
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
   * Create the first part of the unsigned transaction for merging tokens, merging up to 20 utxo
   * @param genesis the genesis of token.
   * @param codehash the codehash of token.
   * @param ownerPublicKey the public key of the token owner,can be string or other valid format
   * @param ftUtxos (Optional) specify token utxos
   * @param ftChangeAddress (Optional) specify token changeAddress
   * @param utxos (Optional) specify bsv utxos
   * @param changeAddress (Optional) specify bsv changeAddress
   * @param opreturnData (Optional) append an opReturn output
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
    ownerPublicKey: string | bsv.PublicKey;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: string | bsv.Address;
    utxos?: ParamUtxo[];
    changeAddress?: string | bsv.Address;
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

  public async unsignMerge(
    routeCheckTx: bsv.Transaction,
    unsignTxRaw: string
  ): Promise<{
    tx: bsv.Transaction;
    sigHashList: SigHashInfo[];
  }> {
    return await this.unsignTransfer(routeCheckTx, unsignTxRaw);
  }
  /**
   * Query token balance
   * @param codehash
   * @param genesis
   * @param address
   * @returns
   */
  public async getBalance({
    codehash,
    genesis,
    address,
  }: {
    codehash: string;
    genesis: string;
    address: string;
  }): Promise<string> {
    let { balance, pendingBalance } =
      await this.sensibleApi.getFungibleTokenBalance(
        codehash,
        genesis,
        address
      );
    return BN.fromString(balance, 10)
      .add(BN.fromString(pendingBalance, 10))
      .toString();
  }

  /**
   * Query token balance detail
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
  }): Promise<{
    balance: string;
    pendingBalance: string;
    utxoCount: number;
    decimal: number;
  }> {
    return await this.sensibleApi.getFungibleTokenBalance(
      codehash,
      genesis,
      address
    );
  }

  /**
   * Query the Token list under this address. Get the balance of each token
   * @param address
   * @returns
   */
  public async getSummary(address: string) {
    return await this.sensibleApi.getFungibleTokenSummary(address);
  }

  /**
   * Estimate the cost of genesis
   * @param opreturnData
   * @param utxoMaxCount Maximum number of BSV UTXOs supported
   * @returns
   */
  public async getGenesisEstimateFee({
    opreturnData,
    utxoMaxCount = 10,
  }: {
    opreturnData?: any;
    utxoMaxCount?: number;
  }) {
    const p2pkhInputNum = utxoMaxCount;
    const sizeOfTokenGenesis = TokenGenesisFactory.getLockingScriptSize();
    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }
    stx.addOutput(sizeOfTokenGenesis);
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
  public async getIssueEstimateFee({
    sensibleId,
    genesisPublicKey,
    opreturnData,
    allowIncreaseIssues = true,
    utxoMaxCount = 10,
  }: {
    sensibleId: string;
    genesisPublicKey: string | bsv.PublicKey;
    opreturnData?: any;
    allowIncreaseIssues: boolean;
    utxoMaxCount?: number;
  }) {
    genesisPublicKey = new bsv.PublicKey(genesisPublicKey);
    let { genesisUtxo } = await this._prepareIssueUtxo({
      sensibleId,
      genesisPublicKey,
    });
    return await this._calIssueEstimateFee({
      genesisUtxoSatoshis: genesisUtxo.satoshis,
      opreturnData,
      allowIncreaseIssues,
      utxoMaxCount,
    });
  }

  private async _calIssueEstimateFee({
    genesisUtxoSatoshis,
    opreturnData,
    allowIncreaseIssues = true,
    utxoMaxCount = 10,
  }: {
    genesisUtxoSatoshis: number;
    opreturnData?: any;
    allowIncreaseIssues: boolean;
    utxoMaxCount?: number;
  }) {
    let p2pkhInputNum = utxoMaxCount;

    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    stx.addInput(
      TokenGenesisFactory.calUnlockingScriptSize(opreturnData),
      genesisUtxoSatoshis
    );
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }

    if (allowIncreaseIssues) {
      stx.addOutput(TokenGenesisFactory.getLockingScriptSize());
    }

    stx.addOutput(TokenFactory.getLockingScriptSize());
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
    utxoMaxCount = 3,
    minUtxoSet = true,
  }: {
    codehash: string;
    genesis: string;
    receivers?: TokenReceiver[];

    senderWif?: string;
    senderPrivateKey?: string | bsv.PrivateKey;
    senderPublicKey?: string | bsv.PublicKey;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: string | bsv.Address;
    isMerge?: boolean;
    opreturnData?: any;
    utxoMaxCount?: number;
    minUtxoSet?: boolean;
  }) {
    let p2pkhInputNum = utxoMaxCount;
    if (p2pkhInputNum > 3) {
      throw new CodeError(
        ErrCode.EC_UTXOS_MORE_THAN_3,
        "Bsv utxos should be no more than 3 in the transfer operation. "
      );
    }

    if (senderWif) {
      senderPrivateKey = bsv.PrivateKey.fromWIF(senderWif);
      senderPublicKey = senderPrivateKey.toPublicKey();
    } else if (senderPrivateKey) {
      senderPrivateKey = new bsv.PrivateKey(senderPrivateKey);
      senderPublicKey = senderPrivateKey.toPublicKey();
    } else if (senderPublicKey) {
      senderPublicKey = new bsv.PublicKey(senderPublicKey);
    }

    let utxos: Utxo[] = [];
    for (let i = 0; i < p2pkhInputNum; i++) {
      utxos.push({
        txId: dummyTxId, //dummy
        outputIndex: i,
        satoshis: 1000,
        address: this.zeroAddress,
      });
    }

    let ftUtxoInfo = await this._pretreatFtUtxos(
      ftUtxos,
      codehash,
      genesis,
      senderPrivateKey as bsv.PrivateKey,
      senderPublicKey as bsv.PublicKey
    );
    if (ftChangeAddress) {
      ftChangeAddress = new bsv.Address(ftChangeAddress, this.network);
    } else {
      ftChangeAddress = ftUtxoInfo.ftUtxos[0].tokenAddress;
    }

    let { tokenInputArray, tokenOutputArray, tokenTransferType } =
      await this._prepareTransferTokens({
        codehash,
        genesis,
        receivers,
        ftUtxos: ftUtxoInfo.ftUtxos,
        ftChangeAddress,
        isMerge,
        minUtxoSet,
      });

    let estimateSatoshis = this._calTransferEstimateFee({
      p2pkhInputNum: utxos.length,
      tokenInputArray,
      tokenOutputArray,
      tokenTransferType,
      opreturnData,
    });

    return estimateSatoshis;
  }

  /**
   * Estimate the cost of merge
   */
  public async getMergeEstimateFee({
    codehash,
    genesis,
    ownerWif,
    ownerPublicKey,
    ftUtxos,
    ftChangeAddress,
    opreturnData,
    utxoMaxCount = 3,
    minUtxoSet = true,
  }: {
    codehash: string;
    genesis: string;
    ownerWif?: string;
    ownerPublicKey?: string | bsv.PublicKey;
    ftUtxos?: ParamFtUtxo[];
    ftChangeAddress?: string | bsv.Address;
    opreturnData?: any;
    utxoMaxCount?: number;
    minUtxoSet?: boolean;
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
      utxoMaxCount,
      minUtxoSet,
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

  private _calTransferEstimateFee({
    p2pkhInputNum = 10,
    tokenInputArray,
    tokenOutputArray,
    tokenTransferType,
    opreturnData,
  }: {
    p2pkhInputNum: number;
    tokenInputArray: FtUtxo[];
    tokenOutputArray: { address: bsv.Address; tokenAmount: BN }[];
    tokenTransferType: TOKEN_TRANSFER_TYPE;
    opreturnData: any;
  }) {
    let inputTokenNum = tokenInputArray.length;
    let outputTokenNum = tokenOutputArray.length;
    let dummyTransferCheckContract =
      TokenTransferCheckFactory.getDummyInstance(tokenTransferType);
    let routeCheckLockingSize =
      TokenTransferCheckFactory.getLockingScriptSize(tokenTransferType);
    let routeCheckUnlockingSize =
      TokenTransferCheckFactory.calUnlockingScriptSize(
        tokenTransferType,
        p2pkhInputNum,
        inputTokenNum,
        outputTokenNum,
        opreturnData
      );
    let tokenUnlockingSize = TokenFactory.calUnlockingScriptSize(
      dummyTransferCheckContract,
      p2pkhInputNum,
      inputTokenNum,
      outputTokenNum
    );

    let tokenLockingSize = TokenFactory.getLockingScriptSize();

    let stx1 = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx1.addP2PKHInput();
    }
    stx1.addOutput(routeCheckLockingSize);
    stx1.addP2PKHOutput();

    let stx = new SizeTransaction(this.feeb, this.dustCalculator);
    for (let i = 0; i < inputTokenNum; i++) {
      stx.addInput(tokenUnlockingSize, tokenInputArray[i].satoshis);
    }
    for (let i = 0; i < p2pkhInputNum; i++) {
      stx.addP2PKHInput();
    }
    stx.addInput(
      routeCheckUnlockingSize,
      this.dustCalculator.getDustThreshold(routeCheckLockingSize)
    );

    for (let i = 0; i < outputTokenNum; i++) {
      stx.addOutput(tokenLockingSize);
    }
    if (opreturnData) {
      stx.addOpReturnOutput(
        bsv.Script.buildSafeDataOut(opreturnData).toBuffer().length
      );
    }
    stx.addP2PKHOutput();
    return stx1.getFee() + stx.getFee();
  }

  /**
   * Estimate the cost of transfer
   */
  public async getTransferEstimateFee2({
    bsvInputLen,
    tokenInputLen,
    tokenOutputLen,
    opreturnData,
  }: {
    bsvInputLen: number;
    tokenInputLen: number;
    tokenOutputLen: number;
    opreturnData?: any;
  }) {
    let tokenTransferType = TokenTransferCheckFactory.getOptimumType(
      tokenInputLen,
      tokenOutputLen
    );
    if (tokenTransferType == TOKEN_TRANSFER_TYPE.UNSUPPORT) {
      throw new CodeError(
        ErrCode.EC_TOO_MANY_FT_UTXOS,
        "Too many token-utxos, should merge them to continue."
      );
    }

    let dustAmount = this.getDustThreshold(TokenFactory.getLockingScriptSize());
    let tokenInputArray = [];
    for (let i = 0; i < tokenInputLen; i++) {
      tokenInputArray.push({ satoshis: dustAmount });
    }
    let tokenOutputArray = [];
    for (let i = 0; i < tokenOutputLen; i++) {
      tokenOutputArray.push({});
    }
    let estimateSatoshis = this._calTransferEstimateFee({
      p2pkhInputNum: bsvInputLen,
      tokenInputArray,
      tokenOutputArray,
      tokenTransferType,
      opreturnData,
    });

    return estimateSatoshis;
  }
  /**
   * Print tx
   * @param tx
   */
  public dumpTx(tx: bsv.Transaction) {
    Utils.dumpTx(tx, this.network);
  }

  /**
   * Query token's utxos
   * @param codehash
   * @param genesis
   * @param address
   * @param count
   * @returns
   */
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

  /**
   * Check if codehash is supported
   * @param codehash
   * @returns
   */
  public static isSupportedToken(codehash: string): boolean {
    return codehash == ContractUtil.tokenCodeHash;
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
    let dataPart = ftProto.parseDataPart(tx.outputs[0].script.toBuffer());
    if (
      dataPart.rabinPubKeyHashArrayHash != toHex(this.rabinPubKeyHashArrayHash)
    ) {
      return false;
    }
    if (codehash != ContractUtil.tokenCodeHash) {
      return false;
    }
    return true;
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
    const dataPartObj = ftProto.parseDataPart(genesisLockingScriptBuf);
    dataPartObj.sensibleID = {
      txid: genesisTxId,
      index: genesisOutputIndex,
    };
    genesisLockingScriptBuf = ftProto.updateScript(
      genesisLockingScriptBuf,
      dataPartObj
    );

    let tokenContract = TokenFactory.createContract(
      this.transferCheckCodeHashArray,
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
    genesis = ftProto.getQueryGenesis(scriptBuf);
    codehash = tokenContract.getCodeHash();
    sensibleId = toHex(
      TokenUtil.getOutpointBuf(genesisTxId, genesisOutputIndex)
    );

    return { codehash, genesis, sensibleId };
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
   * parse a output script to get Token info
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
    tokenName: string;
    tokenSymbol: string;
    genesisFlag: number;
    decimalNum: number;
    tokenAddress: string;
    tokenAmount: BN;
    genesisHash: string;
    rabinPubKeyHashArrayHash: string;
    sensibleID: ftProto.SensibleID;
    protoVersion: number;
    protoType: number;
  } {
    if (!hasProtoFlag(scriptBuf)) {
      return null;
    }
    const dataPart = ftProto.parseDataPart(scriptBuf);
    const tokenAddress = bsv.Address.fromPublicKeyHash(
      Buffer.from(dataPart.tokenAddress, "hex"),
      network
    ).toString();
    const genesis = ftProto.getQueryGenesis(scriptBuf);
    const codehash = ftProto.getQueryCodehash(scriptBuf);
    const sensibleId = ftProto.getQuerySensibleID(scriptBuf);
    return {
      codehash,
      genesis,
      sensibleId,
      tokenName: dataPart.tokenName,
      tokenSymbol: dataPart.tokenSymbol,
      genesisFlag: dataPart.genesisFlag,
      decimalNum: dataPart.decimalNum,
      tokenAddress,
      tokenAmount: dataPart.tokenAmount,
      genesisHash: dataPart.genesisHash,
      rabinPubKeyHashArrayHash: dataPart.rabinPubKeyHashArrayHash,
      sensibleID: dataPart.sensibleID,
      protoVersion: dataPart.protoVersion,
      protoType: dataPart.protoType,
    };
  }
}
