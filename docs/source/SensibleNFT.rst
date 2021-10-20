.. _SensibleNFT:

===========
SensibleNFT
===========

The ``SensibleNFT`` object makes it easy to interact with Sensible NonFungible Token contracts on the BitcoinSV blockchain.


------------------------------------------------------------------------------

new
=====================

.. code-block:: javascript

    new SensibleNFT(options)


----------
Parameters
----------

* ``options`` - ``Object``:
    * ``signers`` - ``string``: signers
    * ``signerSelecteds`` - ``number[]``:  (Optional) the indexs of the signers which is decided to verify
    * ``feeb`` - ``number``: (Optional) the fee rate. default is 0.5
    * ``network`` - :ref:`API_NET<API_NET>`: (Optional) mainnet/testnet default is mainnet
    * ``purse`` - ``string``: (Optional) the private key to offer transacions fee. If not provided, bsv utoxs must be provided in genesis/issue/transfer.
    * ``apiTarget`` - :ref:`API_TARGET<API_TARGET>`: (Optional) SENSIBLE/METASV, default is SENSIBLE.
    * ``dustLimitFactor`` - ``number``: (Optional)  specify the output dust rate, default is 0.25 .If the value is equal to 0, the final dust will be at least 1.
    * ``dustAmount`` - ``number``: (Optional) specify the output dust.


-------
Returns
-------

``Object``: The SensibleNFT object


-------
Example
-------

.. code-block:: javascript
    
    const SensibleNFT = sensible.SensibleNFT;
    const { signers, signerSelecteds } = await SensibleNFT.selectSigners();
    const nft = new SensibleNFT({
        network: "mainnet", //mainnet or testnet
        purse: "", //the wif of a bsv address to offer transaction fees
        feeb: 0.5,
        signers,
        signerSelecteds,
    })

------------------------------------------------------------------------------



= Properties =
=========

------------------------------------------------------------------------------


sensibleApi
=====================

For ``sensibleApi`` see the :ref:`SensibleApi reference documentation <SensibleApi>`.




------------------------------------------------------------------------------

= Methods =
============


------------------------------------------------------------------------------


genesis
=====================

.. code-block:: javascript

    nft.genesis(options)

Creates a NftGenesis-Contract Transaction for new NFT.


----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesisWif`` - ``string|bsv.PrivateKey``: the private key of the token genesiser 
    * ``totalSupply`` - ``number``: total supply, 8 bytes unsign int
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false


-------
Returns
-------

``Promise`` returns ``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.(With input data)
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``genesis`` - ``string``: genesis of the new token.
- ``codehash`` - ``string``: codehash of the new token. 
- ``sensibleId`` - ``string``: sensibleId of the new token. 

You should save the returned values.(genesis、codehash、sensibleId)
Minting NFT need those values.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleNFT(options);
    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { txid, genesis, codehash, sensibleId } = await nft.genesis({
        genesisWif: CoffeeShop.wif,
        totalSupply: "3",
      });


    // or specify bsv utxos (wif must be provided)
    let bsvUtxos = nft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })
    let { txid, genesis, codehash, sensibleId } = await nft.genesis({
        genesisWif: CoffeeShop.wif,
        totalSupply: "3",
        utxos:bsvUtxos
    });


------------------------------------------------------------------------------

issue
=====================

.. code-block:: javascript

    nft.issue(options)

Mint NFT.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``sensibleId`` - ``string``: the sensibleId of NFT.
    * ``genesisWif`` - ``string``: the private key of the NFT genesiser
    * ``receiverAddress`` - ``string``: the NFT receiver address
    * ``metaTxId`` - ``string``: (Optional) the txid of meta info outpoint.To describe NFT status, metaId is recommended
    * ``metaOutputIndex`` - ``number``: (Optional) the index of meta info outpoint.
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false


-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.(With input data)
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``tokenIndex`` - ``string``: the index of NFT.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)
    const {genesis,codehash,sensibleId} = nft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { txid,tokenIndex } = await nft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        opreturnData:"mint the first nft",
    });


    // or specify bsv utxos (wif must be provided)
    let bsvUtxos = nft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })
    let { txid, tokenIndex } = await nft.issue({
        codehash,
        genesis,
        sensibleId,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        opreturnData:"mint the first nft",
        utxos:bsvUtxos
    });


------------------------------------------------------------------------------


transfer
=====================

.. code-block:: javascript

    nft.transfer(options)

Transfer NFT.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``receiverAddress`` - ``string``: the NFT receiver address
    * ``senderPrivateKey(senderWif)`` - ``string|bsv.PrivateKey``: the private key of the NFT sender
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT.
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos which should be no more than 3 
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)
    const {genesis,codehash,sensibleId} = nft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { txid } = await nft.transfer({
        codehash,
        genesis,
        senderPrivateKey: CoffeeShop.wif,
        receiverAddress: Alice.address,
        tokenIndex: "0",
      });


    // or specify nft utxos and bsv utxos (wif must be provided)
    let bsvUtxos = nft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })

    let { txid } = await nft.transfer({
        codehash,
        genesis,
        senderPrivateKey: CoffeeShop.wif,
        receiverAddress: Alice.address,
        tokenIndex: "0",
        utxos: bsvUtxos
      });
      

------------------------------------------------------------------------------


sell
=====================

.. code-block:: javascript

    nft.sell(options)

| Sell NFT.
| This operation is composed of two transaction.
| 1. Create the sale-contract transaction.
| 2. Transfer the NFT to the sale-contract

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT. 
    * ``sellerPrivateKey`` - ``string``: the private key of the NFT seller
    * ``satoshisPrice`` - ``number``: the satoshis price to sell.
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>` : (Optional)  specify bsv utxos which should be no more than 3 
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false
    * ``middleChangeAddress`` - ``string|bsv.Address``: (Optional) the middle bsv changeAddress
    * ``middlePrivateKey`` - ``string|bsv.PrivateKey``: (Optional) the private key of the middle changeAddress


The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``sellTx`` - ``bsv.Transaction``: the sell transaction object.
- ``sellTxHex`` - ``string``: raw hex of the sell transaction.
- ``sellTxId`` - ``string``: id of the sell transaction.
- 
-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)

     let { sellTx, tx } = await nft.sell({
        codehash,
        genesis,
        sellerWif: CoffeeShop.privateKey.toWIF(),
        tokenIndex: "0",
        satoshisPrice: 10000,
      });

------------------------------------------------------------------------------


sell2
=====================

.. code-block:: javascript

    nft.sell2(options)

| *Not recommended. Generally, use sell.*
| Create the sale-contract transaction.
| After this operation is completed, you have to transfer the NFT to sellAddress 

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT. 
    * ``sellerPrivateKey`` - ``string``: the private key of the NFT seller
    * ``satoshisPrice`` - ``number``: the satoshis price to sell.
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos which should be no more than 3 
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the sell transaction object.
- ``txHex`` - ``string``: raw hex of the sell transaction.
- ``txid`` - ``string``: id of the sell transaction.
- ``sellAddress`` - ``string``: the sell address.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)

    let { tx, sellAddress } = await nft.sell2({
        codehash,
        genesis,
        sellerWif: CoffeeShop.privateKey.toWIF(),
        tokenIndex: "0",
        satoshisPrice: 10000,
    });

------------------------------------------------------------------------------

cancelSell
=====================

.. code-block:: javascript

    nft.cancelSell(options)

| Cancel the sale of NFT.
| This operation is composed of two transaction.
| 1. Create the UnlockCheck-contract transaction.
| 2. Unlock the NFT-contract to transfer NFT back to it's owner.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT. 
    * ``sellerPrivateKey`` - ``string``: the private key of the NFT seller
    * ``satoshisPrice`` - ``number``: the satoshis price to sell.
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos which should be no more than 3 
    * ``sellUtxo`` - :ref:`SellUtxo<SellUtxo>`: (Optional)  specify the sell utxo
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false
    * ``middleChangeAddress`` - ``string|bsv.Address``: (Optional) the middle bsv changeAddress
    * ``middlePrivateKey`` - ``string|bsv.PrivateKey``: (Optional) the private key of the middle changeAddress


The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``unlockCheckTx`` - ``bsv.Transaction``: the unlockCheck contract transaction object.
- ``unlockCheckTxHex`` - ``string``: raw hex of the unlockCheck contract transaction.
- ``unlockCheckTxId`` - ``string``: id of the unlockCheck contract transaction.
- 
-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)

    let { unlockCheckTx, tx } = await nft.cancelSell({
        codehash,
        genesis,
        tokenIndex: "1",
        sellerWif: CoffeeShop.privateKey.toWIF(),
    });
------------------------------------------------------------------------------


buy
=====================

.. code-block:: javascript

    nft.buy(options)

| Buy a NFT
| This operation is composed of two transaction.
| 1. Create the UnlockCheck-contract transaction.
| 2. Unlock the NFT-contract to transfer NFT to buyer.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of NFT.
    * ``codehash`` - ``string``: the codehash of NFT.
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT. 
    * ``buyerPrivateKey(buyerWif)`` - ``string|bsv.PrivateKey``: the private key of the NFT seller
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos which should be no more than 3 
    * ``sellUtxo`` - :ref:`SellUtxo<SellUtxo>`: (Optional)  specify the sellUtxo
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false
    * ``middleChangeAddress`` - ``string|bsv.Address``: (Optional) the middle bsv changeAddress
    * ``middlePrivateKey`` - ``string|bsv.PrivateKey``: (Optional) the private key of the middle changeAddress


The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``unlockCheckTx`` - ``bsv.Transaction``: the unlockCheck contract transaction object.
- ``unlockCheckTxHex`` - ``string``: raw hex of the unlockCheck contract transaction.
- ``unlockCheckTxId`` - ``string``: id of the unlockCheck contract transaction.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)

    let { unlockCheckTx, tx } = await nft.buy({
        codehash,
        genesis,
        tokenIndex: "0",
        buyerWif: Alice.privateKey.toWIF(),
    });

------------------------------------------------------------------------------


unsignGenesis
=====================

.. code-block:: javascript

    nft.unsignGenesis(options)

Create an unsigned transaction for genesis

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``totalSupply`` - ``string``: total supply, 8 bytes unsign int
    * ``genesisPublicKey`` - ``string|bsv.PublicKey``: the public key of the token genesiser
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    
-------
Returns
-------

``Promise`` returns ``Object``: 

- ``tx`` - ``bsv.Transaction``: unsigned transaction object.
- ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info list

sigHashList contains all the input that needs to be signed.

The signature method can refer to :ref:`signSigHashList<signSigHashList>` 

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)
    const {...,genesis,codehash,sensibleId} = nft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    let { tx, sigHashList } = await nft.unsignGenesis({
        genesisPublicKey: CoffeeShop.publicKey,
        totalSupply: "3",
    });

    nft.sign(tx, sigHashList, signSigHashList(sigHashList));

    await nft.sensibleApi.broadcast(tx.serialize(true));


------------------------------------------------------------------------------



unsignIssue
=====================

.. code-block:: javascript

    nft.unsignIssue(options)

Create an unsigned transaction for issue

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``sensibleId`` - ``string``: the sensibleId of token.
    * ``genesisPublicKey`` - ``string|bsv.PublicKey``: the private key of the token genesiser
    * ``receiverAddress`` - ``string``: the token receiver address
    * ``metaTxId`` - ``string``: (Optional) the txid of meta info outpoint.To describe NFT status, metaId is recommended
    * ``metaOutputIndex`` - ``number``: (Optional) the index of meta info outpoint..
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output


-------
Returns
-------

``Promise`` returns ``Object``: 

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

sigHashList contains all the input that needs to be signed.

The signature method can refer to :ref:`signSigHashList<signSigHashList>` 

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)
    const {...,genesis,codehash,sensibleId} = nft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"",
    };

    let { tx, sigHashList } = await nft.unsignIssue({
        codehash,
        genesis,
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey.toString(),
        receiverAddress: CoffeeShop.address.toString(),
     });

    nft.sign(tx, sigHashList, signSigHashList(sigHashList));

    await sensibleApi.broadcast(tx.serialize(true));

------------------------------------------------------------------------------


unsignTransfer
=====================

.. code-block:: javascript

    nft.unsignTransfer(options)


Create an unsigned transaction for transfer

----------
Parameters
----------

* ``options`` - ``Object``: the options used for deployment.
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``tokenIndex`` - ``string``: the tokenIndex of NFT.
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: the public key of the NFT sender
    * ``receiverAddress`` - ``string|bsv.Address``: the NFT receiver address
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output

-------
Returns
-------

``Promise`` returns ``Object``: 

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

sigHashList contains all the input that needs to be signed.

The signature method can refer to :ref:`signSigHashList<signSigHashList>` 

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...)

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    let { tx, sigHashList } = await nft.unsignTransfer({
        codehash,
        genesis,
        senderPublicKey: CoffeeShop.publicKey,
        receiverAddress: Alice.address.toString(),
        tokenIndex: "0",
    });

    nft.sign(tx, sigHashList, signSigHashList(sigHashList));

    await nft.sensibleApi.broadcast(tx.serialize(true));



------------------------------------------------------------------------------




getGenesisEstimateFee
=====================

.. code-block:: javascript

    nft.getGenesisEstimateFee(options)

Estimate the cost of genesis

The cost mainly depends on the number of bsv utxo inputs.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``opreturnData`` - ``Array``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``Number``: (Optional) Maximum number of BSV UTXOs supported, the default is 10.

-------
Returns
-------
``Promise`` returns ``Number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript
    
    let estimateFee = await nft.getGenesisEstimateFee({
        utxoMaxCount: 1,
    });


------------------------------------------------------------------------------


getIssueEstimateFee
=====================

.. code-block:: javascript

    nft.getIssueEstimateFee(options)

Estimate the cost of issue

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``sensibleId`` - ``string``: the sensibleId of token.
    * ``genesisPublicKey`` - ``string|bsv.PublicKey``: the public key of token genesiser.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 10.


-------
Returns
-------
``Promise`` returns ``Number``: The fee amount estimated.


-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT(...);
    const {...,genesis,codehash,sensibleId} = nft.genesis(options);

    const CoffeeShop = {
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"02fe9584308dcab1c934cd82329d099152115cb9acced8e4413380333bbcb7520d",
    };

    let estimateFee = await nft.getIssueEstimateFee({
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey,
    });



------------------------------------------------------------------------------

getTransferEstimateFee
=====================

.. code-block:: javascript

    nft.getTransferEstimateFee(options)

Estimate the cost of transfer

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``tokenIndex`` - ``string``:  the tokenIndex of NFT.
    * ``senderPrivateKey(senderWif)`` - ``string|bsv.PrivateKey``: (Optional) the private key of the token sender,can be wif or other format
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: (Optional) the public key of the token sender
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 10.

One of senderPrivateKey and senderPublicKey must be provided.

-------
Returns
-------
``Promise`` returns ``Number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript
    
    //get genesis/codehash from genesis.
    const {...,genesis,codehash} = nft.genesis(options);

    const CoffeeShop = {
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"02fe9584308dcab1c934cd82329d099152115cb9acced8e4413380333bbcb7520d",
    };

    let estimateFee = await nft.getTransferEstimateFee({
        genesis,
        codehash,
        tokenIndex: "0",
        senderPublicKey: CoffeeShop.publicKey,
    });

------------------------------------------------------------------------------


getSellEstimateFee
=====================

.. code-block:: javascript

    nft.getSellEstimateFee(options)

Estimate the cost of sell

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``tokenIndex`` - ``string``:  the tokenIndex of NFT.
    * ``senderPrivateKey(senderWif)`` - ``string|bsv.PrivateKey``: (Optional) the private key of the token sender,can be wif or other format
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: (Optional)  the public key of the token sender
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 3.

One of senderPrivateKey and senderPublicKey must be provided.

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({})    

    let estimateFee = await nft.getSellEstimateFee({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        tokenIndex: "0"
    });

------------------------------------------------------------------------------


getSell2EstimateFee
=====================

.. code-block:: javascript

    nft.getSell2EstimateFee(options)

Estimate the cost of sell

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 3.


-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({})    

    let estimateFee = await nft.getSell2EstimateFee({
        codehash,
        genesis,
    });

------------------------------------------------------------------------------


getCancelSellEstimateFee
=====================

.. code-block:: javascript

    nft.getCancelSellEstimateFee(options)

Estimate the cost of sell

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``tokenIndex`` - ``string``:  the tokenIndex of NFT.
    * ``senderPrivateKey(senderWif)`` - ``string|bsv.PrivateKey``: (Optional) the private key of the token sender,can be wif or other format
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: (Optional) the public key of the token sender
    * ``sellUtxo`` - :ref:`SellUtxo<SellUtxo>`: SellUtxo
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 3.

One of senderPrivateKey and senderPublicKey must be provided.

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({})    

    let estimateFee = await nft.getSellEstimateFee({
        codehash,
        genesis,
        senderWif: CoffeeShop.privateKey.toWIF(),
        tokenIndex: "0"
    });

------------------------------------------------------------------------------


setDustThreshold
=====================

.. code-block:: javascript

    nft.setDustThreshold(options)

Set dust. DustAmount has a higher priority than dustLimitFactor.

Notice, too low dust will be rejected by miner.

----------
Parameters
----------

1. ``options`` - ``Object``: The options used for deployment.
    * ``dustLimitFactor`` - ``number``: (optional): specify the output dust rate, default is 0.25 .If the value is equal to 0, the final dust will be at least 1.
    * ``dustAmount`` - ``number`` (optional): specify the output dust

-------
Returns
-------

none

-------
Example
-------

.. code-block:: javascript

    nft.setDustThreshold({
        dustLimitFactor: 0.25
    )

    nft.setDustThreshold({
        dustAmount: 1
    })



------------------------------------------------------------------------------


sign
=====================

.. code-block:: javascript

    nft.sign(options)

 Update the signature of the transaction

----------
Parameters
----------

1. ``options`` - ``Object``:
    * ``tx`` - ``bsv.Transaction``: the genesis of token.
    * ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: the codehash of token.
    * ``sigList`` - :ref:`SigInfo[]<SigInfo>` :  token receivers.[{address:'xxx',amount:'1000'}]


-------
Returns
-------

none

-------
Example
-------

.. code-block:: javascript
    
    const nft = new sensible.SensibleNFT(..);
    let { tx, sigHashList } = await nft.unsignGenesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisPublicKey: CoffeeShop.publicKey,
        utxos,
    });

    let sigList = signSigHashList(sigHashList);

    nft.sign(tx, sigHashList, sigList);

    await sensibleApi.broadcast(tx.serialize(true));

    


------------------------------------------------------------------------------


broadcast
=====================

.. code-block:: javascript

    nft.broadcast(txHex)

Broadcast a transaction

----------
Parameters
----------

* ``txHex`` - ``string``: the raw hex of transaction


-------
Returns
-------

``Promise`` returns ``string``: the txid of transaction

-------
Example
-------

.. code-block:: javascript
    
    const {...,txHex} = nft.genesis({...,noBroadcast:true});

    let txid = await nft.broadcast(txHex);
    console.log(txid);

------------------------------------------------------------------------------



dumpTx
=====================

.. code-block:: javascript

    nft.dumpTx(tx)

Dump transaction.

----------
Parameters
----------

* ``tx`` - ``bsv.Transaction``: the transaction to dump


-------
Returns
-------

none

-------
Example
-------

.. code-block:: javascript
    
    const {...,tx} = nft.genesis(options);

    nft.dumpTx(tx);

    > =============================================================================================
    Summary
    txid:     22ad1c67cb4611eb0cf451861d9c67aae835537468e06abdccac0e71c487019c
    Size:     3758
    Fee Paid: 0.00001893
    Fee Rate: 0.5037 sat/B
    Detail:   1 Inputs, 2 Outputs
    ----------------------------------------------------------------------------------------------

    =>0    1MxFhEQ1fMkqaYJEKqRUGiz76ZjNJJ9ncm    9.13627305 BSV
        lock-size:   25
        unlock-size: 107
        via 3d1ce4a600298cd960f713125d88e4cfefbfa116ac640a184fd1130b044b3fb0 [2]

    Input total: 9.13627305 BSV
    ----------------------------------------------------------------------------------------------

    =>0    nonstandard                           0.00002784 BSV
        size: 3555

    =>1    1MxFhEQ1fMkqaYJEKqRUGiz76ZjNJJ9ncm    9.13622628 BSV
        size: 25

    Output total: 9.13625412 BSV
    =============================================================================================

------------------------------------------------------------------------------


getSummary
=====================

.. code-block:: javascript

    nft.getSummary(address)

Query the nft summary infos of address.


----------
Parameters
----------

* ``address`` - ``string``: token address.

-------
Returns
-------

``Promise`` returns :ref:`NonFungibleTokenSummary[]<NonFungibleTokenSummary>`

-------
Example
-------

.. code-block:: javascript

    const nft = new SensibleNFT({});
    
    let summarys = await nft.getSummary("1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3");
    console.log(summarys)
    > 
    [
       {
            codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
            genesis: 'b7ee2f4e92d4d4e5f1959106bd4d87437b3d8341',
            sensibleId: '03403cc27a7c95e283789e0f147222a1b3611e063620889897fae498c798213400000000',
            count: 3,
            pendingCount: 0,
            metaTxId: '8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea',
            metaOutputIndex: 1,
            supply: 3
        }
    ]

------------------------------------------------------------------------------


getSummaryDetail
=====================

.. code-block:: javascript

    nft.getSummaryDetail(codehash, genesis, address[, cursor][, size])

Query the nft summary infos of address.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of token
* ``genesis`` - ``string``: the genesis of token
* ``address`` - ``string``: the owner address of token
* ``cursor`` - ``number``: (Optional) the cursor of records.
* ``size`` - ``number``: (Optional) the number of records.


-------
Returns
-------

``Promise`` returns :ref:`NonFungibleTokenUnspent[]<NonFungibleTokenUnspent>`

-------
Example
-------

.. code-block:: javascript

    const nft = new SensibleNFT({});
    
    let summarys = await nft.getSummaryDetail("0d0fc08db6e27dc0263b594d6b203f55fb5282e2","8b3a2aac0aa3ed60745898ffaba10891ec09b97b","1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",0,10);
    console.log(summarys)
    > 
    [
        {
            txId: '987a56b4018643b70f088f0c84f62d8fe2208f7d192780704ab86c89b24a362b',
            outputIndex: 1,
            tokenAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
            tokenIndex: '0',
            metaTxId: '8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea',
            metaOutputIndex: 1
        }
    ]


------------------------------------------------------------------------------

getSupplyInfo
=====================

.. code-block:: javascript

    nft.getSupplyInfo(sensibleId)

Query the supply info of NFT

----------
Parameters
----------

* ``sensibleId`` - ``string``:the sensibleId of NFT


-------
Returns
-------

``Promise`` returns ``Object``: 

- ``totalSupply`` - ``string``: the totalSupply of NFT.
- ``circulation`` - ``string``: the circulation of NFT.

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({});

    let info = await nft.getSupplyInfo(
        "4ccb43fe73d0da8991327a712b62ea02b61779c575ccf119faf62dfac1d5fb0e00000000"
    );
    console.log(info)

    >{ totalSupply: '3', circulation: '2' }

------------------------------------------------------------------------------


getSellList
=====================

.. code-block:: javascript

    nft.getSellList(codehash, genesis[, cursor][, size])

Query sell list of NFT tokens

----------
Parameters
----------

* ``codehash`` - ``string``:the codehash of NFT
* ``genesis`` - ``string``: the genesis of NFT
* ``cursor`` - ``string``: (Optional) the default is 0.
* ``size`` - ``number``: (Optional) size of page. the default is 20.


-------
Returns
-------

``Promise`` returns :ref:`NftSellUtxo[]<NftSellUtxo>` : utxos of sell contract

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({});

    let sellUtxos = await nft.getSellList('0d0fc08db6e27dc0263b594d6b203f55fb5282e2', '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',0,10);
    console.log(sellUtxos)
    >[
        {
            codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
            genesis: '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',
            tokenIndex: '1',
            txId: '62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf',
            outputIndex: 0,
            sellerAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
            satoshisPrice: 2100
        }
    ]

------------------------------------------------------------------------------


getSellListByAddress
=====================

.. code-block:: javascript

    nft.getSellListByAddress(address[, cursor][, size])

Query sell list of NFT tokens

----------
Parameters
----------

* ``address`` - ``string``: seller's address
* ``cursor`` - ``string``: (Optional) the default is 0.
* ``size`` - ``number``: (Optional) size of page. the default is 20.


-------
Returns
-------

``Promise`` returns :ref:`NftSellUtxo[]<NftSellUtxo>` : utxos of sell-contract

-------
Example
-------

.. code-block:: javascript

    const nft = new sensible.SensibleNFT({});

    let sellList = await nft.getSellListByAddress(
        "1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",0,1
    );
    console.log(sellList);

    >[{
        codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
        genesis: '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',
        tokenIndex: '1',
        txId: '62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf',
        outputIndex: 0,
        sellerAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
        satoshisPrice: 2100
    }]
------------------------------------------------------------------------------


getCodehashAndGensisByTx
=========================

.. code-block:: javascript

    getCodehashAndGensisByTx(genesisTx,genesisOutputIndex)

Get codehash and genesis from genesis tx.

----------
Parameters
----------

* ``genesisTx`` - ``bsv.Transaction``: the genesis transaction.
* ``genesisOutputIndex`` - ``number``: (Optional) the outputIndex of the TokenGenesis contract. Default is 0.


-------
Returns
-------

``Object``:

* ``genesis`` - ``string``: the genesis of token.
* ``codehash`` - ``string``: the codehash of token.
* ``sensibleId`` - ``string``: the sensibleId of token.

-------
Example
-------

.. code-block:: javascript

    const {tx} = nft.genesis(options);
    
    const {genesis,codehash,sensibleId} = nft.getCodehashAndGensisByTx(tx);

------------------------------------------------------------------------------


= Static Methods =
===================


selectSigners
==============

.. code-block:: javascript

    SensibleNFT.selectSigners(signerConfigs)

select available signers 

3/5 signers are required to provide transaction correlation.

The function is decide which 3 signers will be used. (with the fastest response)

----------
Parameters
----------

* ``signerConfigs`` - :ref:`SignerConfig[]<SignerConfig>`: (Optional) The signers for the token to instantiate

If the signerConfigs is not provided, the :ref:`default<defaultSignerConfigs>` will be used.

-------
Returns
-------

``Object``:

* ``signers`` - :ref:`SignerConfig[]<SignerConfig>` signers
* ``signerSelecteds`` - ``number[]``: the selected index of signers.

-------
Example
-------

.. code-block:: javascript

    const SensibleNFT = sensible.SensibleNFT;
    const { signers, signerSelecteds } = await SensibleNFT.selectSigners();
    const nft = new SensibleNFT({
        network: "testnet", //mainnet or testnet
        purse: "", //the wif of a bsv address to offer transaction fees
        feeb: 0.5,
        signers,
        signerSelecteds,
    })


------------------------------------------------------------------------------

isSupportedToken
=====================

.. code-block:: javascript

    SensibleNFT.isSupportedToken(codehash)

The SDK only supports tokens with specified version codehash.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of token.


-------
Returns
-------

``boolean``: is token supported

-------
Example
-------

.. code-block:: javascript
    
    let isSupported = sensible.SensibleNFT.isSupportedToken("0d0fc08db6e27dc0263b594d6b203f55fb5282e2");
    console.log(isSupported);

    >true

------------------------------------------------------------------------------



parseTokenScript
=====================

.. code-block:: javascript

    SensibleNFT.parseTokenScript(scriptBuf,[network])

a function to parse output script

----------
Parameters
----------

1. ``scriptBuf`` - ``Buffer``: The token script buffer
2. ``network`` - :ref:`API_NET<API_NET>`: (Optional) network

-------
Returns
-------

``Object``: The transaction object:

- ``codehash`` - ``string``: the codehash of token 
- ``genesis`` - ``string``: the genesis of token. 
- ``sensibleId`` - ``string`` the sensibleId of token.
- ``metaidOutpoint`` - :ref:`MetaidOutpoint<MetaidOutpoint>`: NFT State.
- ``genesisFlag`` - ``number``: is the NftGenesis contract or not.
- ``nftAddress`` - ``string``: owner's address
- ``totalSupply`` - ``BN``: total supply
- ``tokenIndex`` - ``BN``: the index of NFT
- ``genesisHash`` - ``string``: the token genesisHash
- ``rabinPubKeyHashArrayHash`` - ``string``: the token rabinPubKeyHashArrayHash
- ``sensibleID`` - :ref:`SensibleID<SensibleID>`: the token sensibleID
- ``protoVersion`` - ``number``: the proto version
- ``protoType`` - ``number``: the proto type

-------
Example
-------

.. code-block:: javascript

    const tx = new bsv.Transaction(rawHex);
    const scriptBuf = tx.outputs[0].scriptBuf
    let { tokenAmount } = await nft.parseTokenScript(scriptBuf);
    console.log(tokenAmount.toString('hex'));

------------------------------------------------------------------------------
