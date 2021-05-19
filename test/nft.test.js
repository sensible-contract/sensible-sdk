const chai = require("chai");
const { expect } = chai;
chai.should();
const { SensibleNFT } = require("../dist/index.js");

const { bsv } = require("scryptlib");

const network = "mainnet";
const feeWif = "L4xJ6bLRZ3QXEXZbSbYqQ3nWrMcNdnMPYykyRKjngvEvE3TzmyVp";
const feeb = 0.5;

const feePrivateKey = new bsv.PrivateKey.fromWIF(feeWif);

const CoffeeShop = {
  wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
  address:
    network == "mainnet"
      ? "1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
      : "mv1vwwHPfR4z9gjkobaDN5HZC6RiGva7QJ",
};

const Alice = {
  wif: "L1trJgTjf8s4gL5yYPWRiwDAXTJMwuC9QMRR98fSH8MF3xrjrQJA",
  address:
    network == "mainnet"
      ? "1KdUnX6RwzoL62iXD5iEs5osQjsGXrm3qf"
      : "mz9S5aBQm2Eas9C8vegch12CGjTySBb9Qh",
};
const Bob = {
  wif: "L1kr4PHhjyDHB3UdG8MBdaxDf4HzmUjygwF8rSTNmZW1q4F8uD3H",
  address:
    network == "mainnet"
      ? "1KmGCZcPBo7A4Q39sBb49X9stkk1gLwKbm"
      : "mzHDVchMzpYQqWWmakZRySNCkkLiZv73zQ",
};
let nft = new SensibleNFT({
  network: network,
  purse: feeWif,
  feeb: feeb,
  mock: true,
});

describe("nft", () => {
  it("genesis", async (done) => {
    try {
      let { txid, genesis, codehash } = await nft.genesis({
        genesisWif: CoffeeShop.wif,
        totalSupply: "3",
      });
      console.log(txid, genesis, codehash);
    } catch (e) {
      console.log(e);
      expect(e == null, e).to.be.true;
    }
    done();
  });

  it("issue", async (done) => {
    const codehash = "9447ed323fee4afa4a7b76865a6b281a5e3c0278";
    const genesis =
      "6f827cfb96cae76a7140ba84129506c0d6ca7859ccae05a915e9e8e0695505d20100000000000000";
    try {
      let { txid, tokenid } = await nft.issue({
        genesis,
        codehash,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        opreturnData: "mint",
        metaTxId:
          "8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea", //dummy
      });
    } catch (e) {
      expect(e == null, e).to.be.true;
    }
    done();
  });

  it("transfer", async (done) => {
    const codehash = "9447ed323fee4afa4a7b76865a6b281a5e3c0278";
    const genesis =
      "dd61f586ac70598e437edb529845429a0696e3ada61b236e5f43cadc163b54400100000000000000";
    try {
      let { txid } = await nft.transfer({
        senderWif: Bob.wif,
        receiverAddress: Bob.address,
        codehash: codehash,
        genesis: genesis,
        tokenid: "1",
        opreturnData: "Transfer from Alice to Bob",
      });
      // console.log(`Alice transfer a coffee card to Bob success: ${txid}`);
    } catch (e) {
      expect(e == null, e).to.be.true;
    }
    done();
  });
});
