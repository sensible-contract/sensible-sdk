import { SIGNER_NUM } from "../../src/bcp01/contract-proto/nft.proto";
import * as bsv from "../../src/bsv";
import * as Utils from "../../src/common/utils";
import { API_NET, API_TARGET, Wallet } from "../../src/index";
import { MockSensibleApi } from "../MockSensibleApi";
Utils.isNull(SIGNER_NUM);

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

describe("Wallet Test", () => {
  let wallet: Wallet;
  describe("basic test ", () => {
    before(async () => {
      wallet = new Wallet(
        FeePayer.privateKey.toWIF(),
        API_NET.MAIN,
        0.5,
        API_TARGET.SENSIBLE
      );
      wallet.blockChainApi = sensibleApi;
      await genDummyFeeUtxos(100000001);
    });
    it("send Alice 1000 Sat. should be ok", async () => {
      let txComposer = await wallet.send(Alice.address.toString(), 1000, {
        noBroadcast: false,
        dump: true,
      });
    });

    it("split 3000 Sat. should be ok", async () => {
      wallet = new Wallet(
        Alice.privateKey.toWIF(),
        API_NET.MAIN,
        0.5,
        API_TARGET.SENSIBLE
      );
      wallet.blockChainApi = sensibleApi;
      let txComposer = await wallet.sendArray(
        [
          {
            address: Alice.address.toString(),
            amount: 1000,
          },
          {
            address: Alice.address.toString(),
            amount: 1000,
          },
          {
            address: Alice.address.toString(),
            amount: 1000,
          },
        ],
        {
          noBroadcast: false,
          dump: true,
        }
      );
    });

    it("merge Alice satoshis should be ok", async () => {
      wallet = new Wallet(
        Alice.privateKey.toWIF(),
        API_NET.MAIN,
        0.5,
        API_TARGET.SENSIBLE
      );
      wallet.blockChainApi = sensibleApi;
      let txComposer = await wallet.merge({
        noBroadcast: false,
        dump: true,
      });
    });

    it("send opreturnData should be ok", async () => {
      wallet = new Wallet(
        Alice.privateKey.toWIF(),
        API_NET.MAIN,
        0.5,
        API_TARGET.SENSIBLE
      );
      wallet.blockChainApi = sensibleApi;
      let txComposer = await wallet.sendOpReturn("Alice and Bob are friends", {
        noBroadcast: false,
        dump: true,
      });
    });
  });
});
