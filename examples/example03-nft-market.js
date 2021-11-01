const { SensibleNFT } = require("../dist/index");
async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time * 1000);
  });
}
async function main() {
  const network = "mainnet";
  const feeWif = "L1LPEADb7Jw3gKWcJUouqgJFUwGHpZoy4iy9SzAvwxuUxpyyyvW8";

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

  let signers2 = new Array(5).fill({
    satotxApiPrefix: "https://s1.satoplay.cn",
    satotxPubKey:
      "2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455",
  });
  let ret = await SensibleNFT.selectSigners(signers2);

  const nft = new SensibleNFT({
    network: network, //or testnet
    purse: feeWif,
    signers: ret.signers,
    signerSelecteds: ret.signerSelecteds,
  });

  let { txid, genesis, codehash, sensibleId } = await nft.genesis({
    genesisWif: CoffeeShop.wif,
    totalSupply: "3",
  });
  console.log(`genesis success: ${txid}
genesis: ${genesis}
codehash: ${codehash}
sensibleId: ${sensibleId}`);

  for (let i = 0; i < 2; i++) {
    await sleep(3);
    {
      let { txid, tokenIndex } = await nft.issue({
        genesis,
        codehash,
        sensibleId,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        opreturnData: "mint",
        metaTxId:
          "8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea", //dummy
        metaOutputIndex: 1,
      });
      console.log(`mint coffee card #${tokenIndex}: ${txid} `);
    }
  }

  let g_sellTx;
  await sleep(3);
  {
    let { sellTx, tx } = await nft.sell({
      codehash,
      genesis,
      sellerWif: CoffeeShop.wif,
      tokenIndex: "0",
      satoshisPrice: 2000,
      opreturnData: "CoffeeShop sell nft #0",
    });
    g_sellTx = sellTx;
    console.log(`CoffeeShop sell nft #0 ${tx.id}`);
  }

  await sleep(3);
  {
    let sellList1 = await nft.getSellList(codehash, genesis);
    let sellList2 = await nft.getSellListByAddress(CoffeeShop.address);
    console.log("query sell list:", sellList1.length, sellList2.length);
  }

  await sleep(3);
  {
    let { unlockCheckTx, tx } = await nft.cancelSell({
      codehash,
      genesis,
      tokenIndex: "0",
      sellerWif: CoffeeShop.wif,
      opreturnData: "CoffeeShop cancel sell nft #0",
    });
    console.log(`CoffeeShop cancel sell nft #0 ${tx.id}`);
  }

  await sleep(3);
  {
    let { sellTx, tx } = await nft.sell({
      codehash,
      genesis,
      sellerWif: CoffeeShop.wif,
      tokenIndex: "1",
      satoshisPrice: 2100,
      opreturnData: "CoffeeShop sell nft #1",
    });
    g_sellTx = sellTx;
    console.log(`CoffeeShop sell nft #1 ${tx.id}`);
  }

  await sleep(3);
  {
    let { unlockCheckTx, tx } = await nft.buy({
      codehash,
      genesis,
      tokenIndex: "1",
      buyerWif: Alice.wif,
      opreturnData: "Alice buy nft #1",
    });
    console.log(`Alice buy nft #1 ${tx.id}`);
  }
}
main().catch((e) => console.error(e));
