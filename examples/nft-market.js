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

  const nft = new SensibleNFT({
    network: network, //or testnet
    purse: feeWif,
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
      console.log(`mint coffee card success: ${txid} ${tokenIndex}`);
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
    let { unlockCheckTx, tx } = await nft.cancelSell({
      codehash,
      genesis,
      tokenIndex: "0",
      sellerWif: CoffeeShop.wif,
      sellUtxo: { txId: g_sellTx.id, outputIndex: 0 },
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
      sellUtxo: { txId: g_sellTx.id, outputIndex: 0 },
      opreturnData: "Alice buy nft #1",
    });
    console.log(`Alice buy nft #1 ${tx.id}`);
  }
}
main().catch((e) => console.error(e));
