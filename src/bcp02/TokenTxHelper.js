const { bsv, Bytes, toHex } = require("scryptlib");
const Utils = require("../common/utils");
const { FungibleToken, sighashType } = require("./FungibleToken");
const TokenProto = require("./tokenProto");
const TokenUtil = require("./tokenUtil");
class TokenTxHelper {
  static getGenesis(txid, index) {
    const txidBuf = Buffer.from(txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(index);
    return toHex(Buffer.concat([txidBuf, indexBuf]));
  }

  static parseGenesis(genesis) {
    let tokenIDBuf = Buffer.from(genesis, "hex");
    let genesisTxId = tokenIDBuf.slice(0, 32).reverse().toString("hex");
    let genesisOutputIndex = tokenIDBuf.readUIntLE(32, 4);
    return {
      genesisTxId,
      genesisOutputIndex,
    };
  }

  static async genesis({
    issuerPrivateKey,
    tokenName,
    tokenSymbol,
    decimalNum,

    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    network = "mainnet",
    signers,
  }) {
    utxos.forEach((utxo) => {
      utxo.address = new bsv.Address(utxo.address, network);
    });
    changeAddress = new bsv.Address(changeAddress, network);
    let issuerPk = issuerPrivateKey.publicKey;

    let ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );

    //create genesis contract
    let genesisContract = ft.createGenesisContract(issuerPk, {
      tokenName,
      tokenSymbol,
      decimalNum,
    });

    //create genesis tx
    let tx = ft.createGenesisTx({
      utxos,
      changeAddress,
      feeb,
      genesisContract,
      utxoPrivateKeys,
    });

    let genesisTxId = tx.id;
    let genesisOutputIndex = 0;
    let genesis = this.getGenesis(genesisTxId, genesisOutputIndex);

    let tokenContract = ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      {
        receiverAddress: changeAddress, //dummy address
        tokenAmount: 0,
      }
    );

    let codehash = Utils.getCodeHash(tokenContract.lockingScript);

    return {
      genesis,
      codehash,
      tx,
    };
  }

  static async issue({
    genesisTxId,
    genesisOutputIndex,
    preUtxoTxId,
    preUtxoOutputIndex,
    preUtxoTxHex,
    spendByTxId,
    spendByOutputIndex,
    spendByTxHex,

    issuerPrivateKey,
    receiverAddress,
    tokenAmount,
    allowIncreaseIssues,

    utxos,
    utxoPrivateKeys,
    changeAddress,

    feeb,
    network = "mainnet",
    signers,
  }) {
    utxos.forEach((utxo) => {
      utxo.address = new bsv.Address(utxo.address, network);
    });
    changeAddress = new bsv.Address(changeAddress, network);
    let issuerPk = issuerPrivateKey.publicKey;
    receiverAddress = new bsv.Address(receiverAddress, network);
    tokenAmount = BigInt(tokenAmount);

    let ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );

    const preIssueTx = new bsv.Transaction(spendByTxHex);
    const genesisLockingScript = preIssueTx.outputs[spendByOutputIndex].script;

    let dataPartObj = TokenProto.parseDataPart(genesisLockingScript.toBuffer());
    let genesisContract = ft.createGenesisContract(issuerPk);
    const dataPart = TokenProto.newDataPart(dataPartObj);
    genesisContract.setDataPart(dataPart.toString("hex"));

    let tokenContract = ft.createTokenContract(
      genesisTxId,
      genesisOutputIndex,
      genesisContract.lockingScript,
      {
        receiverAddress,
        tokenAmount,
      }
    );

    let tx = await ft.createIssueTx({
      genesisContract,

      genesisTxId,
      genesisOutputIndex,
      genesisLockingScript,

      utxos,
      changeAddress,
      feeb,
      issuerPk,

      tokenContract,
      allowIncreaseIssues,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },
      signers,

      issuerPrivateKey,
      utxoPrivateKeys,
    });

    return tx;
  }

  static async routeCheck({
    senderPrivateKey,
    receivers,
    ftUtxos,
    routeCheckType,

    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    network = "mainnet",
    signers,
  }) {
    utxos.forEach((utxo) => {
      utxo.address = new bsv.Address(utxo.address, network);
    });
    changeAddress = new bsv.Address(changeAddress, network);
    let senderPk = senderPrivateKey.publicKey;
    ftUtxos.forEach((v) => {
      v.tokenAmount = BigInt(v.tokenAmount);
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    let ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );

    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, network),
      tokenAmount: BigInt(v.amount),
    }));

    let routeCheckContract;

    let inputTokenAmountSum = ftUtxos.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );

    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > 0) {
      tokenOutputArray.push({
        address: bsv.Address.fromPublicKey(senderPk, network),
        tokenAmount: changeTokenAmount,
      });
    }

    const defaultFtUtxo = ftUtxos[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;
    let dataPartObj = TokenProto.parseDataPart(tokenLockingScript.toBuffer());

    //create routeCheck contract
    routeCheckContract = ft.createRouteCheckContract(
      routeCheckType,
      ftUtxos,
      tokenOutputArray,
      TokenProto.newTokenID(
        dataPartObj.tokenID.txid,
        dataPartObj.tokenID.index
      ),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    let routeCheckTx = ft.createRouteCheckTx({
      utxos,
      changeAddress,
      feeb,
      routeCheckContract,
      senderPrivateKey,
      utxoPrivateKeys,
    });

    return routeCheckTx;
  }

  static async transfer({
    senderPrivateKey,
    receivers,
    ftUtxos,
    routeCheckType,
    routeCheckTx,
    signerSelecteds,
    opreturnData,

    utxos,
    utxoPrivateKeys,
    changeAddress,
    feeb,
    network = "mainnet",
    signers,
  }) {
    changeAddress = new bsv.Address(changeAddress, network);
    let senderPk = senderPrivateKey.publicKey;
    ftUtxos.forEach((v) => {
      v.tokenAmount = BigInt(v.tokenAmount);
      v.preTokenAmount = BigInt(v.preTokenAmount);
    });

    let ft = new FungibleToken(
      BigInt("0x" + signers[0].satotxPubKey),
      BigInt("0x" + signers[1].satotxPubKey),
      BigInt("0x" + signers[2].satotxPubKey)
    );

    let tokenOutputArray = receivers.map((v) => ({
      address: new bsv.Address(v.address, network),
      tokenAmount: BigInt(v.amount),
    }));

    let inputTokenAmountSum = ftUtxos.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );
    let outputTokenAmountSum = tokenOutputArray.reduce(
      (pre, cur) => pre + cur.tokenAmount,
      0n
    );

    let changeTokenAmount = inputTokenAmountSum - outputTokenAmountSum;
    if (changeTokenAmount > 0) {
      tokenOutputArray.push({
        address: bsv.Address.fromPublicKey(senderPk, network),
        tokenAmount: changeTokenAmount,
      });
    }

    const defaultFtUtxo = ftUtxos[0];
    const ftUtxoTx = new bsv.Transaction(defaultFtUtxo.txHex);
    const tokenLockingScript =
      ftUtxoTx.outputs[defaultFtUtxo.outputIndex].script;
    let dataPartObj = TokenProto.parseDataPart(tokenLockingScript.toBuffer());

    //create routeCheck contract
    let routeCheckContract = ft.createRouteCheckContract(
      routeCheckType,
      ftUtxos,
      tokenOutputArray,
      TokenProto.newTokenID(
        dataPartObj.tokenID.txid,
        dataPartObj.tokenID.index
      ),
      TokenProto.getContractCodeHash(tokenLockingScript.toBuffer())
    );

    //create routeCheck tx
    // let routeCheckTx = new bsv.Transaction(routeCheckHex);

    const tokenInputArray = ftUtxos.map((v) => {
      const preTx = new bsv.Transaction(v.preTxHex);
      const preLockingScript = preTx.outputs[v.preOutputIndex].script;
      const tx = new bsv.Transaction(v.txHex);
      const lockingScript = tx.outputs[v.outputIndex].script;
      return {
        satoshis: v.satoshis,
        txId: v.txId,
        outputIndex: v.outputIndex,
        lockingScript,
        preTxId: v.preTxId,
        preOutputIndex: v.preOutputIndex,
        preLockingScript,
        preTokenAddress: new bsv.Address(v.preTokenAddress, network),
        preTokenAmount: v.preTokenAmount,
      };
    });

    const satoshiInputArray = utxos.map((v) => ({
      lockingScript: bsv.Script.buildPublicKeyHashOut(v.address).toHex(),
      satoshis: v.satoshis,
      txId: v.txId,
      outputIndex: v.outputIndex,
    }));

    let checkRabinMsgArray = Buffer.alloc(0);
    let checkRabinPaddingArray = Buffer.alloc(0);
    let checkRabinSigArray = Buffer.alloc(0);

    let sigReqArray = [];
    for (let i = 0; i < ftUtxos.length; i++) {
      let v = ftUtxos[i];
      sigReqArray[i] = [];
      for (let j = 0; j < 2; j++) {
        const signerIndex = signerSelecteds[j];
        sigReqArray[i][j] = signers[signerIndex].satoTxSigUTXOSpendByUTXO({
          txId: v.preTxId,
          index: v.preOutputIndex,
          txHex: v.preTxHex,
          byTxIndex: v.outputIndex,
          byTxId: v.txId,
          byTxHex: v.txHex,
        });
      }
    }

    for (let i = 0; i < sigReqArray.length; i++) {
      for (let j = 0; j < sigReqArray[i].length; j++) {
        let sigInfo = await sigReqArray[i][j];
        if (j == 0) {
          checkRabinMsgArray = Buffer.concat([
            checkRabinMsgArray,
            Buffer.from(sigInfo.byTxPayload, "hex"),
          ]);
        }

        const sigBuf = TokenUtil.toBufferLE(
          sigInfo.byTxSigBE,
          TokenUtil.RABIN_SIG_LEN
        );
        checkRabinSigArray = Buffer.concat([checkRabinSigArray, sigBuf]);
        const paddingCountBuf = Buffer.alloc(2, 0);
        paddingCountBuf.writeUInt16LE(sigInfo.byTxPadding.length / 2);
        const padding = Buffer.alloc(sigInfo.byTxPadding.length / 2, 0);
        padding.write(sigInfo.byTxPadding, "hex");
        checkRabinPaddingArray = Buffer.concat([
          checkRabinPaddingArray,
          paddingCountBuf,
          padding,
        ]);
      }
    }
    const tokenRabinDatas = [];

    for (let i = 0; i < sigReqArray.length; i++) {
      let tokenRabinMsg;
      let tokenRabinSigArray = [];
      let tokenRabinPaddingArray = [];
      for (let j = 0; j < sigReqArray[i].length; j++) {
        let sigInfo = await sigReqArray[i][j];
        tokenRabinMsg = sigInfo.payload;
        tokenRabinSigArray.push(BigInt("0x" + sigInfo.sigBE));
        tokenRabinPaddingArray.push(new Bytes(sigInfo.padding));
      }
      tokenRabinDatas.push({
        tokenRabinMsg,
        tokenRabinSigArray,
        tokenRabinPaddingArray,
      });
    }

    let rabinPubKeyIndexArray = signerSelecteds;

    let tx = await ft.createTransferTx({
      routeCheckTx,
      tokenInputArray,
      satoshiInputArray,
      rabinPubKeyIndexArray,
      checkRabinMsgArray,
      checkRabinPaddingArray,
      checkRabinSigArray,
      tokenOutputArray,
      tokenRabinDatas,
      routeCheckContract,
      senderPrivateKey,
      changeAddress,
      utxoPrivateKeys,
      feeb,
      opreturnData,
    });
    return tx;
  }
}

module.exports = {
  TokenTxHelper,
};
