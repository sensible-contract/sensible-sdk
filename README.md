# Sensible-SDK

## Links

- [![npm version](https://img.shields.io/npm/v/sensible-sdk.svg)](https://www.npmjs.com/package/sensible-sdk)
- [![TypeDoc](https://img.shields.io/badge/documentation-TypeDoc-green.svg)](https://sensible-contract.github.io/sensible-sdk/)
- [![Documentation](https://img.shields.io/badge/documentation-sensiblecontract.org-green.svg)](https://sensiblecontract.org/)

## How to install

npm install sensible-sdk --save

## How to use(FT)

### Init

```js
const { SensibleFT } = require("sensible-sdk");

const { signers, signerSelecteds } = await SensibleFT.selectSigners([
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
  {
    satotxApiPrefix: "https://api.satotx.com",
    satotxPubKey:
      "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
  },
]);
const ft = new SensibleFT({
  network: "testnet", //mainnet or testnet
  purse: "", //the wif of a bsv address to offer transaction fees
  feeb: 0.5,
  signers,
  signerSelecteds,
});
```

### Genesis

Define a token with name,symbol,decimal number.
You should save the returned values.(genesis、codehash)

```js
let { txid, genesis, codehash } = await ft.genesis({
  genesisWif: CoffeeShop.wif,
  tokenName: "COFFEE COIN",
  tokenSymbol: "CC",
  decimalNum: 3,
});
```

### Issue

Issue 1000000000000 tokens

```js
let { txid } = await ft.issue({
  genesis: genesis,
  codehash: codehash,
  genesisWif: CoffeeShop.wif,
  receiverAddress: CoffeeShop.address,
  tokenAmount: "1000000000000",
  allowIncreaseIssues: false, //if true then you can issue again
});
```

### Transfer

Transfer from CoffeShop to Alice and Bob

```js
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
});
```

### Query Balance

Query token's balance

```js
let balance = await ft.getBalance({
  codehash,
  genesis,
  address: Alice.address,
});
```

## How to use(NFT)

### Init

```js
const { SensibleNFT } = require("sensible-sdk");
const nft = new SensibleNFT({
  network: "testnet", //mainnet or testnet
  purse: "", //the wif of a bsv address to offer transaction fees
  feeb: 0.5,
  signers: [
    {
      satotxApiPrefix: "https://api.satotx.com",
      satotxPubKey:
        "25108ec89eb96b99314619eb5b124f11f00307a833cda48f5ab1865a04d4cfa567095ea4dd47cdf5c7568cd8efa77805197a67943fe965b0a558216011c374aa06a7527b20b0ce9471e399fa752e8c8b72a12527768a9fc7092f1a7057c1a1514b59df4d154df0d5994ff3b386a04d819474efbd99fb10681db58b1bd857f6d5",
    },
  ],
});
```

### Genesis

Define the NFT with totalSupply
You should save the returned values.(genesis、codehash)

```js
let { txid, genesis, codehash } = await nft.genesis({
  genesisWif: CoffeeShop.wif,
  totalSupply: "3",
});
```

### Issue

Mint a NFT to CoffeeShop's address
metaTxId is created by metaid which stands for NFT State

```js
let { txid, tokenid } = await nft.issue({
  genesis,
  codehash,
  genesisWif: CoffeeShop.wif,
  receiverAddress: CoffeeShop.address,
  metaTxId: "8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea",
});
```

### Transfer

Transfer #1 NFT from CoffeShop to Alice

```js
let { txid } = await nft.transfer({
  senderWif: CoffeeShop.wif,
  receiverAddress: Alice.address,
  codehash: codehash,
  genesis: genesis,
  tokenid: "1",
});
```

## Example

<a href="https://github.com/sensible-contract/sensible-sdk/tree/master/examples">Go to examples</a>
