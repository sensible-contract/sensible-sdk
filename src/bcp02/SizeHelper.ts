import * as bsv from "../bsv";
import { FungibleToken } from "./FungibleToken";
import * as TokenProto from "./tokenProto";
import BN = require("../bn.js");
const network = "mainnet";
const dummyPrivateKey = bsv.PrivateKey.fromWIF(
  "L5k7xi4diSR8aWoGKojSNTnc3YMEXEoNpJEaGzqWimdKry6CFrzz"
);
const dummyAddress = dummyPrivateKey.toAddress(network);
const dummyPk = dummyPrivateKey.toPublicKey();
const dummyTxId =
  "c776133a77886693ba2484fe12d6bdfb8f8bcb7a237e4a8a6d0f69c7d1879a08";
const dummyPubkey =
  "0x2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455";
let ft = new FungibleToken(
  BN.fromString(dummyPubkey, 16),
  BN.fromString(dummyPubkey, 16),
  BN.fromString(dummyPubkey, 16),
  BN.fromString(dummyPubkey, 16),
  BN.fromString(dummyPubkey, 16)
);

//计算token_genesis合约大小
let genesisContract = ft.createGenesisContract(dummyPk, {
  tokenName: "Bitcoin",
  tokenSymbol: "BSV",
  decimalNum: 3,
});
let size_of_tokenGenesis = genesisContract.lockingScript.toBuffer().length;

//计算token合约大小
let tokenContract = ft.createTokenContract(
  dummyTxId,
  0,
  genesisContract.lockingScript,
  { receiverAddress: dummyAddress, tokenAmount: new BN(10000) }
);
let size_of_token = tokenContract.lockingScript.toBuffer().length;

export function getSizeOfTokenGenesis(): number {
  return size_of_tokenGenesis;
}

export function getSizeOfToken(): number {
  return size_of_token;
}

export function getSizeOfRouteCheck(
  routeCheckType,
  tokenInputArray,
  tokenOutputArray
) {
  let routeCheckContract = ft.createRouteCheckContract(
    routeCheckType,
    tokenInputArray,
    tokenOutputArray,
    TokenProto.newTokenID(dummyTxId, 0),
    Buffer.from("0000000000000000000000000000000000000000", "hex")
  );
  return routeCheckContract.lockingScript.toBuffer().length;
}
