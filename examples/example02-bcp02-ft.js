const { SensibleFT } = require("../dist/index");
async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time * 1000);
  });
}
async function main() {
  const network = "mainnet";
  const feeWif = "L4xJ6bLRZ3QXEXZbSbYqQ3nWrMcNdnMPYykyRKjngvEvE3TzmyVp";
  const feeb = 0.5;
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

  const ft = new SensibleFT({
    network: network,
    purse: feeWif,
    feeb: feeb,
  });

  let { txid, genesis, codehash, sensibleId } = await ft.genesis({
    genesisWif: CoffeeShop.wif,
    tokenName: "COFFEE COIN",
    tokenSymbol: "CC",
    decimalNum: 3,
  });
  console.log(`genesis success!
txid: ${txid}
genesis: ${genesis}
codehash: ${codehash}
sensibleId: ${sensibleId}`);
  //wait for a moment
  await sleep(3);
  {
    let { txid } = await ft.issue({
      genesis: genesis,
      codehash: codehash,
      sensibleId: sensibleId,
      genesisWif: CoffeeShop.wif,
      receiverAddress: CoffeeShop.address,
      tokenAmount: "100000000000000000",
      allowIncreaseIssues: false,
    });

    console.log(`issue success: ${txid}`);
  }

  await sleep(3);
  {
    let balance = await ft.getBalance({
      codehash,
      genesis,
      address: CoffeeShop.address,
    });
    console.log(`CoffeeShop's Coffee Coin:${balance}`);
  }
  await sleep(3);
  {
    let { txid } = await ft.transfer({
      senderWif: CoffeeShop.wif,
      receivers: [
        {
          address: Alice.address,
          amount: "5000000",
        },
        {
          address: Bob.address,
          amount: "5000000",
        },
      ],
      codehash: codehash,
      genesis: genesis,
      opreturnData: "Transfer From CoffeeShop to Alice and Bob",
    });
    console.log(`transfer success: ${txid}`);
  }

  await sleep(3);
  {
    let { txid } = await ft.transfer({
      senderWif: Alice.wif,
      receivers: [
        {
          address: Bob.address,
          amount: "1000",
        },
      ],
      codehash: codehash,
      genesis: genesis,
      opreturnData: "Transfer From Alice To Bob",
    });
    console.log(`transfer success: ${txid}`);
  }
  await sleep(3);
  {
    let balance = await ft.getBalance({
      codehash,
      genesis,
      address: Alice.address,
    });
    console.log(`Alice's Coffee Coin:${balance} should be 4999000`);
  }

  await sleep(3);
  {
    let _res = await ft.getSummary(Alice.address);
    console.log(_res);
  }
}
main().catch((e) => console.error("error:", e));
