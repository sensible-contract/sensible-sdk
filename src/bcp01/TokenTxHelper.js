const { bsv, toHex } = require("scryptlib");
const { NFT, sighashType } = require("./NFT");
const Utils = require("../common/utils");
class TokenTxHelper {
  static getGenesis(txid, index, issueOutputIndex) {
    const txidBuf = Buffer.from(txid, "hex").reverse();
    const indexBuf = Buffer.alloc(4, 0);
    indexBuf.writeUInt32LE(index);
    const issueOutputIndexBuf = Buffer.alloc(4, 0);
    issueOutputIndexBuf.writeUInt32LE(issueOutputIndex);
    return toHex(Buffer.concat([txidBuf, indexBuf, issueOutputIndexBuf]));
  }

  static parseGenesis(genesis) {
    let tokenIDBuf = Buffer.from(genesis, "hex");
    let genesisTxId = tokenIDBuf.slice(0, 32).reverse().toString("hex");
    let genesisOutputIndex = tokenIDBuf.readUIntLE(32, 4);
    let issueOutputIndex = tokenIDBuf.readUIntLE(36, 4);
    return {
      genesisTxId,
      genesisOutputIndex,
      issueOutputIndex,
    };
  }

  static async genesis({
    issuerPrivateKey,
    totalSupply,
    opreturnData,

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
    totalSupply = BigInt(totalSupply);

    const utxoTxId = utxos[0].txId;
    const utxoOutputIndex = utxos[0].outputIndex;

    const nft = new NFT(BigInt("0x" + signers[0].satotxPubKey));

    nft.setTxGenesisPart({
      prevTxId: utxoTxId,
      outputIndex: utxoOutputIndex,
    });
    let tx = await nft.makeTxGenesis({
      issuerPk,
      tokenId: BigInt(0),
      totalSupply,
      opreturnData,

      utxos,
      changeAddress,
      utxoPrivateKeys,
      feeb,
    });

    let genesis = toHex(this.getGenesis(utxoTxId, utxoOutputIndex));
    let codehash = toHex(Utils.getCodeHash(tx.outputs[0].script));

    return {
      tx,
      genesis,
      codehash,
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
    metaTxId,
    opreturnData,

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

    const nft = new NFT(BigInt("0x" + signers[0].satotxPubKey));

    const preIssueTx = new bsv.Transaction(spendByTxHex);
    const issuerLockingScript = preIssueTx.outputs[spendByOutputIndex].script;

    nft.setTxGenesisPart({
      prevTxId: genesisTxId,
      outputIndex: genesisOutputIndex,
    });
    let { tx, tokenid } = await nft.makeTxIssue({
      issuerTxId: spendByTxId,
      issuerOutputIndex: spendByOutputIndex,
      issuerLockingScript,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },

      issuerPrivateKey,
      metaTxId,
      receiverAddress,
      opreturnData,

      signers,
      utxos,
      changeAddress,
      utxoPrivateKeys,
      feeb,
    });

    return { tx, tokenid };
  }

  static async transfer({
    genesisTxId,
    genesisOutputIndex,
    preUtxoTxId,
    preUtxoOutputIndex,
    preUtxoTxHex,
    spendByTxId,
    spendByOutputIndex,
    spendByTxHex,

    senderPrivateKey,
    receiverAddress,
    opreturnData,

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
    receiverAddress = new bsv.Address(receiverAddress, network);

    const nft = new NFT(BigInt("0x" + signers[0].satotxPubKey));

    nft.setTxGenesisPart({
      prevTxId: genesisTxId,
      outputIndex: genesisOutputIndex,
    });

    const spendByTx = new bsv.Transaction(spendByTxHex);
    const transferLockingScript = spendByTx.outputs[spendByOutputIndex].script;

    let tx = await nft.makeTxTransfer({
      transferTxId: spendByTxId,
      transferOutputIndex: spendByOutputIndex,
      transferLockingScript,
      satotxData: {
        index: preUtxoOutputIndex,
        txId: preUtxoTxId,
        txHex: preUtxoTxHex,
        byTxId: spendByTxId,
        byTxHex: spendByTxHex,
      },

      senderPrivateKey,
      receiverAddress,
      opreturnData,

      utxos,
      utxoPrivateKeys,
      changeAddress,
      feeb,
      signers,
    });

    return tx;
  }
}

module.exports = {
  TokenTxHelper,
};
