import { expect } from "chai";
import { SIGNER_NUM, SIGNER_VERIFY_NUM } from "../../src/bcp02/tokenProto";
import * as BN from "../../src/bn.js";
import * as bsv from "../../src/bsv";
import * as Utils from "../../src/common/utils";
import { API_NET, SensibleFT } from "../../src/index";
import { dummyRabinKeypairs } from "../dummyRabin";
import { MockSatotxSigner } from "../MockSatotxSigner";
import { MockSensibleApi } from "../MockSensibleApi";
const signerNum = SIGNER_NUM;
const signerVerifyNum = SIGNER_VERIFY_NUM;
Utils.isNull(SIGNER_NUM);
const satotxSigners: MockSatotxSigner[] = [];
for (let i = 0; i < signerNum; i++) {
  let { p, q } = dummyRabinKeypairs[i];
  satotxSigners.push(
    new MockSatotxSigner(BN.fromString(p, 10), BN.fromString(q, 10))
  );
}
const signerSelecteds = new Array(signerNum)
  .fill(0)
  .map((v, idx) => idx)
  .sort((a, b) => Math.random() - 0.5)
  .slice(0, signerVerifyNum);
let wallets: {
  privateKey: bsv.PrivateKey;
  publicKey: bsv.PublicKey;
  address: bsv.Address;
}[] = [];
for (let i = 0; i < 4; i++) {
  let privateKey = new bsv.PrivateKey();
  wallets.push({
    privateKey,
    publicKey: privateKey.publicKey,
    address: privateKey.toAddress("mainnet"),
  });
}

let [FeePayer, CoffeeShop, Alice, Bob] = wallets;
// console.log(`
// FeePayer:   ${FeePayer.address.toString()}
// CoffeeShop: ${CoffeeShop.address.toString()}
// Alice:      ${Alice.address.toString()}
// Bob:        ${Bob.address.toString()}
// `);

function signSigHashList(sigHashList: Utils.SigHashInfo[]) {
  let sigList = sigHashList.map(
    ({ sighash, sighashType, address, inputIndex, isP2PKH }) => {
      let privateKey = wallets.find((v) => v.address.toString() == address)
        .privateKey;
      var sig = bsv.crypto.ECDSA.sign(
        Buffer.from(sighash, "hex"),
        privateKey,
        "little"
      )
        .set({
          nhashtype: sighashType,
        })
        .toString();
      return {
        sig,
        publicKey: privateKey.toPublicKey(),
      };
    }
  );
  return sigList;
}

let sensibleApi = new MockSensibleApi();
async function genDummyFeeUtxos(satoshis: number, count: number = 1) {
  let feeTx = new bsv.Transaction();
  let unitSatoshis = Math.ceil(satoshis / count);
  let satoshisArray = [];

  for (let i = 0; i < count; i++) {
    if (satoshis < unitSatoshis) {
      satoshisArray.push(satoshis);
    } else {
      satoshisArray.push(unitSatoshis);
    }
    satoshis -= unitSatoshis;
  }
  for (let i = 0; i < count; i++) {
    feeTx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(FeePayer.address),
        satoshis: satoshisArray[i],
      })
    );
  }
  let utxos = [];
  for (let i = 0; i < count; i++) {
    utxos.push({
      txId: feeTx.id,
      outputIndex: i,
      satoshis: satoshisArray[i],
      address: FeePayer.address.toString(),
      wif: FeePayer.privateKey.toWIF(),
    });
  }
  await sensibleApi.broadcast(feeTx.serialize(true));
  return utxos;
}
function cleanBsvUtxos() {
  sensibleApi.cleanBsvUtxos();
}
async function expectTokenBalance(
  ft: SensibleFT,
  codehash: string,
  genesis: string,
  address: bsv.Address,
  balance: string
) {
  let _balance = await ft.getBalance({
    codehash,
    genesis,
    address: address.toString(),
  });
  expect(
    balance == _balance,
    `balance should be ${balance} but actually is ${_balance}`
  ).to.be.true;
}

describe("BCP02-FungibleToken Test", () => {
  describe.only("basic test ", () => {
    let ft: SensibleFT;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    before(async () => {
      const feeb = 0.5;
      const network = API_NET.MAIN;
      ft = new SensibleFT({
        signerSelecteds,
        feeb,
        network,
        purse: FeePayer.privateKey.toWIF(),
        debug: false,
        mockData: {
          satotxSigners,
          sensibleApi,
        },
      });
      sensibleApi.cleanCacheds();
    });

    it("genesis should be ok", async () => {
      await genDummyFeeUtxos(100000001);
      let _res = await ft.genesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisWif: CoffeeShop.privateKey,
      });
      // Utils.dumpTx(_res.tx);
      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;
    });
    it("issue should be ok", async () => {
      await ft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.privateKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "1000",
        allowIncreaseIssues: true,
      });

      await ft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.privateKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "1000",
        allowIncreaseIssues: true,
      });
    });
    it("transfer should be ok", async () => {
      await ft.transfer({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        receivers: [{ address: Alice.address.toString(), amount: "400" }],
      });

      expectTokenBalance(ft, codehash, genesis, Alice.address, "400");
      expectTokenBalance(ft, codehash, genesis, CoffeeShop.address, "1600");
    });
  });

  describe("unsign test ", () => {
    let ft: SensibleFT;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    before(async () => {
      const feeb = 0.5;
      const network = API_NET.MAIN;
      ft = new SensibleFT({
        signerSelecteds,
        feeb,
        network,
        purse: FeePayer.privateKey.toWIF(),
        debug: false,
        mockData: {
          satotxSigners,
          sensibleApi,
        },
      });
      sensibleApi.cleanCacheds();
    });

    it("unsgin genesis should be ok", async () => {
      await genDummyFeeUtxos(100000001);
      let { tx, sigHashList } = await ft.unsignGenesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisPublicKey: CoffeeShop.publicKey,
      });

      let sigList = signSigHashList(sigHashList);
      ft.sign(tx, sigHashList, sigList);
      let _res = ft.getCodehashAndGensisByTx(tx);
      await sensibleApi.broadcast(tx.serialize(true));
      // Utils.dumpTx(_res.tx);
      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;
    });
    it("unsgin issue should be ok", async () => {
      let { tx, sigHashList } = await ft.unsignIssue({
        codehash,
        genesis,
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "1000",
        allowIncreaseIssues: false,
      });
      let sigList = signSigHashList(sigHashList);
      ft.sign(tx, sigHashList, sigList);
      await sensibleApi.broadcast(tx.serialize(true));
    });
    it("unsgin transfer should be ok", async () => {
      let { routeCheckTx, routeCheckSigHashList } = await ft.unsignPreTransfer({
        codehash,
        genesis,
        senderPublicKey: CoffeeShop.publicKey,
        receivers: [{ address: Alice.address.toString(), amount: "400" }],
      });

      let sigList = signSigHashList(routeCheckSigHashList);
      ft.sign(routeCheckTx, routeCheckSigHashList, sigList);
      await sensibleApi.broadcast(routeCheckTx.serialize(true));
      let { tx, sigHashList } = await ft.unsignTransfer(routeCheckTx);
      ft.sign(tx, sigHashList, signSigHashList(sigHashList));
      await sensibleApi.broadcast(tx.serialize(true));

      expectTokenBalance(ft, codehash, genesis, Alice.address, "400");
      expectTokenBalance(ft, codehash, genesis, CoffeeShop.address, "600");
    });

    it("unsgin merge should be ok", async () => {
      let { routeCheckTx, routeCheckSigHashList } = await ft.unsignPreMerge({
        codehash,
        genesis,
        ownerPublicKey: CoffeeShop.publicKey,
      });

      let sigList = signSigHashList(routeCheckSigHashList);
      ft.sign(routeCheckTx, routeCheckSigHashList, sigList);
      await sensibleApi.broadcast(routeCheckTx.serialize(true));
      let { tx, sigHashList } = await ft.unsignMerge(routeCheckTx);
      ft.sign(tx, sigHashList, signSigHashList(sigHashList));
      await sensibleApi.broadcast(tx.serialize(true));

      expectTokenBalance(ft, codehash, genesis, CoffeeShop.address, "600");
    });
  });
  describe("estimate fee test ", () => {
    let ft: SensibleFT;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    const opreturnData = Buffer.alloc(5000, "CoffeeCoin").toString();
    before(async () => {
      const feeb = 0.5;
      const network = API_NET.MAIN;
      ft = new SensibleFT({
        signerSelecteds,
        feeb,
        network,
        purse: FeePayer.privateKey.toWIF(),
        debug: false,
        mockData: {
          satotxSigners,
          sensibleApi,
        },
      });
      sensibleApi.cleanCacheds();
    });

    it("genesis estimate fee should be ok", async () => {
      let estimateFee = await ft.getGenesisEstimateFee({
        opreturnData,
        utxoMaxCount: 1,
      });

      let utxos = await genDummyFeeUtxos(estimateFee, 1);
      let _res = await ft.genesis({
        tokenName: "test-metacoin 5",
        tokenSymbol: "tmc5",
        decimalNum: 8,
        genesisWif: CoffeeShop.privateKey,
        opreturnData,
        utxos,
      });
      // Utils.dumpTx(_res.tx);
      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;
    });
    it("issue estimate fee should be ok", async () => {
      ft.setDustThreshold({ dustAmount: 1 });
      cleanBsvUtxos();
      let estimateFee = await ft.getIssueEstimateFee({
        allowIncreaseIssues: true,
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey,
        opreturnData,
      });
      let utxos = await genDummyFeeUtxos(estimateFee, 10);
      let _res2 = await ft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.privateKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "1000",
        allowIncreaseIssues: true,
        utxos,
        opreturnData,
      });
      // Utils.dumpTx(_res2.tx);

      cleanBsvUtxos();
      estimateFee = await ft.getIssueEstimateFee({
        allowIncreaseIssues: true,
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey,
        opreturnData,
      });
      utxos = await genDummyFeeUtxos(estimateFee, 10);
      let _res3 = await ft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.privateKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "1000",
        allowIncreaseIssues: true,
        opreturnData,
      });
      // Utils.dumpTx(_res3.tx);
    });
    it("transfer estimate fee should be ok", async () => {
      cleanBsvUtxos();
      let estimateFee = await ft.getTransferEstimateFee({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        receivers: [{ address: Alice.address.toString(), amount: "400" }],
        utxoMaxCount: 3,
      });

      let utxos = await genDummyFeeUtxos(estimateFee, 3);
      let _res4 = await ft.transfer({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        receivers: [{ address: Alice.address.toString(), amount: "400" }],
      });
      // Utils.dumpTx(_res4.routeCheckTx);
      // Utils.dumpTx(_res4.tx);
    });
    it("merge estimate fee should be ok", async () => {
      ft.setDustThreshold({ dustLimitFactor: 0.75 });
      cleanBsvUtxos();
      let estimateFee = await ft.getMergeEstimateFee({
        codehash,
        genesis,
        ownerWif: CoffeeShop.privateKey.toWIF(),
        opreturnData,
      });

      let utxos = await genDummyFeeUtxos(estimateFee, 3);
      let _res5 = await ft.merge({
        codehash,
        genesis,
        ownerWif: CoffeeShop.privateKey.toWIF(),
        opreturnData,
      });
      // Utils.dumpTx(_res5.routeCheckTx);
      // Utils.dumpTx(_res5.tx);
    });
  });

  describe("transfer type test ", () => {
    let ft: SensibleFT;
    let codehash: string;
    let genesis: string;
    let sensibleId: string;
    before(async () => {
      const feeb = 0.5;
      const network = API_NET.MAIN;
      ft = new SensibleFT({
        signerSelecteds,
        feeb,
        network,
        purse: FeePayer.privateKey.toWIF(),
        debug: false,
        mockData: {
          satotxSigners,
          sensibleApi,
        },
      });
      sensibleApi.cleanCacheds();
    });

    it("3_to_100", async () => {
      let _res = await ft.genesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisWif: CoffeeShop.privateKey,
      });

      genesis = _res.genesis;
      codehash = _res.codehash;
      sensibleId = _res.sensibleId;

      await ft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.privateKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
        tokenAmount: "10000",
        allowIncreaseIssues: true,
      });
      let receivers = [];
      for (let i = 0; i < 99; i++) {
        receivers.push({ address: Alice.address.toString(), amount: "100" });
      }
      await ft.transfer({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        receivers,
      });
    });

    it("10_to_10", async () => {
      let receivers = [];
      for (let i = 0; i < 10; i++) {
        receivers.push({ address: Bob.address.toString(), amount: "100" });
      }
      let _res2 = await ft.transfer({
        codehash,
        genesis,
        senderWif: Alice.privateKey.toWIF(),
        receivers,
      });
      // Utils.dumpTx(_res2.tx);
    });

    it("6_to_6", async () => {
      let receivers = [];
      for (let i = 0; i < 6; i++) {
        receivers.push({ address: Bob.address.toString(), amount: "100" });
      }
      let _res3 = await ft.transfer({
        codehash,
        genesis,
        senderWif: Alice.privateKey.toWIF(),
        receivers,
      });
      Utils.dumpTx(_res3.tx);
    });

    it("3_to_3", async () => {
      let receivers = [];
      for (let i = 0; i < 3; i++) {
        receivers.push({ address: Bob.address.toString(), amount: "100" });
      }
      let _res4 = await ft.transfer({
        codehash,
        genesis,
        senderWif: Alice.privateKey.toWIF(),
        receivers,
      });
      Utils.dumpTx(_res4.tx);

      expectTokenBalance(ft, codehash, genesis, CoffeeShop.address, "0");
      expectTokenBalance(ft, codehash, genesis, Alice.address, "8100");
      expectTokenBalance(ft, codehash, genesis, Bob.address, "1900");
    });
  });
});
