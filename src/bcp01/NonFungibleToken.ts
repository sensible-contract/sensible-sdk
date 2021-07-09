import {
  Bytes,
  getPreimage,
  Int,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  signTx,
  toHex,
} from "scryptlib";
import * as BN from "../bn.js";
import * as bsv from "../bsv";
import { CodeError, ErrCode } from "../common/error";
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import { PUBKEY_PLACE_HOLDER, SIG_PLACE_HOLDER } from "../common/utils";
import { ContractUtil, Nft, NftGenesis } from "./contractUtil";
import * as NftProto from "./nftProto";
import { SIGNER_VERIFY_NUM } from "./nftProto";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;

const P2PKH_UNLOCK_SIZE = 1 + 1 + 71 + 1 + 33;

export type Utxo = {
  txId: string;
  outputIndex: number;
  satoshis: number;
  address: bsv.Address;
};

export type NftUtxo = {
  txId: string;
  outputIndex: number;
  nftAddress: bsv.Address;

  txHex?: string;
  satoshis?: number;
  lockingScript?: bsv.Script;
  preTxId?: string;
  preOutputIndex?: number;
  preTxHex?: string;
  preNftAddress?: bsv.Address;
  preLockingScript?: bsv.Script;

  publicKey: bsv.PublicKey;
  inputIndex?: number;
};

export class NonFungibleToken {
  rabinPubKeyArray: Int[];
  rabinPubKeyHashArray: Buffer;
  rabinPubKeyHashArrayHash: Buffer;
  unlockContractCodeHashArray: Bytes[];
  constructor(rabinPubKeys: BN[]) {
    this.rabinPubKeyHashArray = TokenUtil.getRabinPubKeyHashArray(rabinPubKeys);
    this.rabinPubKeyHashArrayHash = bsv.crypto.Hash.sha256ripemd160(
      this.rabinPubKeyHashArray
    );
    this.rabinPubKeyArray = rabinPubKeys.map((v) => new Int(v.toString(10)));
    this.unlockContractCodeHashArray = ContractUtil.unlockContractCodeHashArray;
  }

  /**
   * create a tx for genesis
   * @param {bsv.PrivateKey} privateKey the privatekey that utxos belong to
   * @param {Object[]} utxos utxos
   * @param {bsv.Address} changeAddress the change address
   * @param {number} feeb feeb
   * @param {Object} genesisScript genesis contract's locking scriptsatoshis
   * @param {Array=} utxoPrivateKeys
   * @param {string|Array=} opreturnData
   */
  createGenesisTx({
    utxos,
    changeAddress,
    feeb,
    genesisContract,
    utxoPrivateKeys,
    opreturnData,
  }: {
    utxos: Utxo[];
    changeAddress: bsv.Address;
    feeb: number;
    genesisContract: any;
    utxoPrivateKeys?: bsv.PrivateKey[];
    opreturnData?: any;
  }) {
    const tx = new bsv.Transaction();
    //Add utxo as input
    utxos.forEach((utxo) => {
      tx.addInput(
        new bsv.Transaction.Input.PublicKeyHash({
          output: new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(utxo.address),
            satoshis: utxo.satoshis,
          }),
          prevTxId: utxo.txId,
          outputIndex: utxo.outputIndex,
          script: bsv.Script.empty(),
        })
      );
    });

    //The first output is the genesis contract
    tx.addOutput(
      new bsv.Transaction.Output({
        script: genesisContract.lockingScript,
        satoshis: Utils.getDustThreshold(
          genesisContract.lockingScript.toBuffer().length
        ),
      })
    );

    //If there is opReturn, add it to the second output
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }

    //Calculate the fee and determine whether to change
    //If there is change, it will be output in the last item
    const unlockSize = utxos.length * P2PKH_UNLOCK_SIZE;
    tx.fee(Math.ceil((tx.toBuffer().length + unlockSize) * feeb));
    let changeAmount = tx._getUnspentValue() - tx.getFee();
    if (
      changeAmount >=
      bsv.Transaction.DUST_AMOUNT +
        bsv.Transaction.CHANGE_OUTPUT_MAX_SIZE * feeb
    ) {
      tx.change(changeAddress);
      //After adding change, the handling fee will be recalculated
      tx.fee(Math.ceil((tx.toBuffer().length + unlockSize) * feeb));
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      //Unlock if private key is provided
      tx.inputs.forEach((input, inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
      });
    }
    return tx;
  }

  createIssueTx({
    genesisContract,
    genesisUtxo,

    opreturnData,
    utxos,
    changeAddress,
    feeb,
    tokenContract,

    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    rabinPubKeyIndexArray,
    rabinPubKeyArray,

    genesisPrivateKey,
    utxoPrivateKeys,
    debug,
  }: {
    genesisContract: any;
    genesisUtxo: {
      txId: string;
      outputIndex: number;
      satoshis: number;
      script: bsv.Script;
    };

    opreturnData: any;
    utxos: Utxo[];
    changeAddress: bsv.Address;
    feeb: number;
    tokenContract: any;

    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
    rabinPubKeyIndexArray: number[];
    rabinPubKeyArray: Int[];

    genesisPrivateKey: bsv.PrivateKey;
    utxoPrivateKeys: bsv.PrivateKey[];
    debug: boolean;
  }) {
    const tx = new bsv.Transaction();

    //第一个输入为发行合约
    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: genesisUtxo.script,
          satoshis: genesisUtxo.satoshis,
        }),
        prevTxId: genesisUtxo.txId,
        outputIndex: genesisUtxo.outputIndex,
        script: bsv.Script.empty(),
      })
    );

    //随后添加utxo作为输入
    utxos.forEach((utxo) => {
      tx.addInput(
        new bsv.Transaction.Input({
          output: new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
            satoshis: utxo.satoshis,
          }),
          prevTxId: utxo.txId,
          outputIndex: utxo.outputIndex,
          script: bsv.Script.empty(),
        })
      );
    });

    const tokenDataPartObj = NftProto.parseDataPart(
      tokenContract.lockingScript.toBuffer()
    );
    const genesisDataPartObj = NftProto.parseDataPart(
      genesisContract.lockingScript.toBuffer()
    );

    let tokenIndex = genesisDataPartObj.tokenIndex;
    let genesisContractSatoshis = 0;
    if (tokenIndex.lt(genesisDataPartObj.totalSupply.sub(BN.One))) {
      genesisDataPartObj.tokenIndex = genesisDataPartObj.tokenIndex.add(BN.One);
      genesisDataPartObj.sensibleID = tokenDataPartObj.sensibleID;
      let newGenesislockingScript = bsv.Script.fromBuffer(
        NftProto.updateScript(genesisUtxo.script.toBuffer(), genesisDataPartObj)
      );
      genesisContractSatoshis = Utils.getDustThreshold(
        newGenesislockingScript.toBuffer().length
      );
      tx.addOutput(
        new bsv.Transaction.Output({
          script: newGenesislockingScript,
          satoshis: genesisContractSatoshis,
        })
      );
    }

    const tokenContractSatoshis = Utils.getDustThreshold(
      tokenContract.lockingScript.toBuffer().length
    );
    //添加token合约作为输出
    tx.addOutput(
      new bsv.Transaction.Output({
        script: tokenContract.lockingScript,
        satoshis: tokenContractSatoshis,
      })
    );

    //如果有opReturn,则添加输出
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }

    const genesisInputIndex = 0;
    const genesisInputSatoshis = tx.inputs[genesisInputIndex].output.satoshis;
    const genesisInputLockingScript =
      tx.inputs[genesisInputIndex].output.script;

    if (
      genesisContract.lockingScript.toHex() != genesisInputLockingScript.toHex()
    ) {
      //如果构造出来的发行合约与要进行解锁的发行合约不一致
      //则可能是签名器公钥不一致
      if (debug) {
        console.log(genesisContract.lockingScript.toASM());
        console.log(genesisInputLockingScript.toASM());
      }
      throw new CodeError(
        ErrCode.EC_INNER_ERROR,
        "genesisContract lockingScript unmatch "
      );
    }

    //第一轮运算获取最终交易准确的大小，然后重新找零
    //由于重新找零了，需要第二轮重新进行脚本解锁
    //let the fee to be exact in the second round

    let extraSigLen = 0;
    for (let c = 0; c < 2; c++) {
      let changeAmount = this._setTxFee(
        tx,
        changeAddress,
        feeb,
        utxos.length,
        extraSigLen,
        c
      );

      let sig: Buffer;
      if (genesisPrivateKey) {
        //Sign if the private key is provided
        sig = signTx(
          tx,
          genesisPrivateKey,
          genesisInputLockingScript.toASM(),
          genesisInputSatoshis,
          genesisInputIndex,
          sighashType
        );
      } else {
        //If no private key is provided, use a 72-byte placeholder
        sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
      }
      extraSigLen += 72 - sig.length;

      let preimage = getPreimage(
        tx,
        genesisInputLockingScript.toASM(),
        genesisInputSatoshis,
        genesisInputIndex,
        sighashType
      );

      let contractObj = NftGenesis.unlock(
        genesisContract,
        new SigHashPreimage(toHex(preimage)),
        new Sig(toHex(sig)),
        rabinMsg,
        rabinPaddingArray,
        rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyArray,
        new Bytes(toHex(this.rabinPubKeyHashArray)),
        genesisContractSatoshis,
        new Bytes(tokenContract.lockingScript.toHex()),
        tokenContractSatoshis,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeAmount,
        new Bytes(opreturnScriptHex)
      );

      let txContext = {
        tx,
        inputIndex: genesisInputIndex,
        inputSatoshis: genesisInputSatoshis,
      };
      if (debug && genesisPrivateKey) {
        let ret = contractObj.verify(txContext);
        if (ret.success == false) throw ret;
      }

      tx.inputs[genesisInputIndex].setScript(contractObj.toScript());
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      tx.inputs.forEach((input, inputIndex) => {
        if (input.script.toBuffer().length == 0) {
          let privateKey = utxoPrivateKeys.splice(0, 1)[0];
          Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
        }
      });
    }

    return tx;
  }

  createTransferTx({
    nftUtxo,
    utxos,
    rabinPubKeyIndexArray,
    rabinPubKeyVerifyArray,
    rabinMsg,
    rabinPaddingArray,
    rabinSigArray,
    receiverAddress,
    senderPrivateKey,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    opreturnData,
    debug,
  }: {
    nftUtxo: NftUtxo;
    utxos: Utxo[];
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    rabinMsg: Bytes;
    rabinPaddingArray: Bytes[];
    rabinSigArray: Int[];
    receiverAddress: bsv.Address;
    senderPrivateKey: bsv.PrivateKey;
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;
    feeb: number;
    opreturnData?: any;
    debug?: boolean;
  }) {
    const tx = new bsv.Transaction();

    let nftInput = nftUtxo;

    let prevouts = Buffer.alloc(0);

    // token contract input
    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: nftInput.lockingScript,
          satoshis: nftInput.satoshis,
        }),
        prevTxId: nftInput.txId,
        outputIndex: nftInput.outputIndex,
        script: bsv.Script.empty(),
      })
    );
    nftInput.inputIndex = 0;
    // add outputpoint to prevouts
    const indexBuf = TokenUtil.getUInt32Buf(nftInput.outputIndex);
    const txidBuf = TokenUtil.getTxIdBuf(nftInput.txId);
    prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);

    //tx addInput utxo
    const satoshiInputArray = utxos.map((v) => ({
      lockingScript: bsv.Script.buildPublicKeyHashOut(v.address).toHex(),
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
    }));
    for (let i = 0; i < satoshiInputArray.length; i++) {
      const satoshiInput = satoshiInputArray[i];
      const lockingScript = bsv.Script.fromBuffer(
        Buffer.from(satoshiInput.lockingScript, "hex")
      );
      const inputSatoshis = satoshiInput.satoshis;
      const txId = satoshiInput.txId;
      const outputIndex = satoshiInput.outputIndex;
      // bsv input to provide fee
      tx.addInput(
        new bsv.Transaction.Input.PublicKeyHash({
          output: new bsv.Transaction.Output({
            script: lockingScript,
            satoshis: inputSatoshis,
          }),
          prevTxId: txId,
          outputIndex: outputIndex,
          script: bsv.Script.empty(),
        })
      );

      // add outputpoint to prevouts
      const indexBuf = Buffer.alloc(4, 0);
      indexBuf.writeUInt32LE(outputIndex);
      const txidBuf = Buffer.from([...Buffer.from(txId, "hex")].reverse());
      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    //tx addOutput nft
    const nftScriptBuf = nftInput.lockingScript.toBuffer();
    let dataPartObj = NftProto.parseDataPart(nftScriptBuf);
    dataPartObj.nftAddress = toHex(receiverAddress.hashBuffer);
    const lockingScriptBuf = NftProto.updateScript(nftScriptBuf, dataPartObj);
    const nftOutput = {
      lockingScript: bsv.Script.fromBuffer(lockingScriptBuf),
      satoshis: Utils.getDustThreshold(lockingScriptBuf.length),
    };
    tx.addOutput(
      new bsv.Transaction.Output({
        script: nftOutput.lockingScript,
        satoshis: nftOutput.satoshis,
      })
    );

    //tx addOutput OpReturn
    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }

    //The first round of calculations get the exact size of the final transaction, and then change again
    //Due to the change, the script needs to be unlocked again in the second round
    //let the fee to be exact in the second round
    let extraSigLen = 0;
    for (let c = 0; c < 2; c++) {
      let changeAmount = this._setTxFee(
        tx,
        changeAddress,
        feeb,
        utxos.length,
        extraSigLen,
        c
      );

      let rabinPubKeyArray = [];
      for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
        const signerIndex = rabinPubKeyIndexArray[j];
        rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
      }

      let sig: Buffer;
      if (senderPrivateKey) {
        //Sign if the private key is provided
        sig = signTx(
          tx,
          senderPrivateKey,
          nftInput.lockingScript.toASM(),
          nftInput.satoshis,
          nftInput.inputIndex,
          sighashType
        );
      } else {
        //If no private key is provided, use a 72-byte placeholder
        sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
      }

      let pubkey: Buffer;
      if (nftInput.publicKey) {
        pubkey = nftInput.publicKey.toBuffer();
      } else {
        pubkey = Buffer.from(PUBKEY_PLACE_HOLDER, "hex");
      }

      extraSigLen += 72 - sig.length;
      const preimage = getPreimage(
        tx,
        nftInput.lockingScript.toASM(),
        nftInput.satoshis,
        nftInput.inputIndex,
        sighashType
      );

      let dataPartObj = NftProto.parseDataPart(
        nftInput.lockingScript.toBuffer()
      );
      const dataPart = NftProto.newDataPart(dataPartObj);
      const nftContract = Nft.newContract(this.unlockContractCodeHashArray);
      nftContract.setDataPart(toHex(dataPart));
      //check preimage
      if (nftContract.lockingScript.toHex() != nftInput.lockingScript.toHex()) {
        if (debug) {
          console.log(nftContract.lockingScript.toASM());
          console.log(nftInput.lockingScript.toASM());
        }
        throw new CodeError(
          ErrCode.EC_INNER_ERROR,
          "tokenContract lockingScript unmatch "
        );
      }

      const unlockingContract = Nft.unlock(
        nftContract,
        new SigHashPreimage(toHex(preimage)),
        nftInput.inputIndex,
        new Bytes(toHex(prevouts)),
        rabinMsg,
        rabinPaddingArray,
        rabinSigArray,
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        new Bytes(toHex(this.rabinPubKeyHashArray)),
        new Bytes(toHex(nftInput.preNftAddress.hashBuffer)),
        new PubKey(toHex(pubkey)),
        new Sig(toHex(sig)),
        new Bytes(toHex(receiverAddress.hashBuffer)),
        new Int(nftOutput.satoshis),
        new Bytes(opreturnScriptHex),
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        new Int(changeAmount),
        0,
        new Bytes("00"),
        0,
        0,
        new Bytes("00"),
        0,
        NftProto.OP_TRANSFER
      );

      let txContext = {
        tx,
        inputIndex: nftInput.inputIndex,
        inputSatoshis: nftInput.satoshis,
      };
      if (debug && senderPrivateKey) {
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }
      tx.inputs[nftInput.inputIndex].setScript(unlockingContract.toScript());
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      tx.inputs.forEach((input, inputIndex) => {
        if (input.script.toBuffer().length == 0) {
          let privateKey = utxoPrivateKeys.splice(0, 1)[0];
          Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
        }
      });
    }

    return tx;
  }

  _getPreimageSize(lockingScript) {
    let n = lockingScript.toBuffer().length;
    let prefix = 0;
    if (n < 0xfd) {
      prefix = 0 + 1;
    } else if (n < 0x10000) {
      prefix = 1 + 2;
    } else if (n < 0x100000000) {
      prefix = 1 + 4;
    } else if (n < 0x10000000000000000) {
      prefix = 1 + 8;
    }
    const preimageSize = 4 + 32 + 32 + 36 + prefix + n + 8 + 4 + 32 + 4 + 4;
    return preimageSize;
  }

  _setTxFee(
    tx: bsv.Transaction,
    changeAddress: bsv.Address,
    feeb: number,
    utxosCount: number,
    extraSigLen: number,
    index: number
  ) {
    let changeAmount = 0;
    const unlockSize = utxosCount * P2PKH_UNLOCK_SIZE;
    tx.fee(Math.ceil((tx.toBuffer().length + extraSigLen + unlockSize) * feeb));
    if (index == 1) {
      let leftAmount = tx._getUnspentValue() - tx.getFee();
      //Change if there is enough leftAmount, otherwise it will be classified as fee
      if (
        leftAmount >=
        bsv.Transaction.DUST_AMOUNT +
          bsv.Transaction.CHANGE_OUTPUT_MAX_SIZE * feeb
      ) {
        tx.addOutput(
          new bsv.Transaction.Output({
            script: new bsv.Script(changeAddress),
            satoshis: 0,
          })
        );
        //After adding change, the fee should be recalculated
        let fee = Math.ceil(
          (tx.toBuffer().length +
            extraSigLen +
            unlockSize +
            Utils.numberToBuffer(leftAmount).length +
            1) *
            feeb
        );

        tx._fee = fee;
        tx._outputAmount = undefined;
        changeAmount = tx._getUnspentValue() - fee;
        tx.outputs[tx.outputs.length - 1].satoshis = changeAmount;
      } else {
        if (!Utils.isNull(tx._changeIndex)) {
          tx._removeOutput(tx._changeIndex);
        }
        //No change is very dangerous. Rates greater than 1 are forbidden
        let fee = tx._getUnspentValue();
        let _feeb = fee / tx.toBuffer().length;
        if (_feeb > 1) {
          throw new CodeError(ErrCode.EC_INNER_ERROR, "unsupport feeb");
        }
        changeAmount = 0;
      }
    }
    return changeAmount;
  }
}
