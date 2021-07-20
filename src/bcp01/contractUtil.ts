import { Bytes } from "scryptlib";
import * as bsv from "../bsv";
import { NftFactory } from "./contract-factory/nft";
import { NftGenesisFactory } from "./contract-factory/nftGenesis";
import {
  NftUnlockContractCheckFactory,
  NFT_UNLOCK_CONTRACT_TYPE,
} from "./contract-factory/nftUnlockContractCheck";

function getConractCodeHash(contract): string {
  return Buffer.from(
    bsv.crypto.Hash.sha256ripemd160(contract.lockingScript.toBuffer())
  ).toString("hex");
}

function getNftUnlockContractCheckCodeHashArray(): string[] {
  let contractArray = [
    NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_3
    ),
    NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_6
    ),
    NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_10
    ),
    NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_20
    ),
    NftUnlockContractCheckFactory.createContract(
      NFT_UNLOCK_CONTRACT_TYPE.OUT_100
    ),
  ];
  return contractArray.map((v) => getConractCodeHash(v));
}

type ContractConfig = {
  transferCheckCodeHashArray: string[];
  unlockContractCodeHashArray: string[];
  tokenGenesisSize: number;
  tokenSize: number;
  tokenTransferCheckSizes: number[];
};
export class ContractUtil {
  static unlockContractCodeHashArray: Bytes[];
  static tokenCodeHash: string;
  public static init(config?: ContractConfig) {
    if (config) {
      this.unlockContractCodeHashArray = config.unlockContractCodeHashArray.map(
        (v) => new Bytes(v)
      );
      NftGenesisFactory.lockingScriptSize = config.tokenGenesisSize;
      NftFactory.lockingScriptSize = config.tokenSize;
    } else {
      this.unlockContractCodeHashArray = getNftUnlockContractCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      NftGenesisFactory.lockingScriptSize = NftGenesisFactory.calLockingScriptSize();
      NftFactory.lockingScriptSize = NftFactory.calLockingScriptSize();
    }

    let tokenContract = NftFactory.getDummyInstance();
    this.tokenCodeHash = tokenContract.getCodeHash();
  }
}
