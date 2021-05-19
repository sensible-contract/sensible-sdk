"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonFungibleToken = void 0;
const path = require("path");
const scryptlib_1 = require("scryptlib");
const Utils = require("../common/utils");
const PayloadNFT_1 = require("./PayloadNFT");
const DataLen4 = 4;
const Signature = scryptlib_1.bsv.crypto.Signature;
const sighashType = Signature.SIGHASH_ANYONECANPAY |
    Signature.SIGHASH_ALL |
    Signature.SIGHASH_FORKID;
var contractJsonPath = "../../contract-desc/bcp01/";
const loadDesc = (filename) => require(path.join(contractJsonPath, filename));
const nftContractClass = scryptlib_1.buildContractClass(require("./contract-desc/nft_desc.json"));
class NonFungibleToken {
    /**
     * @param {bigint} rabinPubKey
     * @constructor NFT合约
     */
    constructor(rabinPubKey) {
        this.nftContract = new nftContractClass(rabinPubKey);
        this.nftCodePart = this.nftContract.codePart.toASM();
    }
    setTxGenesisPart({ prevTxId, outputIndex, issueOutputIndex = 0 }) {
        this.nftGenesisPart =
            Utils.reverseEndian(prevTxId) +
                scryptlib_1.num2bin(outputIndex, DataLen4) +
                scryptlib_1.num2bin(issueOutputIndex, DataLen4);
    }
    async makeTxGenesis({ issuerPk, tokenId, totalSupply, opreturnData, utxoPrivateKeys, utxos, changeAddress, feeb, }) {
        let tx = new scryptlib_1.bsv.Transaction().from(utxos.map((utxo) => ({
            txId: utxo.txId,
            outputIndex: utxo.outputIndex,
            satoshis: utxo.satoshis,
            script: scryptlib_1.bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
        })));
        let pl = new PayloadNFT_1.PayloadNFT({
            dataType: PayloadNFT_1.ISSUE,
            ownerPkh: issuerPk._getID(),
            totalSupply: totalSupply,
            tokenId: tokenId,
        });
        const lockingScript = scryptlib_1.bsv.Script.fromASM([this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" "));
        tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
            script: lockingScript,
            satoshis: Utils.getDustThreshold(lockingScript.toBuffer().length),
        }));
        if (opreturnData) {
            tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
                script: new scryptlib_1.bsv.Script.buildSafeDataOut(opreturnData),
                satoshis: 0,
            }));
        }
        tx.change(changeAddress);
        tx.fee(Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb));
        //unlock P2PKH
        tx.inputs.forEach((input, inputIndex) => {
            if (input.script.toBuffer().length == 0) {
                let privateKey = utxoPrivateKeys.splice(0, 1)[0];
                Utils.unlockP2PKHInput(privateKey, tx, inputIndex, sighashType);
            }
        });
        return tx;
    }
    async makeTxIssue({ issuerTxId, issuerOutputIndex, issuerLockingScript, satotxData, issuerPrivateKey, receiverAddress, metaTxId, opreturnData, signers, utxos, utxoPrivateKeys, changeAddress, feeb, }) {
        let issuerPk = issuerPrivateKey.publicKey;
        let tx = new scryptlib_1.bsv.Transaction().from(utxos.map((utxo) => ({
            txId: utxo.txId,
            outputIndex: utxo.outputIndex,
            satoshis: utxo.satoshis,
            script: scryptlib_1.bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
        })));
        let pl = new PayloadNFT_1.PayloadNFT();
        pl.read(issuerLockingScript.toBuffer());
        this.nftContract.setDataPart(this.nftGenesisPart + " " + pl.dump());
        pl.tokenId = pl.tokenId + BigInt(1);
        let reachTotalSupply = pl.tokenId == pl.totalSupply;
        const newLockingScript0 = scryptlib_1.bsv.Script.fromASM([this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" "));
        pl.dataType = PayloadNFT_1.TRANSFER;
        pl.ownerPkh = receiverAddress.hashBuffer;
        pl.metaTxId = metaTxId;
        const newLockingScript1 = scryptlib_1.bsv.Script.fromASM([this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" "));
        tx.addInput(new scryptlib_1.bsv.Transaction.Input({
            output: new scryptlib_1.bsv.Transaction.Output({
                script: issuerLockingScript,
                satoshis: Utils.getDustThreshold(issuerLockingScript.toBuffer().length),
            }),
            prevTxId: issuerTxId,
            outputIndex: issuerOutputIndex,
            script: scryptlib_1.bsv.Script.empty(),
        }));
        if (!reachTotalSupply) {
            tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
                script: newLockingScript0,
                satoshis: Utils.getDustThreshold(newLockingScript0.toBuffer().length),
            }));
        }
        tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
            script: newLockingScript1,
            satoshis: Utils.getDustThreshold(newLockingScript1.toBuffer().length),
        }));
        if (opreturnData) {
            tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
                script: new scryptlib_1.bsv.Script.buildSafeDataOut(opreturnData),
                satoshis: 0,
            }));
        }
        tx.change(changeAddress);
        const curInputIndex = tx.inputs.length - 1;
        const curInputLockingScript = tx.inputs[curInputIndex].output.script;
        const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
        const nftOutputSatoshis = tx.outputs[reachTotalSupply ? 0 : 1].satoshis;
        let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
        let script = new scryptlib_1.bsv.Script(sigInfo.script);
        let preDataPartHex = this.getDataPartFromScript(script);
        //let the fee to be exact in the second round
        for (let c = 0; c < 2; c++) {
            tx.fee(Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb));
            const changeAmount = tx.outputs[tx.outputs.length - 1].satoshis;
            let sigBuf = scryptlib_1.signTx(tx, issuerPrivateKey, curInputLockingScript.toASM(), curInputSatoshis, curInputIndex, sighashType);
            const preimage = scryptlib_1.getPreimage(tx, curInputLockingScript.toASM(), curInputSatoshis, curInputIndex, sighashType);
            if (this.nftContract.lockingScript.toHex() != curInputLockingScript.toHex()) {
                console.log(this.nftContract.lockingScript.toASM());
                console.log(curInputLockingScript.toASM());
                throw "error";
            }
            let contractObj = this.nftContract.issue(new scryptlib_1.SigHashPreimage(scryptlib_1.toHex(preimage)), BigInt("0x" + sigInfo.sigBE), new scryptlib_1.Bytes(sigInfo.payload), new scryptlib_1.Bytes(sigInfo.padding), new scryptlib_1.Bytes(preDataPartHex), new scryptlib_1.Bytes(opreturnData
                ? new scryptlib_1.bsv.Script.buildSafeDataOut(opreturnData).toHex()
                : ""), new scryptlib_1.Sig(scryptlib_1.toHex(sigBuf)), new scryptlib_1.PubKey(scryptlib_1.toHex(issuerPk)), new scryptlib_1.Bytes(metaTxId), new scryptlib_1.Ripemd160(scryptlib_1.toHex(receiverAddress.hashBuffer)), nftOutputSatoshis, new scryptlib_1.Ripemd160(scryptlib_1.toHex(changeAddress.hashBuffer)), changeAmount);
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
    async makeTxTransfer({ transferTxId, transferOutputIndex, transferLockingScript, satotxData, senderPrivateKey, receiverAddress, opreturnData, utxos, utxoPrivateKeys, changeAddress, feeb, signers, }) {
        let tx = new scryptlib_1.bsv.Transaction().from(utxos.map((utxo) => ({
            txId: utxo.txId,
            outputIndex: utxo.outputIndex,
            satoshis: utxo.satoshis,
            script: scryptlib_1.bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
        })));
        let senderPk = senderPrivateKey.publicKey;
        let pl = new PayloadNFT_1.PayloadNFT();
        pl.read(transferLockingScript.toBuffer());
        this.nftContract.setDataPart(this.nftGenesisPart + " " + pl.dump());
        pl.ownerPkh = receiverAddress.hashBuffer;
        const newLockingScript0 = scryptlib_1.bsv.Script.fromASM([this.nftCodePart, this.nftGenesisPart, pl.dump()].join(" "));
        tx.addInput(new scryptlib_1.bsv.Transaction.Input({
            output: new scryptlib_1.bsv.Transaction.Output({
                script: transferLockingScript,
                satoshis: Utils.getDustThreshold(transferLockingScript.toBuffer().length),
            }),
            prevTxId: transferTxId,
            outputIndex: transferOutputIndex,
            script: scryptlib_1.bsv.Script.empty(),
        }));
        tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
            script: newLockingScript0,
            satoshis: Utils.getDustThreshold(newLockingScript0.toBuffer().length),
        }));
        if (opreturnData) {
            tx.addOutput(new scryptlib_1.bsv.Transaction.Output({
                script: new scryptlib_1.bsv.Script.buildSafeDataOut(opreturnData),
                satoshis: 0,
            }));
        }
        tx.change(changeAddress);
        const curInputIndex = tx.inputs.length - 1;
        const curInputLockingScript = tx.inputs[curInputIndex].output.script;
        const curInputSatoshis = tx.inputs[curInputIndex].output.satoshis;
        const nftOutputSatoshis = tx.outputs[0].satoshis;
        let sigInfo = await signers[0].satoTxSigUTXOSpendBy(satotxData);
        let script = new scryptlib_1.bsv.Script(sigInfo.script);
        let preDataPartHex = this.getDataPartFromScript(script);
        for (let c = 0; c < 2; c++) {
            tx.fee(Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb));
            const changeAmount = tx.outputs[tx.outputs.length - 1].satoshis;
            this.nftContract.txContext = {
                tx: tx,
                inputIndex: curInputIndex,
                inputSatoshis: curInputSatoshis,
            };
            let sigBuf = scryptlib_1.signTx(tx, senderPrivateKey, curInputLockingScript.toASM(), curInputSatoshis, curInputIndex, sighashType);
            const preimage = scryptlib_1.getPreimage(tx, transferLockingScript.toASM(), curInputSatoshis, curInputIndex, sighashType);
            let contractObj = this.nftContract.issue(new scryptlib_1.SigHashPreimage(scryptlib_1.toHex(preimage)), BigInt("0x" + sigInfo.sigBE), new scryptlib_1.Bytes(sigInfo.payload), new scryptlib_1.Bytes(sigInfo.padding), new scryptlib_1.Bytes(preDataPartHex), new scryptlib_1.Bytes(opreturnData
                ? new scryptlib_1.bsv.Script.buildSafeDataOut(opreturnData).toHex()
                : ""), new scryptlib_1.Sig(sigBuf.toString("hex")), new scryptlib_1.PubKey(scryptlib_1.toHex(senderPk)), new scryptlib_1.Bytes(""), new scryptlib_1.Ripemd160(scryptlib_1.toHex(receiverAddress.hashBuffer)), nftOutputSatoshis, new scryptlib_1.Ripemd160(scryptlib_1.toHex(changeAddress.hashBuffer)), changeAmount);
            let txContext = {
                tx,
                inputIndex: curInputIndex,
                inputSatoshis: curInputSatoshis,
            };
            let ret = contractObj.verify(txContext);
            if (ret.success == false)
                throw ret;
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
        if (opreturnIdx == -1)
            return "";
        let parts = chunks.splice(opreturnIdx, chunks.length);
        let genesisPart = parts[1];
        let dataPart = parts[2];
        if (!dataPart)
            return "";
        return dataPart.len.toString(16) + dataPart.buf.toString("hex");
    }
}
exports.NonFungibleToken = NonFungibleToken;
