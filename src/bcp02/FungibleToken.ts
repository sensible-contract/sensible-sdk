import {
  bsv,
  buildContractClass,
  Bytes,
  getPreimage,
  PubKey,
  Ripemd160,
  Sig,
  SigHashPreimage,
  signTx,
  toHex,
} from "scryptlib";
import * as Utils from "../common/utils";
import * as TokenProto from "./tokenProto";
import * as TokenUtil from "./tokenUtil";
const Signature = bsv.crypto.Signature;
export const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
const genesisFlag = 1;
const nonGenesisFlag = 0;
const tokenType = 1;
const genesisTokenIDTxid =
  "0000000000000000000000000000000000000000000000000000000000000000";
const GenesisContractClass = buildContractClass(
  require("./contract-desc/tokenGenesis_desc.json")
);
const TokenContractClass = buildContractClass(
  require("./contract-desc/token_desc.json")
);
const RouteCheckContractClass_3To3 = buildContractClass(
  require("./contract-desc/tokenRouteCheck_desc.json")
);

const RouteCheckContractClass_6To6 = buildContractClass(
  require("./contract-desc/tokenRouteCheck_6To6_desc.json")
);

const RouteCheckContractClass_10To10 = buildContractClass(
  require("./contract-desc/tokenRouteCheck_10To10_desc.json")
);

const RouteCheckContractClass_3To100 = buildContractClass(
  require("./contract-desc/tokenRouteCheck_3To100_desc.json")
);

const RouteCheckContractClass_20To3 = buildContractClass(
  require("./contract-desc/tokenRouteCheck_20To3_desc.json")
);

const UnlockContractCheckContractClass_1To5 = buildContractClass(
  require("./contract-desc/tokenUnlockContractCheck_1To5_desc.json")
);

const UnlockContractCheckContractClass_4To8 = buildContractClass(
  require("./contract-desc/tokenUnlockContractCheck_4To8_desc.json")
);

const UnlockContractCheckContractClass_8To12 = buildContractClass(
  require("./contract-desc/tokenUnlockContractCheck_8To12_desc.json")
);

const UnlockContractCheckContractClass_20To5 = buildContractClass(
  require("./contract-desc/tokenUnlockContractCheck_20To5_desc.json")
);

const UnlockContractCheckContractClass_3To100 = buildContractClass(
  require("./contract-desc/tokenUnlockContractCheck_3To100_desc.json")
);

export enum RouteCheckType {
  from3To3 = "3To3",
  from6To6 = "6To6",
  from10To10 = "10To10",
  from3To100 = "3To100",
  from20To3 = "20To3",
}
export class FungibleToken {
  rabinPubKeyArray: bigint[];
  routeCheckCodeHashArray: Bytes[];
  unlockContractCodeHashArray: Bytes[];
  constructor(
    rabinPubKey1: bigint,
    rabinPubKey2: bigint,
    rabinPubKey3: bigint
  ) {
    this.rabinPubKeyArray = [rabinPubKey1, rabinPubKey2, rabinPubKey3];

    this.routeCheckCodeHashArray = [
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_3To3(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_6To6(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_10To10(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_3To100(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new RouteCheckContractClass_20To3(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
    ];

    this.unlockContractCodeHashArray = [
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_1To5(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_4To8(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_8To12(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_20To5(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
      new Bytes(
        Buffer.from(
          bsv.crypto.Hash.sha256ripemd160(
            new UnlockContractCheckContractClass_3To100(
              this.rabinPubKeyArray
            ).lockingScript.toBuffer()
          )
        ).toString("hex")
      ),
    ];
  }

  /**
   * create genesis contract
   * @param {Object} issuerPubKey issuer public key used to unlocking genesis contract
   * @param {string} tokenName the token name
   * @param {string} tokenSymbol the token symbol
   * @param {number} decimalNum the token amount decimal number
   * @returns
   */
  createGenesisContract(
    issuerPubKey,
    {
      tokenName,
      tokenSymbol,
      decimalNum,
    }: { tokenName?: string; tokenSymbol?: string; decimalNum?: number } = {}
  ) {
    const genesisContract = new GenesisContractClass(
      new PubKey(toHex(issuerPubKey)),
      this.rabinPubKeyArray
    );
    if (tokenName) {
      const dataPart = TokenProto.newDataPart({
        tokenName,
        tokenSymbol,
        genesisFlag,
        decimalNum,
        tokenType,
      });
      genesisContract.setDataPart(dataPart.toString("hex"));
    }

    return genesisContract;
  }

  /**
   * create a tx for genesis
   * @param {bsv.PrivateKey} privateKey the privatekey that utxos belong to
   * @param {Object[]} utxos utxos
   * @param {bsv.Address} changeAddress the change address
   * @param {number} feeb feeb
   * @param {string} genesisScript genesis contract's locking scriptsatoshis
   */
  createGenesisTx({
    utxos,
    changeAddress,
    feeb,
    genesisContract,
    utxoPrivateKeys,
    opreturnData,
  }) {
    const tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
      }))
    );
    tx.addOutput(
      new bsv.Transaction.Output({
        script: genesisContract.lockingScript,
        satoshis: Utils.getDustThreshold(
          genesisContract.lockingScript.toBuffer().length
        ),
      })
    );

    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = new bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
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

  /**
   * create token contract from genesis contract utxo
   * @param {string} genesisTxId the genesis txid
   * @param {number} genesisTxOutputIndex the genesis utxo output index
   * @param {bsv.Script} genesisScript the genesis contract's locking script
   * @param {bsv.Address} receiverAddress receiver's address
   * @param {BigInt} tokenAmount the token amount want to create
   * @returns
   */
  createTokenContract(
    genesisTxId: string,
    genesisTxOutputIndex: number,
    genesisLockingScript: any,
    {
      receiverAddress,
      tokenAmount,
    }: { receiverAddress: any; tokenAmount: bigint }
  ) {
    const scriptBuffer = genesisLockingScript.toBuffer();
    const dataPartObj = TokenProto.parseDataPart(scriptBuffer);

    let genesisHash;
    if (dataPartObj.tokenID.txid == genesisTokenIDTxid) {
      //首发
      dataPartObj.tokenID = {
        txid: genesisTxId,
        index: genesisTxOutputIndex,
      };
      const newScriptBuf = TokenProto.updateScript(scriptBuffer, dataPartObj);
      genesisHash = bsv.crypto.Hash.sha256ripemd160(newScriptBuf); //to avoid generate the same genesisHash,
    } else {
      //增发
      genesisHash = bsv.crypto.Hash.sha256ripemd160(scriptBuffer);
    }

    const tokenContract = new TokenContractClass(
      this.rabinPubKeyArray,
      this.routeCheckCodeHashArray,
      this.unlockContractCodeHashArray,
      new Bytes(toHex(genesisHash))
    );
    if (receiverAddress) {
      dataPartObj.genesisFlag = nonGenesisFlag;
      dataPartObj.tokenAddress = toHex(receiverAddress.hashBuffer);
      dataPartObj.tokenAmount = tokenAmount;
      const dataPart = TokenProto.newDataPart(dataPartObj);
      tokenContract.setDataPart(toHex(dataPart));
    }

    return tokenContract;
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

    issuerPrivateKey,
    utxoPrivateKeys,
  }) {
    const tx = new bsv.Transaction();

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
      genesisDataPartObj.tokenID.txid == genesisTokenIDTxid;

    let genesisContractSatoshis = 0;
    if (allowIncreaseIssues) {
      genesisDataPartObj.tokenID = tokenDataPartObj.tokenID;
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

    tx.addOutput(
      new bsv.Transaction.Output({
        script: tokenContract.lockingScript,
        satoshis: tokenContractSatoshis,
      })
    );

    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = new bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }
    tx.change(changeAddress);

    const genesisInputIndex = 0;
    const genesisInputSatoshis = tx.inputs[genesisInputIndex].output.satoshis;
    const genesisInputLockingScript =
      tx.inputs[genesisInputIndex].output.script;

    let rabinMsg;
    let rabinPaddingArray = [];
    let rabinSigArray = [];
    let rabinPubKeyIndexArray = [];
    if (isFirstGenesis) {
      rabinMsg = Buffer.alloc(1, 0);
      rabinPaddingArray = [new Bytes("00"), new Bytes("00")];
      rabinSigArray = [0, 0];
      rabinPubKeyIndexArray = [0, 1];
    } else {
      let signerSelecteds = [];
      for (let i = 0; i < 3; i++) {
        if (signerSelecteds.length == 2) break;
        try {
          let sigInfo = await signers[i].satoTxSigUTXOSpendBy(satotxData);
          rabinMsg = sigInfo.payload;
          rabinPaddingArray.push(new Bytes(sigInfo.padding));
          rabinSigArray.push(BigInt("0x" + sigInfo.sigBE));
          signerSelecteds.push(i);
        } catch (e) {}
      }

      rabinPubKeyIndexArray = signerSelecteds;
    }

    if (
      genesisContract.lockingScript.toHex() != genesisInputLockingScript.toHex()
    ) {
      console.log(genesisContract.lockingScript.toASM());
      console.log(genesisInputLockingScript.toASM());
      throw "error";
    }

    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil((tx.serialize(true).length / 2 + utxos.length * 107) * feeb)
      );
      let sig = signTx(
        tx,
        issuerPrivateKey,
        genesisInputLockingScript.toASM(),
        genesisInputSatoshis,
        genesisInputIndex,
        sighashType
      );
      let changeSatoshis = tx.outputs[tx.outputs.length - 1].satoshis;
      let preimage = getPreimage(
        tx,
        genesisInputLockingScript.toASM(),
        genesisInputSatoshis,
        genesisInputIndex,
        sighashType
      );
      let contractObj = genesisContract.unlock(
        new SigHashPreimage(toHex(preimage)),
        new Sig(toHex(sig)),
        new Bytes(toHex(rabinMsg)),
        rabinPaddingArray,
        rabinSigArray,
        rabinPubKeyIndexArray,
        genesisContractSatoshis,
        new Bytes(tokenContract.lockingScript.toHex()),
        tokenContractSatoshis,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        changeSatoshis,
        new Bytes(opreturnScriptHex)
      );
      let txContext = {
        tx,
        inputIndex: genesisInputIndex,
        inputSatoshis: genesisInputSatoshis,
      };
      let ret = contractObj.verify(txContext);
      if (ret.success == false) throw ret;
      tx.inputs[genesisInputIndex].setScript(contractObj.toScript());
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

  createRouteCheckContract(
    routeCheckType: RouteCheckType,
    tokenInputArray,
    tokenOutputArray,
    tokenID,
    tokenCodeHash
  ) {
    let recervierArray = Buffer.alloc(0, 0);
    let receiverTokenAmountArray = Buffer.alloc(0, 0);
    for (let i = 0; i < tokenOutputArray.length; i++) {
      const item = tokenOutputArray[i];
      recervierArray = Buffer.concat([recervierArray, item.address.hashBuffer]);
      const amountBuf = TokenUtil.getUInt64Buf(item.tokenAmount);
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        amountBuf,
      ]);
    }
    let routeCheckContract;
    if (routeCheckType == RouteCheckType.from3To3) {
      routeCheckContract = new RouteCheckContractClass_3To3(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == RouteCheckType.from6To6) {
      routeCheckContract = new RouteCheckContractClass_6To6(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == RouteCheckType.from10To10) {
      routeCheckContract = new RouteCheckContractClass_10To10(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == RouteCheckType.from3To100) {
      routeCheckContract = new RouteCheckContractClass_3To100(
        this.rabinPubKeyArray
      );
    } else if (routeCheckType == RouteCheckType.from20To3) {
      routeCheckContract = new RouteCheckContractClass_20To3(
        this.rabinPubKeyArray
      );
    }

    const data = Buffer.concat([
      TokenUtil.getUInt32Buf(tokenInputArray.length),
      receiverTokenAmountArray,
      recervierArray,
      TokenUtil.getUInt32Buf(tokenOutputArray.length),
      tokenCodeHash,
      tokenID,
    ]);
    routeCheckContract.setDataPart(toHex(data));
    return routeCheckContract;
  }

  createRouteCheckTx({
    utxos,
    changeAddress,
    feeb,
    routeCheckContract,
    utxoPrivateKeys,
  }) {
    const tx = new bsv.Transaction().from(
      utxos.map((utxo) => ({
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: bsv.Script.buildPublicKeyHashOut(utxo.address).toHex(),
      }))
    );

    tx.addOutput(
      new bsv.Transaction.Output({
        script: routeCheckContract.lockingScript,
        satoshis: Utils.getDustThreshold(
          routeCheckContract.lockingScript.toBuffer().length
        ),
      })
    );

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

  createTransferTx({
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
    utxoPrivateKeys,
    changeAddress,
    feeb,
    opreturnData,
  }) {
    const tx = new bsv.Transaction();
    let senderPk = senderPrivateKey.publicKey;

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
      const amountBuf = Buffer.alloc(8, 0);
      amountBuf.writeBigUInt64LE(
        BigInt(TokenProto.getTokenAmount(tokenScriptBuf))
      );
      inputTokenAmountArray = Buffer.concat([inputTokenAmountArray, amountBuf]);

      // add outputpoint to prevouts
      const indexBuf = TokenUtil.getUInt32Buf(outputIndex);
      const txidBuf = TokenUtil.getTxIdBuf(txId);

      prevouts = Buffer.concat([prevouts, txidBuf, indexBuf]);
    }

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

    // add routeCheckTx
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
      const tokenBuf = Buffer.alloc(8, 0);
      tokenBuf.writeBigUInt64LE(BigInt(outputTokenAmount));
      receiverTokenAmountArray = Buffer.concat([
        receiverTokenAmountArray,
        tokenBuf,
      ]);
      const satoshiBuf = Buffer.alloc(8, 0);
      satoshiBuf.writeBigUInt64LE(BigInt(outputSatoshis));
      outputSatoshiArray = Buffer.concat([outputSatoshiArray, satoshiBuf]);
    }

    let opreturnScriptHex = "";
    if (opreturnData) {
      let script = new bsv.Script.buildSafeDataOut(opreturnData);
      opreturnScriptHex = script.toHex();
      tx.addOutput(
        new bsv.Transaction.Output({
          script,
          satoshis: 0,
        })
      );
    }

    tx.change(changeAddress);
    //let the fee to be exact in the second round
    for (let c = 0; c < 2; c++) {
      tx.fee(
        Math.ceil(
          (tx.serialize(true).length / 2 + satoshiInputArray.length * 107) *
            feeb
        )
      );
      let changeSatoshis = tx.outputs[tx.outputs.length - 1].satoshis;
      const routeCheckInputIndex = tokenInputLen + satoshiInputArray.length;
      for (let i = 0; i < tokenInputLen; i++) {
        const tokenInput = tokenInputArray[i];
        const tokenInputLockingScript = tokenInput.lockingScript;
        const tokenInputSatoshis = tokenInput.satoshis;
        const tokenInputIndex = i;

        let sig = signTx(
          tx,
          senderPrivateKey,
          tokenInputLockingScript.toASM(),
          tokenInputSatoshis,
          tokenInputIndex,
          sighashType
        );

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

        // this.createGenesisContract(dataPartObj);
        let genesisHash = "";
        let c = 0;
        for (let i = 0; i < tokenInputLockingScript.chunks.length; i++) {
          let chunk = tokenInputLockingScript.chunks[i];
          if (chunk.buf && chunk.buf.length == 20) {
            c++;
            if (c == 11) {
              genesisHash = chunk.buf;
              break;
            }
          }
        }
        const tokenContract = new TokenContractClass(
          this.rabinPubKeyArray,
          this.routeCheckCodeHashArray,
          this.unlockContractCodeHashArray,
          new Bytes(toHex(genesisHash))
        );

        tokenContract.setDataPart(toHex(dataPart));

        //check preimage
        if (
          tokenContract.lockingScript.toHex() != tokenInputLockingScript.toHex()
        ) {
          console.log(tokenContract.lockingScript.toASM());
          console.log(tokenInputLockingScript.toASM());
          throw "error";
        }

        const unlockingContract = tokenContract.unlock(
          new SigHashPreimage(toHex(preimage)),
          tokenInputIndex,
          new Bytes(toHex(prevouts)),
          new Bytes(toHex(tokenRanbinData.tokenRabinMsg)),
          tokenRanbinData.tokenRabinPaddingArray,
          tokenRanbinData.tokenRabinSigArray,
          rabinPubKeyIndexArray,
          routeCheckInputIndex,
          new Bytes(routeCheckTx.serialize(true)),
          0,
          tokenOutputLen,
          new Bytes(toHex(tokenInput.preTokenAddress.hashBuffer)),
          tokenInput.preTokenAmount,
          new PubKey(toHex(senderPk)),
          new Sig(toHex(sig)),
          0,
          new Bytes("00"),
          0,
          1
        );
        let txContext = {
          tx,
          inputIndex: tokenInputIndex,
          inputSatoshis: tokenInputSatoshis,
        };
        let ret = unlockingContract.verify(txContext);
        if (ret.success == false) throw ret;
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

      let unlockingContract = routeCheckContract.unlock(
        new SigHashPreimage(toHex(preimage)),
        new Bytes(tokenInputArray[0].lockingScript.toHex()),
        new Bytes(toHex(prevouts)),
        new Bytes(toHex(checkRabinMsgArray)),
        new Bytes(toHex(checkRabinPaddingArray)),
        new Bytes(toHex(checkRabinSigArray)),
        rabinPubKeyIndexArray,
        new Bytes(toHex(inputTokenAddressArray)),
        new Bytes(toHex(inputTokenAmountArray)),
        new Bytes(toHex(outputSatoshiArray)),
        changeSatoshis,
        new Ripemd160(toHex(changeAddress.hashBuffer)),
        new Bytes(opreturnScriptHex)
      );
      let txContext = {
        tx,
        inputIndex: routeCheckInputIndex,
        inputSatoshis: routeCheckInputSatoshis,
      };
      let ret = unlockingContract.verify(txContext);
      if (ret.success == false) throw ret;
      tx.inputs[routeCheckInputIndex].setScript(unlockingContract.toScript());
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
}
