import path = require("path");
import {
  bsv,
  buildContractClass,
  Bytes,
  getPreimage,
  num2bin,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  signTx,
  toHex
} from "scryptlib";
import * as Utils from "../common/utils";
import { P2PKH_UNLOCK_SIZE, SIG_PLACE_HOLDER } from "../common/utils";
import { ISSUE, PayloadNFT, TRANSFER } from "./PayloadNFT";
const DataLen4 = 4;
const Signature = bsv.crypto.Signature;
export const sighashType =
  Signature.SIGHASH_ANYONECANPAY |
  Signature.SIGHASH_ALL |
  Signature.SIGHASH_FORKID;
const nftContractClass = buildContractClass(
  require("./contract-desc/nft_desc.json")
);
export class NonFungibleToken {
  nftContract: any;
  nftCodePart: string;
  nftGenesisPart: string;
  /**
   * @param {bigint} rabinPubKey
   * @constructor NFT合约
   */
  constructor(rabinPubKey: bigint) {
    this.nftContract = new nftContractClass(rabinPubKey);
    this.nftCodePart = this.nftContract.codePart.toASM();
  }

  setTxGenesisPart({ prevTxId, outputIndex, issueOutputIndex = 0 }) {
    this.nftGenesisPart =
      Utils.reverseEndian(prevTxId) +
      num2bin(outputIndex, DataLen4) +
      num2bin(issueOutputIndex, DataLen4);
  }

  async makeTxGenesis({
    genesisPublicKey,
    tokenId,
    totalSupply,
    opreturnData,

    utxoPrivateKeys,
    utxos,
    changeAddress,
    feeb,
  }) {
    let tx = new bsv.Transaction();

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

    let pl = new PayloadNFT({
      dataType: ISSUE,
      ownerPkh: genesisPublicKey._getID(),
      totalSupply: totalSupply,
      tokenId: tokenId,
    });
    const lockingScript = bsv.Script.fromASM(
      [this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" ")
    );

    //第一个输出为发行合约
    tx.addOutput(
      new bsv.Transaction.Output({
        script: lockingScript,
        satoshis: Utils.getDustThreshold(lockingScript.toBuffer().length),
      })
    );

    //第二个输出可能为opReturn
    if (opreturnData) {
      tx.addOutput(
        new bsv.Transaction.Output({
          script: new bsv.Script.buildSafeDataOut(opreturnData),
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
      tx.inputs.forEach((input, inputIndex) => {
        if (input.script.toBuffer().length == 0) {
          let privateKey = utxoPrivateKeys.splice(0, 1)[0];
          Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
        }
      });
    }
    return tx;
  }

  async makeTxIssue({
    issuerTxId,
    issuerOutputIndex,
    issuerLockingScript,
    satotxData,

    genesisPrivateKey,
    genesisPublicKey,
    receiverAddress,
    metaTxId,
    opreturnData,

    signers,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    debug,
  }) {
    let tx = new bsv.Transaction();

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

    let pl = new PayloadNFT();
    pl.read(issuerLockingScript.toBuffer());
    this.nftContract.setDataPart(this.nftGenesisPart + " " + pl.dump());

    pl.tokenId = pl.tokenId + BigInt(1);

    let reachTotalSupply = pl.tokenId == pl.totalSupply;

    const newLockingScript0 = bsv.Script.fromASM(
      [this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" ")
    );

    pl.dataType = TRANSFER;
    pl.ownerPkh = receiverAddress.hashBuffer;
    pl.metaTxId = metaTxId;
    const newLockingScript1 = bsv.Script.fromASM(
      [this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" ")
    );

    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: issuerLockingScript,
          satoshis: Utils.getDustThreshold(
            issuerLockingScript.toBuffer().length
          ),
        }),
        prevTxId: issuerTxId,
        outputIndex: issuerOutputIndex,
        script: bsv.Script.empty(),
      })
    );

    if (!reachTotalSupply) {
      tx.addOutput(
        new bsv.Transaction.Output({
          script: newLockingScript0,
          satoshis: Utils.getDustThreshold(newLockingScript0.toBuffer().length),
        })
      );
    }

    tx.addOutput(
      new bsv.Transaction.Output({
        script: newLockingScript1,
        satoshis: Utils.getDustThreshold(newLockingScript1.toBuffer().length),
      })
    );

    if (opreturnData) {
      tx.addOutput(
        new bsv.Transaction.Output({
          script: new bsv.Script.buildSafeDataOut(opreturnData),
          satoshis: 0,
        })
      );
    }

    const curInputIndex = tx.inputs.length - 1;
    const curInputLockingScript = tx.inputs[curInputIndex].output.script;
    const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
    const nftOutputSatoshis = tx.outputs[reachTotalSupply ? 0 : 1].satoshis;

    let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
    const preTx = new bsv.Transaction(satotxData.txHex);
    let script = preTx.outputs[satotxData.index].script;
    let preDataPartHex = this.getDataPartFromScript(script);

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
          curInputLockingScript.toASM(),
          curInputSatoshis,
          curInputIndex,
          sighashType
        );
      } else {
        //如果没有提供私钥就使用72字节的占位符
        sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
      }
      extraSigLen = 72 - sig.length;

      const preimage = getPreimage(
        tx,
        curInputLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      if (
        this.nftContract.lockingScript.toHex() != curInputLockingScript.toHex()
      ) {
        if (debug) {
          console.log(this.nftContract.lockingScript.toASM());
          console.log(curInputLockingScript.toASM());
        }
        throw new Error("nftContract lockingScript unmatch ");
      }

      let contractObj = this.nftContract.issue(
        new SigHashPreimage(toHex(preimage)),
        BigInt("0x" + sigInfo.sigBE),
        new Bytes(sigInfo.payload),
        new Bytes(sigInfo.padding),
        new Bytes(preDataPartHex),
        new Bytes(
          opreturnData
            ? new bsv.Script.buildSafeDataOut(opreturnData).toHex()
            : ""
        ),
        new Sig(toHex(sig)),
        new PubKey(toHex(genesisPublicKey)),
        new Bytes(metaTxId),
        new Ripemd160(toHex(receiverAddress.hashBuffer)),
        nftOutputSatoshis,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeAmount
      );
      let txContext = {
        tx,
        inputIndex: curInputIndex,
        inputSatoshis: curInputSatoshis,
      };
      if (debug && genesisPrivateKey) {
        let ret = contractObj.verify(txContext);
        if (ret.success == false) {
          throw ret;
        }
      }

      tx.inputs[curInputIndex].setScript(contractObj.toScript());
    }

    if (utxoPrivateKeys && utxoPrivateKeys.length > 0) {
      tx.inputs.forEach((input, inputIndex) => {
        if (input.script.toBuffer().length == 0) {
          let privateKey = utxoPrivateKeys.splice(0, 1)[0];
          Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
        }
      });
    }
    return {
      tx,
      tokenid: pl.tokenId,
    };
  }

  async makeTxTransfer({
    transferTxId,
    transferOutputIndex,
    transferLockingScript,
    satotxData,

    senderPrivateKey,
    senderPublicKey,
    receiverAddress,
    opreturnData,

    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    signers,
    debug,
  }) {
    let tx = new bsv.Transaction();

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

    let pl = new PayloadNFT();
    pl.read(transferLockingScript.toBuffer());

    this.nftContract.setDataPart(this.nftGenesisPart + " " + pl.dump());

    pl.ownerPkh = receiverAddress.hashBuffer;
    const newLockingScript0 = bsv.Script.fromASM(
      [this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" ")
    );

    tx.addInput(
      new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: transferLockingScript,
          satoshis: Utils.getDustThreshold(
            transferLockingScript.toBuffer().length
          ),
        }),
        prevTxId: transferTxId,
        outputIndex: transferOutputIndex,
        script: bsv.Script.empty(),
      })
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: newLockingScript0,
        satoshis: Utils.getDustThreshold(newLockingScript0.toBuffer().length),
      })
    );

    if (opreturnData) {
      tx.addOutput(
        new bsv.Transaction.Output({
          script: new bsv.Script.buildSafeDataOut(opreturnData),
          satoshis: 0,
        })
      );
    }

    const curInputIndex = tx.inputs.length - 1;
    const curInputLockingScript = tx.inputs[curInputIndex].output.script;
    const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
    const nftOutputSatoshis = tx.outputs[0].satoshis;

    let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
    const preTx = new bsv.Transaction(satotxData.txHex);
    let script = preTx.outputs[satotxData.index].script;
    let preDataPartHex = this.getDataPartFromScript(script);

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

      this.nftContract.txContext = {
        tx: tx,
        inputIndex: curInputIndex,
        inputSatoshis: curInputSatoshis,
      };

      let sig: Buffer;
      if (senderPrivateKey) {
        //如果提供了私钥就进行签名
        sig = signTx(
          tx,
          senderPrivateKey,
          curInputLockingScript.toASM(),
          curInputSatoshis,
          curInputIndex,
          sighashType
        );
      } else {
        //如果没有提供私钥就使用72字节的占位符
        sig = Buffer.from(SIG_PLACE_HOLDER, "hex");
      }
      extraSigLen = 72 - sig.length;

      const preimage = getPreimage(
        tx,
        transferLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      let contractObj = this.nftContract.issue(
        new SigHashPreimage(toHex(preimage)),
        BigInt("0x" + sigInfo.sigBE),
        new Bytes(sigInfo.payload),
        new Bytes(sigInfo.padding),
        new Bytes(preDataPartHex),
        new Bytes(
          opreturnData
            ? new bsv.Script.buildSafeDataOut(opreturnData).toHex()
            : ""
        ),
        new Sig(toHex(sig)),
        new PubKey(toHex(senderPublicKey)),
        new Bytes(""),
        new Ripemd160(toHex(receiverAddress.hashBuffer)),
        nftOutputSatoshis,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeAmount
      );

      let txContext = {
        tx,
        inputIndex: curInputIndex,
        inputSatoshis: curInputSatoshis,
      };
      if (debug && senderPrivateKey) {
        let ret = contractObj.verify(txContext);
        if (ret.success == false) throw ret;
      }

      tx.inputs[curInputIndex].setScript(contractObj.toScript());
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

  getDataPartFromScript(script) {
    let chunks = script.chunks;
    let opreturnIdx = -1;
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].opcodenum == 106) {
        opreturnIdx = i;
        break;
      }
    }

    if (opreturnIdx == -1) return "";
    let parts = chunks.splice(opreturnIdx, chunks.length);
    let genesisPart = parts[1];
    let dataPart = parts[2];
    if (!dataPart) return "";
    return Buffer.concat([
      Utils.numberToBuffer(dataPart.len),
      dataPart.buf,
    ]).toString("hex");
  }
}
