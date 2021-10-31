# Sensible-SDK

[![npm version](https://img.shields.io/npm/v/sensible-sdk.svg)](https://www.npmjs.com/package/sensible-sdk)

This sdk helps you to interact with [sensible contracts][sensible]

Please read the [documentation][docs] for more.

## How to install

npm install sensible-sdk --save

## How to use(FT)

### Init

```js
const { SensibleFT } = require("sensible-sdk");

const { signers, signerSelecteds } = await SensibleFT.selectSigners();
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
You should save the returned values.(genesis、codehash、sensibleId)

```js
let { txid, genesis, codehash, sensibleId } = await ft.genesis({
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
  sensibleId: sensibleId,
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
let { balance, pendingBalance, utxoCount, decimal } = await ft.getBalanceDetail(
  {
    codehash,
    genesis,
    address: Alice.address,
  }
);
```

## How to use(NFT)

### Init

```js
const { SensibleNFT } = require("sensible-sdk");
const { signers, signerSelecteds } = await SensibleNFT.selectSigners();
const nft = new SensibleNFT({
  network: "testnet", //mainnet or testnet
  purse: "", //the wif of a bsv address to offer transaction fees
  feeb: 0.5,
  signers,
  signerSelecteds,
});
```

### Genesis

Define the NFT with totalSupply
You should save the returned values.(genesis、codehash、sensibleId)

```js
let { txid, genesis, codehash, sensibleId } = await nft.genesis({
  genesisWif: CoffeeShop.wif,
  totalSupply: "3",
});
```

### Issue

Mint a NFT to CoffeeShop's address
metaTxId is created by metaid which stands for NFT State

```js
let { txid, tokenIndex } = await nft.issue({
  genesis,
  codehash,
  sensibleId,
  genesisWif: CoffeeShop.wif,
  receiverAddress: CoffeeShop.address,
  metaTxId: "8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea",
  metaOutputIndex: 0,
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
  tokenIndex: "1",
});
```

### Sell

Sell #1 NFT

```js
let { sellTx, tx } = await nft.sell({
  codehash,
  genesis,
  sellerWif: Alice.wif,
  tokenIndex: "1",
  satoshisPrice: 2000,
});
```

### Cancel Sell

Cancel Sell #1 NFT

```js
let { unlockCheckTx, tx } = await nft.cancelSell({
  codehash,
  genesis,
  tokenIndex: "1",
  sellerWif: Alice.wif,
});
```

### Buy

Buy #1 NFT

```js
let { unlockCheckTx, tx } = await nft.buy({
  codehash,
  genesis,
  tokenIndex: "1",
  buyerWif: Bob.wif,
});
```

## Example

<a href="https://github.com/sensible-contract/sensible-sdk/tree/master/examples">Go to examples</a>

[docs]: http://sensible-sdk.readthedocs.io/
[sensible]: https://sensiblecontract.org/
