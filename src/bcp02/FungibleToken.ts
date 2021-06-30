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
import * as TokenUtil from "../common/tokenUtil";
import * as Utils from "../common/utils";
import { PUBKEY_PLACE_HOLDER, SIG_PLACE_HOLDER } from "../common/utils";
import {
  ContractUtil,
  genesisTokenIDTxid,
  Token,
  TokenGenesis,
  TokenTransferCheck,
} from "./contractUtil";
import * as TokenProto from "./tokenProto";
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

export type FtUtxo = {
  txId: string;
  outputIndex: number;
  tokenAddress: bsv.Address;
  tokenAmount: BN;

  txHex?: string;
  satoshis?: number;
  preTxId?: string;
  preOutputIndex?: number;
  preTxHex?: string;
  preTokenAddress?: bsv.Address;
  preTokenAmount?: BN;

  publicKey: bsv.PublicKey;
};

export class FungibleToken {
  rabinPubKeyArray: Int[];
  rabinPubKeyHashArray: Buffer;
  rabinPubKeyHashArrayHash: Buffer;
  transferCheckCodeHashArray: Bytes[];
  unlockContractCodeHashArray: Bytes[];
  constructor(rabinPubKeys: BN[]) {
    let buf = Buffer.alloc(0);
    for (let i = 0; i < SIGNER_NUM; i++) {
      buf = Buffer.concat([
        buf,
        bsv.crypto.Hash.sha256ripemd160(
          TokenUtil.toBufferLE(
            rabinPubKeys[i].toString(16),
            TokenUtil.RABIN_SIG_LEN
          )
        ),
      ]);
    }
    this.rabinPubKeyHashArray = buf;
    this.rabinPubKeyHashArrayHash = bsv.crypto.Hash.sha256ripemd160(
      this.rabinPubKeyHashArray
    );
    this.rabinPubKeyArray = rabinPubKeys.map((v) => new Int(v.toString(10))); //scryptlib 需要0x开头
    this.transferCheckCodeHashArray = ContractUtil.transferCheckCodeHashArray;
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
          genesisContract.lockingScript.toBuffer().length
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
            spendByLockingScript.toBuffer().length
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

    const tokenDataPartObj = TokenProto.parseDataPart(
      tokenContract.lockingScript.toBuffer()
    );
    const genesisDataPartObj = TokenProto.parseDataPart(
      genesisContract.lockingScript.toBuffer()
    );

    const isFirstGenesis =
      genesisDataPartObj.sensibleID.txid == genesisTokenIDTxid;

    //如果允许增发，则添加新的发行合约作为第一个输出
    let genesisContractSatoshis = 0;
    if (allowIncreaseIssues) {
      genesisDataPartObj.sensibleID = tokenDataPartObj.sensibleID;
      let newGenesislockingScript = bsv.Script.fromBuffer(
        TokenProto.updateScript(
          spendByLockingScript.toBuffer(),
          genesisDataPartObj
        )
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
        } catch (e) {}
      }

      rabinPubKeyIndexArray = signerSelecteds;
    }

    let rabinPubKeyArray = [];
    for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
      const signerIndex = signerSelecteds[j];
      rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
    }

    let rabinPubKeyHashArray = [];

    if (
      genesisContract.lockingScript.toHex() != genesisInputLockingScript.toHex()
    ) {
      //如果构造出来的发行合约与要进行解锁的发行合约不一致
      //则可能是签名器公钥不一致
      if (debug) {
        console.log(genesisContract.lockingScript.toASM());
        console.log(genesisInputLockingScript.toASM());
      }
      throw new Error("genesisContract lockingScript unmatch ");
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
            throw new Error("unsupport feeb");
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
      let contractObj = TokenGenesis.unlock(
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

  createRouteCheckTx({
    utxos,
    changeAddress,
    feeb,
    tokenTransferCheckContract,
    utxoPrivateKeys,
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

    tx.addOutput(
      new bsv.Transaction.Output({
        script: tokenTransferCheckContract.lockingScript,
        satoshis: Utils.getDustThreshold(
          tokenTransferCheckContract.lockingScript.toBuffer().length
        ),
      })
    );

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
    utxoPrivateKeys,
    changeAddress,
    feeb,
    opreturnData,
    debug,
  }: {
    routeCheckTx: bsv.Transaction;
    ftUtxos: FtUtxo[];
    utxos: Utxo[];
    rabinPubKeyIndexArray: number[];
    rabinPubKeyVerifyArray: Int[];
    checkRabinMsgArray: Buffer;
    checkRabinPaddingArray: Buffer;
    checkRabinSigArray: Buffer;
    tokenOutputArray: { address: bsv.Address; tokenAmount: BN }[];
    tokenRabinDatas: any;
    tokenTransferCheckContract: any;
    ftPrivateKeys: bsv.PrivateKey[];
    utxoPrivateKeys: bsv.PrivateKey[];
    changeAddress: bsv.Address;
    feeb: number;
    opreturnData?: any;
    debug?: boolean;
  }) {
    const tx = new bsv.Transaction();

    const tokenInputArray = ftUtxos.map((v) => {
      const preTx = new bsv.Transaction(v.preTxHex);
      const preLockingScript = preTx.outputs[v.preOutputIndex].script;
      const tx = new bsv.Transaction(v.txHex);
      const lockingScript = tx.outputs[v.outputIndex].script;
      const satoshis = tx.outputs[v.outputIndex].satoshis;
      return {
        satoshis,
        txId: v.txId,
        outputIndex: v.outputIndex,
        lockingScript,
        preTxId: v.preTxId,
        preOutputIndex: v.preOutputIndex,
        preLockingScript,
        preTokenAddress: v.preTokenAddress,
        preTokenAmount: v.preTokenAmount,
        publicKey: v.publicKey,
      };
    });

    const satoshiInputArray = utxos.map((v) => ({
      lockingScript: bsv.Script.buildPublicKeyHashOut(v.address).toHex(),
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
    }));

    //首先添加token作为输入
    let prevouts = Buffer.alloc(0);
    const tokenInputLen = tokenInputArray.length;
    let inputTokenScript;
    let inputTokenAmountArray = Buffer.alloc(0);
    let inputTokenAddressArray = Buffer.alloc(0);
    for (let i = 0; i < tokenInputLen; i++) {
      const tokenInput = tokenInputArray[i];
      const tokenInputLockingScript = tokenInput.lockingScript;
      inputTokenScript = tokenInput.lockingScript;
      const tokenScriptBuf = tokenInputLockingScript.toBuffer();
      const tokenInputSatoshis = tokenInput.satoshis;
      const txId = tokenInput.txId;
      const outputIndex = tokenInput.outputIndex;
      // token contract input
      tx.addInput(
        new bsv.Transaction.Input({
          output: new bsv.Transaction.Output({
            script: tokenInputLockingScript,
            satoshis: tokenInputSatoshis,
          }),
          prevTxId: txId,
          outputIndex: outputIndex,
          script: bsv.Script.empty(),
        })
      );

      inputTokenAddressArray = Buffer.concat([
        inputTokenAddressArray,
        Buffer.from(TokenProto.getTokenAddress(tokenScriptBuf), "hex"),
      ]);
      const amountBuf = TokenProto.getTokenAmount(tokenScriptBuf).toBuffer({
        endian: "little",
        size: 8,
      });

      inputTokenAmountArray = Buffer.concat([inputTokenAmountArray, amountBuf]);

      // add outputpoint to prevouts
      const indexBuf = TokenUtil.getUInt32Buf(outputIndex);
      const txidBuf = TokenUtil.getTxIdBuf(txId);

      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

    //tx addInput utxo
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

    //添加routeCheck为最后一个输入
    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: routeCheckTx.outputs[0].script,
          satoshis: routeCheckTx.outputs[0].satoshis,
        }),
        prevTxId: routeCheckTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(),
      })
    );
    let indexBuf = Buffer.alloc(4, 0);
    prevouts = Buffer.concat([
      prevouts,
      Buffer.from(routeCheckTx.id, "hex").reverse(),
      indexBuf,
    ]);

    let recervierArray = Buffer.alloc(0);
    let receiverTokenAmountArray = Buffer.alloc(0);
    let outputSatoshiArray = Buffer.alloc(0);
    const tokenOutputLen = tokenOutputArray.length;
    for (let i = 0; i < tokenOutputLen; i++) {
      const tokenOutput = tokenOutputArray[i];
      const address = tokenOutput.address;
      const outputTokenAmount = tokenOutput.tokenAmount;

      const lockingScriptBuf = TokenProto.getNewTokenScript(
        inputTokenScript.toBuffer(),
        address.hashBuffer,
        outputTokenAmount
      );
      const outputSatoshis = Utils.getDustThreshold(lockingScriptBuf.length);
      tx.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.fromBuffer(lockingScriptBuf),
          satoshis: outputSatoshis,
        })
      );
      recervierArray = Buffer.concat([recervierArray, address.hashBuffer]);
      const tokenBuf = outputTokenAmount.toBuffer({
        endian: "little",
        size: 8,
      });
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        tokenBuf,
      ]);
      const satoshiBuf = BN.fromNumber(outputSatoshis).toBuffer({
        endian: "little",
        size: 8,
      });
      outputSatoshiArray = Buffer.concat([outputSatoshiArray, satoshiBuf]);
    }

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
            throw new Error("unsupport feeb");
          }
          changeAmount = 0;
        }
      }

      let rabinPubKeyArray = [];
      for (let j = 0; j < SIGNER_VERIFY_NUM; j++) {
        const signerIndex = rabinPubKeyIndexArray[j];
        rabinPubKeyArray.push(this.rabinPubKeyArray[signerIndex]);
      }
      const routeCheckInputIndex = tokenInputLen + satoshiInputArray.length;
      for (let i = 0; i < tokenInputLen; i++) {
        const tokenInput = tokenInputArray[i];
        const tokenInputLockingScript = tokenInput.lockingScript;
        const tokenInputSatoshis = tokenInput.satoshis;
        const tokenInputIndex = i;
        const senderPrivateKey = ftPrivateKeys[i];
        let sig: Buffer;
        if (senderPrivateKey) {
          //如果提供了私钥就进行签名
          sig = signTx(
            tx,
            senderPrivateKey,
            tokenInputLockingScript.toASM(),
            tokenInputSatoshis,
            tokenInputIndex,
            sighashType
          );
        } else {
          //如果没有提供私钥就使用72字节的占位符
          sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
        }

        let pubkey: Buffer;
        if (tokenInput.publicKey) {
          pubkey = tokenInput.publicKey.toBuffer();
        } else {
          pubkey = Buffer.from(PUBKEY_PLACE_HOLDER, "hex");
        }

        extraSigLen += 72 - sig.length;
        const preimage = getPreimage(
          tx,
          tokenInputLockingScript.toASM(),
          tokenInputSatoshis,
          tokenInputIndex,
          sighashType
        );

        let tokenRanbinData = tokenRabinDatas[i];
        let dataPartObj = TokenProto.parseDataPart(
          tokenInputLockingScript.toBuffer()
        );
        const dataPart = TokenProto.newDataPart(dataPartObj);

        const TokenContractClass = Token.getClass();
        const tokenContract = new TokenContractClass(
          this.transferCheckCodeHashArray,
          this.unlockContractCodeHashArray
        );

        tokenContract.setDataPart(toHex(dataPart));

        //check preimage
        if (
          tokenContract.lockingScript.toHex() != tokenInputLockingScript.toHex()
        ) {
          if (debug) {
            console.log(tokenContract.lockingScript.toASM());
            console.log(tokenInputLockingScript.toASM());
          }
          throw new Error("tokenContract lockingScript unmatch ");
        }

        const unlockingContract = Token.unlock(
          tokenContract,
          new SigHashPreimage(toHex(preimage)),
          tokenInputIndex,
          new Bytes(toHex(prevouts)),
          new Bytes(toHex(tokenRanbinData.tokenRabinMsg)),
          tokenRanbinData.tokenRabinPaddingArray,
          tokenRanbinData.tokenRabinSigArray,
          rabinPubKeyIndexArray,
          rabinPubKeyArray,
          new Bytes(toHex(this.rabinPubKeyHashArray)),
          routeCheckInputIndex,
          new Bytes(routeCheckTx.serialize(true)),
          tokenOutputLen,
          new Bytes(toHex(tokenInput.preTokenAddress.hashBuffer)),
          tokenInput.preTokenAmount.toString(),
          new PubKey(toHex(pubkey)),
          new Sig(toHex(sig)),
          0,
          new Bytes("00"),
          TokenProto.OP_TRANSFER
        );

        let txContext = {
          tx,
          inputIndex: tokenInputIndex,
          inputSatoshis: tokenInputSatoshis,
        };
        if (debug && senderPrivateKey) {
          let ret = unlockingContract.verify(txContext);
          if (ret.success == false) throw ret;
        }

        tx.inputs[tokenInputIndex].setScript(unlockingContract.toScript());
      }
      const routeCheckInputSatoshis = routeCheckTx.outputs[0].satoshis;
      let preimage = getPreimage(
        tx,
        routeCheckTx.outputs[0].script.toASM(),
        routeCheckInputSatoshis,
        routeCheckInputIndex,
        sighashType
      );

      let unlockingContract = TokenTransferCheck.unlock(
        tokenTransferCheckContract,
        new SigHashPreimage(toHex(preimage)),
        new Bytes(tokenInputArray[0].lockingScript.toHex()),
        new Bytes(toHex(prevouts)),
        new Bytes(toHex(checkRabinMsgArray)),
        new Bytes(toHex(checkRabinPaddingArray)),
        new Bytes(toHex(checkRabinSigArray)),
        rabinPubKeyIndexArray,
        rabinPubKeyVerifyArray,
        new Bytes(toHex(this.rabinPubKeyHashArray)),
        new Bytes(toHex(inputTokenAddressArray)),
        new Bytes(toHex(inputTokenAmountArray)),
        new Bytes(toHex(outputSatoshiArray)),
        changeAmount,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        new Bytes(opreturnScriptHex)
      );

      let txContext = {
        tx,
        inputIndex: routeCheckInputIndex,
        inputSatoshis: routeCheckInputSatoshis,
      };
      if (debug) {
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
      }

      tx.inputs[routeCheckInputIndex].setScript(unlockingContract.toScript());
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
