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
import {
  ContractUtil,
  genesisTokenIDTxid,
  Nft,
  NftGenesis,
} from "./contractUtil";
import * as NftProto from "./nftProto";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
export const SIGNER_NUM = 5;
export const SIGNER_VERIFY_NUM = 3;

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
  preTxId?: string;
  preOutputIndex?: number;
  preTxHex?: string;
  preNftAddress?: bsv.Address;

  publicKey: bsv.PublicKey;
};

export class NonFungibleToken {
  rabinPubKeyArray: Int[];
  rabinPubKeyHashArray: Buffer;
  rabinPubKeyHashArrayHash: Buffer;
  unlockContractCodeHashArray: Bytes[];
  dustRate: number;
  constructor(rabinPubKeys: BN[], dustRate?: number) {
    this.rabinPubKeyHashArray = TokenUtil.getRabinPubKeyHashArray(rabinPubKeys);
    this.rabinPubKeyHashArrayHash = bsv.crypto.Hash.sha256ripemd160(
      this.rabinPubKeyHashArray
    );
    this.rabinPubKeyArray = rabinPubKeys.map((v) => new Int(v.toString(10))); //scryptlib 需要0x开头
    this.unlockContractCodeHashArray = ContractUtil.unlockContractCodeHashArray;
    this.dustRate = dustRate;
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
    //添加utxo作为输入
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

    //第一项输出为genesis合约
    tx.addOutput(
      new bsv.Transaction.Output({
        script: genesisContract.lockingScript,
        satoshis: Utils.getDustThreshold(
          genesisContract.lockingScript.toBuffer().length,
          this.dustRate
        ),
      })
    );

    //如果有opReturn则添加到第二项输出
    if (opreturnData) {
      let script = bsv.Script.buildSafeDataOut(opreturnData);
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }

    //计算手续费并判断是否找零
    //如果有找零将在最后一项输出
    const unlockSize = utxos.length * P2PKH_UNLOCK_SIZE;
    tx.fee(Math.ceil((tx.toBuffer().length + unlockSize) * feeb));
    let changeAmount = tx._getUnspentValue() - tx.getFee();
    //足够dust才找零，否则归为手续费
    if (
      changeAmount >=
      bsv.Transaction.DUST_AMOUNT +
        bsv.Transaction.CHANGE_OUTPUT_MAX_SIZE * feeb
    ) {
      tx.change(changeAddress);
      //添加找零后要重新计算手续费
      tx.fee(Math.ceil((tx.toBuffer().length + unlockSize) * feeb));
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      //如果提供私钥就进行解锁
      tx.inputs.forEach((input, inputIndex) => {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
      });
    }
    return tx;
  }

  async createIssueTx({
    genesisContract,
    spendByTxId,
    spendByOutputIndex,
    spendByLockingScript,

    opreturnData,
    utxos,
    changeAddress,
    feeb,
    tokenContract,
    allowIncreaseIssues,
    satotxData,
    signers,
    signerSelecteds,

    genesisPrivateKey,
    utxoPrivateKeys,
    debug,
  }) {
    const tx = new bsv.Transaction();

    //第一个输入为发行合约
    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: spendByLockingScript,
          satoshis: Utils.getDustThreshold(
            spendByLockingScript.toBuffer().length,
            this.dustRate
          ),
        }),
        prevTxId: spendByTxId,
        outputIndex: spendByOutputIndex,
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

    const isFirstGenesis =
      genesisDataPartObj.sensibleID.txid == genesisTokenIDTxid;

    //如果允许增发，则添加新的发行合约作为第一个输出
    let tokenIndex = genesisDataPartObj.tokenIndex;
    let genesisContractSatoshis = 0;
    if (tokenIndex.lt(genesisDataPartObj.totalSupply.sub(BN.One))) {
      genesisDataPartObj.tokenIndex = genesisDataPartObj.tokenIndex.add(BN.One);
      genesisDataPartObj.sensibleID = tokenDataPartObj.sensibleID;
      let newGenesislockingScript = bsv.Script.fromBuffer(
        NftProto.updateScript(
          spendByLockingScript.toBuffer(),
          genesisDataPartObj
        )
      );
      genesisContractSatoshis = Utils.getDustThreshold(
        newGenesislockingScript.toBuffer().length,
        this.dustRate
      );
      tx.addOutput(
        new bsv.Transaction.Output({
          script: newGenesislockingScript,
          satoshis: genesisContractSatoshis,
        })
      );
    }

    const tokenContractSatoshis = Utils.getDustThreshold(
      tokenContract.lockingScript.toBuffer().length,
      this.dustRate
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

    let rabinMsg;
    let rabinPaddingArray: Bytes[] = [];
    let rabinSigArray: Int[] = [];
    let rabinPubKeyIndexArray: number[] = [];
    if (isFirstGenesis) {
      //如果是首次发行，则不需要查询签名器
      rabinMsg = Buffer.alloc(1, 0);
      for (let i = 0; i < SIGNER_VERIFY_NUM; i++) {
        rabinPaddingArray.push(new Bytes("00"));
        rabinSigArray.push(new Int("0"));
        rabinPubKeyIndexArray.push(i);
      }
    } else {
      //查询签名器
      for (let i = 0; i < signerSelecteds.length; i++) {
        try {
          let idx = signerSelecteds[i];
          let sigInfo = await signers[idx].satoTxSigUTXOSpendBy(satotxData);
          rabinMsg = sigInfo.payload;
          rabinPaddingArray.push(new Bytes(sigInfo.padding));
          rabinSigArray.push(
            new Int(BN.fromString(sigInfo.sigBE, 16).toString(10))
          );
        } catch (e) {
          console.log(e);
        }
      }

      rabinPubKeyIndexArray = signerSelecteds;
    }
    let rabinPubKeyArray = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = signerSelecteds[j];
      rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
    }

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
    let changeAmount = 0;
    let extraSigLen = 0;
    for (let c = 0; c < 2; c++) {
      const unlockSize = utxos.length * P2PKH_UNLOCK_SIZE;
      tx.fee(
        Math.ceil((tx.toBuffer().length + extraSigLen + unlockSize) * feeb)
      );
      //足够dust才找零，否则归为手续费
      if (c == 1) {
        let leftAmount = tx._getUnspentValue() - tx.getFee();
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
          //添加找零后要重新计算手续费
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
          //无找零是很危险的事情，禁止大于1的费率
          let fee = tx._getUnspentValue(); //未花费的金额都会成为手续费
          let _feeb = fee / tx.toBuffer().length;
          if (_feeb > 1) {
            throw new CodeError(ErrCode.EC_INNER_ERROR, "unsupport feeb");
          }
          changeAmount = 0;
        }
      }

      let sig: Buffer;
      if (genesisPrivateKey) {
        //如果提供了私钥就进行签名
        sig = signTx(
          tx,
          genesisPrivateKey,
          genesisInputLockingScript.toASM(),
          genesisInputSatoshis,
          genesisInputIndex,
          sighashType
        );
      } else {
        //如果没有提供私钥就使用72字节的占位符
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

      //解锁发行合约
      let contractObj = NftGenesis.unlock(
        genesisContract,
        new SigHashPreimage(toHex(preimage)),
        new Sig(toHex(sig)),
        new Bytes(toHex(rabinMsg)),
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
        //提供了私钥的情况下才能进行校验，否则会在签名校验时出错
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

  getNftInputFromNftUtxo(nftUtxo: NftUtxo) {
    const preTx = new bsv.Transaction(nftUtxo.preTxHex);
    const preLockingScript = preTx.outputs[nftUtxo.preOutputIndex].script;
    const tx = new bsv.Transaction(nftUtxo.txHex);
    const lockingScript = tx.outputs[nftUtxo.outputIndex].script;
    const satoshis = tx.outputs[nftUtxo.outputIndex].satoshis;
    return {
      satoshis,
      txId: nftUtxo.txId,
      outputIndex: nftUtxo.outputIndex,
      lockingScript,
      preTxId: nftUtxo.preTxId,
      preOutputIndex: nftUtxo.preOutputIndex,
      preLockingScript,
      preNftAddress: nftUtxo.preNftAddress,
      publicKey: nftUtxo.publicKey,
      inputIndex: 0,
    };
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
    rabinMsg: Buffer;
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

    let nftInput = this.getNftInputFromNftUtxo(nftUtxo);

    //首先添加token作为输入
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
      satoshis: Utils.getDustThreshold(lockingScriptBuf.length, this.dustRate),
    };
    tx.addOutput(
      new bsv.Transaction.Output({
        script: nftOutput.lockingScript,
        satoshis: nftOutput.satoshis,
      })
    );

    const satoshiBuf = BN.fromNumber(nftOutput.satoshis).toBuffer({
      endian: "little",
      size: 8,
    });

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

    //第一轮运算获取最终交易准确的大小，然后重新找零
    //由于重新找零了，需要第二轮重新进行脚本解锁
    //let the fee to be exact in the second round
    let changeAmount = 0;
    let extraSigLen = 0;
    for (let c = 0; c < 2; c++) {
      const unlockSize = satoshiInputArray.length * P2PKH_UNLOCK_SIZE;
      tx.fee(
        Math.ceil((tx.toBuffer().length + extraSigLen + unlockSize) * feeb)
      );
      //足够dust才找零，否则归为手续费
      if (c == 1) {
        let leftAmount = tx._getUnspentValue() - tx.getFee();
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
          //添加找零后要重新计算手续费
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
          //无找零是很危险的事情，禁止大于1的费率
          let fee = tx._getUnspentValue(); //未花费的金额都会成为手续费
          let _feeb = fee / tx.toBuffer().length;
          if (_feeb > 1) {
            throw new CodeError(ErrCode.EC_INNER_ERROR, "unsupport feeb");
          }
          changeAmount = 0;
        }
      }

      let rabinPubKeyArray = [];
      for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
        const signerIndex = rabinPubKeyIndexArray[j];
        rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
      }

      let sig: Buffer;
      if (senderPrivateKey) {
        //如果提供了私钥就进行签名
        sig = signTx(
          tx,
          senderPrivateKey,
          nftInput.lockingScript.toASM(),
          nftInput.satoshis,
          nftInput.inputIndex,
          sighashType
        );
      } else {
        //如果没有提供私钥就使用72字节的占位符
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
        new Bytes(toHex(rabinMsg)),
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
}
