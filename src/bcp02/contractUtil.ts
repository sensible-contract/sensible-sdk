import { Bytes, toHex } from "scryptlib";
import * as bsv from "../bsv";
import { TokenFactory } from "./contract-factory/token";
import { TokenGenesisFactory } from "./contract-factory/tokenGenesis";
import {
  TokenTransferCheckFactory,
  TOKEN_TRANSFER_TYPE,
} from "./contract-factory/tokenTransferCheck";
import {
  TokenUnlockContractCheckFactory,
  TOKEN_UNLOCK_TYPE,
} from "./contract-factory/tokenUnlockContractCheck";
import BN = require("../bn.js");

function getTokenTransferCheckCodeHashArray(): string[] {
  let contractArray = [
    TokenTransferCheckFactory.createContract(TOKEN_TRANSFER_TYPE.IN_3_OUT_3),
    TokenTransferCheckFactory.createContract(TOKEN_TRANSFER_TYPE.IN_6_OUT_6),
    TokenTransferCheckFactory.createContract(TOKEN_TRANSFER_TYPE.IN_10_OUT_10),
    TokenTransferCheckFactory.createContract(TOKEN_TRANSFER_TYPE.IN_20_OUT_3),
    TokenTransferCheckFactory.createContract(TOKEN_TRANSFER_TYPE.IN_3_OUT_100),
  ];
  return contractArray.map((v) => v.getCodeHash());
}

function getTokenUnlockContractCheckCodeHashArray(): string[] {
  let contractArray = [
    TokenUnlockContractCheckFactory.createContract(
      TOKEN_UNLOCK_TYPE.IN_2_OUT_5
    ),
    TokenUnlockContractCheckFactory.createContract(
      TOKEN_UNLOCK_TYPE.IN_4_OUT_8
    ),
    TokenUnlockContractCheckFactory.createContract(
      TOKEN_UNLOCK_TYPE.IN_8_OUT_12
    ),
    TokenUnlockContractCheckFactory.createContract(
      TOKEN_UNLOCK_TYPE.IN_20_OUT_5
    ),
    TokenUnlockContractCheckFactory.createContract(
      TOKEN_UNLOCK_TYPE.IN_3_OUT_100
    ),
  ];
  return contractArray.map((v) => v.getCodeHash());
}

type ContractConfig = {
  transferCheckCodeHashArray: string[];
  unlockContractCodeHashArray: string[];
  tokenGenesisSize: number;
  tokenSize: number;
  tokenTransferCheckSizes: number[];
};
export class ContractUtil {
  static transferCheckCodeHashArray: Bytes[];
  static unlockContractCodeHashArray: Bytes[];
  static tokenCodeHash: string;
  public static init(config?: ContractConfig) {
    if (config) {
      this.transferCheckCodeHashArray = config.transferCheckCodeHashArray.map(
        (v) => new Bytes(v)
      );
      this.unlockContractCodeHashArray = config.unlockContractCodeHashArray.map(
        (v) => new Bytes(v)
      );
      TokenGenesisFactory.lockingScriptSize = config.tokenGenesisSize;
      TokenFactory.lockingScriptSize = config.tokenSize;
      TokenTransferCheckFactory.tokenTransferTypeInfos.forEach((v, idx) => {
        v.lockingScriptSize = config.tokenTransferCheckSizes[idx];
      });
    } else {
      this.transferCheckCodeHashArray = getTokenTransferCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      this.unlockContractCodeHashArray = getTokenUnlockContractCheckCodeHashArray().map(
        (v) => new Bytes(v)
      );
      TokenGenesisFactory.lockingScriptSize = TokenGenesisFactory.calLockingScriptSize();
      TokenFactory.lockingScriptSize = TokenFactory.calLockingScriptSize();
      TokenTransferCheckFactory.tokenTransferTypeInfos.forEach((v, idx) => {
        v.lockingScriptSize = TokenTransferCheckFactory.calLockingScriptSize(
          v.type
        );
      });
    }

    let tokenContract = TokenFactory.getDummyInstance();
    tokenContract.setDataPart("");
    let scriptBuf = tokenContract.lockingScript.toBuffer();
    this.tokenCodeHash = toHex(bsv.crypto.Hash.sha256ripemd160(scriptBuf));
  }
}
