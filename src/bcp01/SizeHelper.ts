import { bsv } from "scryptlib";
import * as BN from "../bn.js";
import { NonFungibleToken } from "./NonFungibleToken";
import { PayloadNFT } from "./PayloadNFT";
const network = "mainnet";
const dummyPrivateKey = bsv.PrivateKey.fromWIF(
  "L5k7xi4diSR8aWoGKojSNTnc3YMEXEoNpJEaGzqWimdKry6CFrzz"
);
const dummyAddress = dummyPrivateKey.toAddress(network);
const dummyPk = dummyPrivateKey.toPublicKey();
const dummyTxId =
  "c776133a77886693ba2484fe12d6bdfb8f8bcb7a237e4a8a6d0f69c7d1879a08";

let nft = new NonFungibleToken(
  BN.fromString(
    "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
    16
  )
);

//计算token_genesis合约大小
nft.setTxGenesisPart({
  prevTxId: dummyTxId,
  outputIndex: 0,
  issueOutputIndex: 0,
});
let pl = new PayloadNFT();
nft.nftContract.setDataPart(nft.nftGenesisPart + " " + pl.dump());

let size_of_nft = nft.nftContract.lockingScript.toBuffer().length;

export function getSizeOfNft(): number {
  return size_of_nft;
}
