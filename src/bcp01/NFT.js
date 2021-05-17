// @ts-nocheck
const {
  bsv,
  buildContractClass,
  Bytes,
  getPreimage,
  num2bin,
  PubKey,
  Ripemd160,
  Sha256,
  Sig,
  SigHashPreimage,
  signTx,
  toHex,
} = require("scryptlib");
const path = require("path");
const { PayloadNFT, ISSUE, TRANSFER } = require("./PayloadNFT");
const Utils = require("../common/utils");
const DataLen4 = 4;
const Signature = bsv.crypto.Signature;
const sighashType =
  Signature.SIGHASH_ANYONECANPAY |
  Signature.SIGHASH_ALL |
  Signature.SIGHASH_FORKID;
var contractJsonPath = "../../contract-desc/bcp01/";
const loadDesc = (filename) => require(path.join(contractJsonPath, filename));
class NFT {
  /**
   * @param {Boolean} pubkey
   * @constructor NFT合约 forge
   */
  constructor(rabinPubKey) {
    const nftContractClass = buildContractClass(
      require("./contract-desc/nft_desc.json")
    );
    this.nft = new nftContractClass(rabinPubKey);
    this.nftCodePart = this.nft.codePart.toASM();
  }

  setTxGenesisPart({ prevTxId, outputIndex, issueOutputIndex = 0 }) {
    this.nftGenesisPart =
      Utils.reverseEndian(prevTxId) +
      num2bin(outputIndex, DataLen4) +
      num2bin(issueOutputIndex, DataLen4);
  }

  async makeTxGenesis({
    issuerPk,
    tokenId,
    totalSupply,
    opreturnData,

    utxoPrivateKeys,
    utxos,
    changeAddress,
    feeb,
  }) {
    let tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
      }))
    );

    let pl = new PayloadNFT({
      dataType: ISSUE,
      ownerPkh: issuerPk._getID(),
      totalSupply: totalSupply,
      tokenId: tokenId,
    });
    const lockingScript = bsv.Script.fromASM(
      [this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" ")
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: lockingScript,
        satoshis: Utils.getDustThreshold(lockingScript.toBuffer().length),
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

    tx.change(changeAddress);
    tx.fee(
      Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
    );

    //unlock P2PKH
    tx.inputs.forEach((input, inputIndex) => {
      if (input.script.toBuffer().length == 0) {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
      }
    });
    return tx;
  }

  async makeTxIssue({
    issuerTxId,
    issuerOutputIndex,
    issuerLockingScript,
    satotxData,

    issuerPrivateKey,
    receiverAddress,
    metaTxId,
    opreturnData,

    signers,
    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
  }) {
    let issuerPk = issuerPrivateKey.publicKey;
    let tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
      }))
    );

    let pl = new PayloadNFT();
    pl.read(issuerLockingScript.toBuffer());
    this.nft.setDataPart(this.nftGenesisPart + " " + pl.dump());

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

    tx.change(changeAddress);

    const curInputIndex = tx.inputs.length - 1;
    const curInputLockingScript = tx.inputs[curInputIndex].output.script;
    const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
    const nftOutputSatoshis = tx.outputs[reachTotalSupply ? 0 : 1].satoshis;

    let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
    let script = new bsv.Script(sigInfo.script);
    let preDataPartHex = this.getDataPartFromScript(script);

    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
      );
      const changeAmount = tx.outputs[tx.outputs.length - 1].satoshis;

      let sigBuf = signTx(
        tx,
        issuerPrivateKey,
        curInputLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      const preimage = getPreimage(
        tx,
        curInputLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      if (this.nft.lockingScript.toHex() != curInputLockingScript.toHex()) {
        console.log(this.nft.lockingScript.toASM());
        console.log(curInputLockingScript.toASM());
        throw "error";
      }

      let contractObj = this.nft.issue(
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
        new Sig(toHex(sigBuf)),
        new PubKey(toHex(issuerPk)),
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
      let ret = contractObj.verify(txContext);
      if (ret.success == false) {
        throw ret;
      }

      tx.inputs[curInputIndex].setScript(contractObj.toScript());
    }

    //unlock P2PKH
    tx.inputs.forEach((input, inputIndex) => {
      if (input.script.toBuffer().length == 0) {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
      }
    });
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
    receiverAddress,
    opreturnData,

    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    signers,
  }) {
    let tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
      }))
    );

    let senderPk = senderPrivateKey.publicKey;
    let pl = new PayloadNFT();
    pl.read(transferLockingScript.toBuffer());

    this.nft.setDataPart(this.nftGenesisPart + " " + pl.dump());

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

    tx.change(changeAddress);

    const curInputIndex = tx.inputs.length - 1;
    const curInputLockingScript = tx.inputs[curInputIndex].output.script;
    const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
    const nftOutputSatoshis = tx.outputs[0].satoshis;

    let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
    let script = new bsv.Script(sigInfo.script);
    let preDataPartHex = this.getDataPartFromScript(script);

    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
      );
      const changeAmount = tx.outputs[tx.outputs.length - 1].satoshis;

      this.nft.txContext = {
        tx: tx,
        inputIndex: curInputIndex,
        inputSatoshis: curInputSatoshis,
      };

      let sigBuf = signTx(
        tx,
        senderPrivateKey,
        curInputLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      const preimage = getPreimage(
        tx,
        transferLockingScript.toASM(),
        curInputSatoshis,
        curInputIndex,
        sighashType
      );

      let contractObj = this.nft.issue(
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
        new Sig(sigBuf.toString("hex")),
        new PubKey(toHex(senderPk)),
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
      let ret = contractObj.verify(txContext);
      if (ret.success == false) throw ret;
      tx.inputs[curInputIndex].setScript(contractObj.toScript());
    }

    //unlock P2PKH
    tx.inputs.forEach((input, inputIndex) => {
      if (input.script.toBuffer().length == 0) {
        let privateKey = utxoPrivateKeys.splice(0, 1)[0];
        Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
      }
    });
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
    return dataPart.len.toString(16) + dataPart.buf.toString("hex");
  }
}

module.exports = {
  NFT,
  sighashType,
};
