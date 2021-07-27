import { Bytes } from "scryptlib";
import { NftFactory } from "./contract-factory/nft";
import { NftGenesisFactory } from "./contract-factory/nftGenesis";
import { NftSellFactory } from "./contract-factory/nftSell";
import {
  NftUnlockContractCheckFactory,
  NFT_UNLOCK_CONTRACT_TYPE,
} from "./contract-factory/nftUnlockContractCheck";

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
  return contractArray.map((v) => v.getCodeHash());
}

type ContractConfig = {
  unlockContractCodeHashArray: string[];
  tokenGenesisSize: number;
  tokenSize: number;
  nftSellSize: number;
  unlockContractSizes: number[];
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
      NftSellFactory.lockingScriptSize = config.nftSellSize;
      NftUnlockContractCheckFactory.unlockContractTypeInfos.forEach(
        (v, idx) => {
          v.lockingScriptSize = config.unlockContractSizes[idx];
        }
      );
    } else {
      this.unlockContractCodeHashArray = getNftUnlockContractCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      NftGenesisFactory.lockingScriptSize = NftGenesisFactory.calLockingScriptSize();
      NftFactory.lockingScriptSize = NftFactory.calLockingScriptSize();
      NftSellFactory.lockingScriptSize = NftSellFactory.calLockingScriptSize();
      NftUnlockContractCheckFactory.unlockContractTypeInfos.forEach(
        (v, idx) => {
          v.lockingScriptSize = NftUnlockContractCheckFactory.calLockingScriptSize(
            v.type
          );
        }
      );
    }

    let tokenContract = NftFactory.getDummyInstance();
    this.tokenCodeHash = tokenContract.getCodeHash();
  }
}
