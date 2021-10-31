.. _SensibleFT:

===========
SensibleFT
===========

The ``SensibleFT`` object makes it easy to interact with Sensible Fungible Token contracts on the BitcoinSV blockchain.


------------------------------------------------------------------------------

new
=====================

.. code-block:: javascript

    new SensibleFT(options)


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

``Object``: The SensibleFT object


-------
Example
-------

.. code-block:: javascript
    
    const SensibleFT = sensible.SensibleFT;
    const { signers, signerSelecteds } = await SensibleFT.selectSigners();
    const ft = new SensibleFT({
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

    ft.genesis(options)

Creates a TokenGenesis Transaction for a new token.


----------
Parameters
----------

* ``options`` - ``Object``:
    * ``tokenName`` - ``string``: token name, limited to 20 bytes
    * ``tokenSymbol`` - ``string``: the token symbol, limited to 10 bytes
    * ``decimalNum`` - ``number``: the decimal number, range 0-255 
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``genesisWif`` - ``string``: the private key of the token genesiser
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
Issuing the token need those values.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({});
    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { txid, genesis, codehash, sensibleId } = await ft.genesis({
        genesisWif: CoffeeShop.wif,
        tokenName: "COFFEE COIN",
        tokenSymbol: "CC",
        decimalNum: 3,
    });


    // or specify bsv utxos (wif must be provided)
    let bsvUtxos = ft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })
    let { txid, genesis, codehash, sensibleId } = await ft.genesis({
        genesisWif: CoffeeShop.wif,
        tokenName: "COFFEE COIN",
        tokenSymbol: "CC",
        decimalNum: 3,
        utxos:bsvUtxos
    });


------------------------------------------------------------------------------

issue
=====================

.. code-block:: javascript

    ft.issue(options)

Issue tokens.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``sensibleId`` - ``string``: the sensibleId of token.
    * ``genesisWif`` - ``string``: the private key of the token genesiser
    * ``receiverAddress`` - ``string``: the token receiver address
    * ``tokenAmount`` - ``string``: the token amount to issue
    * ``allowIncreaseIssues`` - ``boolean``: (Optional) if allow to increase issues. default is true
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

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT(...)
    const {genesis,codehash,sensibleId} = ft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { txid } = await ft.issue({
        genesis: genesis,
        codehash: codehash,
        sensibleId: sensibleId,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        tokenAmount: "1000000000000",
        allowIncreaseIssues: false, 
    });


    // or specify bsv utxos (wif must be provided)
    let bsvUtxos = ft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })
    let { txid } = await ft.issue({
        genesis: genesis,
        codehash: codehash,
        sensibleId: sensibleId,
        genesisWif: CoffeeShop.wif,
        receiverAddress: CoffeeShop.address,
        tokenAmount: "1000000000000",
        allowIncreaseIssues: false, 
        utxos:bsvUtxos
    });


------------------------------------------------------------------------------


transfer
=====================

.. code-block:: javascript

    ft.transfer(options)

Transfer tokens.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``receivers`` - :ref:`TokenReceiver[]<TokenReceiver>`: token receivers
    * ``senderWif`` - ``string``: the private key of the token sender
    * ``ftUtxos`` - :ref:`ParamFtUtxo[]<ParamFtUtxo>`: (Optional) specify token utxos
    * ``ftChangeAddress`` - ``string|bsv.Address``: (Optional) specify ft changeAddress 
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos which should be no more than 3 
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``middleChangeAddress`` - ``string|bsv.Address``: (Optional) the middle bsv changeAddress
    * ``middlePrivateKey`` - ``string|bsv.PrivateKey``: (Optional) the private key of the middle changeAddress
    * ``isMerge`` - ``boolean``: (Optional) do not use this param. Please use function Merge.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``routeCheckTx`` - ``bsv.Transaction``: the amount-check transaction object.
- ``routeCheckTxHex`` - ``string``: raw hex of the amount-check transaction.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT(...)
    const {genesis,codehash,sensibleId} = ft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
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


    // or specify ft utxos and bsv utxos (wif must be provided)
    let bsvUtxos = ft.sensibleApi.getUnspents(CoffeeShop.address);
    bsvUtxos.forEach(v=>{ 
        v.wif = CoffeeShop.wif;
    })
    let ftUtxos = ft.sensibleApi.getFungibleTokenUnspents(codehash,genesis,CoffeeShop.address,100);
    ftUtxos.forEach(v=>{
        v.wif = CoffeeShop.wif;
    })
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
        utxos: bsvUtxos
    });


------------------------------------------------------------------------------


merge
=====================

.. code-block:: javascript

    ft.merge(options)

Merge tokens.

Why do I need to merge tokens?
At present, the contract supports only 20 utxo transfers at the same time. When the utxo collection is too large, it needs to be merged.

It will take up to 20 utxos as input and merge them into one output and transfer to owner.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``ownerWif`` - ``string``: the private key of the token owner
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``noBroadcast`` - ``boolean``: (Optional) whether not to broadcast the transaction, the default is false

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Object``: The transaction object:

- ``tx`` - ``bsv.Transaction``: the transaction object.(With input data)
- ``txHex`` - ``string``: raw hex of the transaction.
- ``txid`` - ``string``: id of the transaction.
- ``routeCheckTx`` - ``bsv.Transaction``: the amount-check transaction object.(With input data)
- ``routeCheckTxHex`` - ``string``: raw hex of the amount-check transaction.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({})

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    let { txid } = await ft.merge({
        ownerWif: CoffeeShop.wif,
        codehash: codehash,
        genesis: genesis,
    });

------------------------------------------------------------------------------


unsignGenesis
=====================

.. code-block:: javascript

    ft.unsignGenesis(options)

Create an unsigned transaction for genesis

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``tokenName`` - ``string``: token name, limited to 20 bytes
    * ``tokenSymbol`` - ``string``: the token symbol, limited to 10 bytes
    * ``decimalNum`` - ``number``: the decimal number, range 0-255 
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional)  specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``genesisPublicKey`` - ``string|bsv.PublicKey``: the public key of the token genesiser

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

    const ft = new sensible.SensibleFT(...)
    const {...,genesis,codehash,sensibleId} = ft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    // use purse to offer the bsv fee
    let { tx, sigHashList } = await ft.unsignGenesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisPublicKey: CoffeeShop.publicKey,
    });

    //wallet sign the inputs
    let sigList = signSigHashList(sigHashList);

    //update tx's inputs
    ft.sign(tx, sigHashList, sigList);

    //broadcast
    await ft.sensibleApi.broadcast(tx.serialize(true));


------------------------------------------------------------------------------



unsignIssue
=====================

.. code-block:: javascript

    ft.unsignIssue(options)

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
    * ``tokenAmount`` - ``string``: the token amount to issue
    * ``allowIncreaseIssues`` - ``boolean``: (Optional) if allow to increase issues. default is true
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

    const ft = new sensible.SensibleFT(...)
    const {...,genesis,codehash,sensibleId} = ft.genesis(...);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"",
    };

    // use purse to offer the bsv fee
    let { txid ,sigHashList} = await ft.unsignIssue({
        genesis: genesis,
        codehash: codehash,
        sensibleId: sensibleId,
        genesisPublicKey: CoffeeShop.publicKey,
        receiverAddress: CoffeeShop.address,
        tokenAmount: "1000000000000",
        allowIncreaseIssues: false, 
    });

    let sigList = signSigHashList(sigHashList);
    ft.sign(tx, sigHashList, sigList);
    await sensibleApi.broadcast(tx.serialize(true));

------------------------------------------------------------------------------


unsignPreTransfer
=====================

.. code-block:: javascript

    ft.unsignPreTransfer(options)


Create unsigned transactions for transfer

The unsigned transfer token needs to be completed in two steps. 

----------
Parameters
----------

* ``options`` - ``Object``: the options used for deployment.
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``receivers`` - :ref:`TokenReceiver[]<TokenReceiver>`:  token receivers.[{address:'xxx',amount:'1000'}]
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: the private key of the token sender,can be wif or other format
    * ``ftUtxos`` - :ref:`ParamFtUtxo[]<ParamFtUtxo>`: (Optional) specify token utxos
    * ``ftChangeAddress`` - ``string|bsv.Address``: (Optional) specify ft changeAddress 
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``middleChangeAddress`` - ``string|bsv.Address``: (Optional) the middle bsv changeAddress
    * ``middlePrivateKey`` - ``string|bsv.PrivateKey``: (Optional) the private key of the middle changeAddress
    * ``isMerge`` - ``boolean``: (Optional) do not use this param. Please use function Merge.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Promise`` returns ``Object``: 

- ``unsignTxRaw`` - ``string``: raw hex of the transaction.
- ``routeCheckTx`` - ``bsv.Transaction``: the amount-check transaction object.(With input data)
- ``routeCheckSigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

routeCheckSigHashList contains all the input that needs to be signed.

The signature method can refer to :ref:`signSigHashList<signSigHashList>` 

Notice! UnsignTxRaw is an incomplete transaction and not able to be signed before routeCheckTx is completed.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({})

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    let {
        routeCheckTx,
        routeCheckSigHashList,
        unsignTxRaw,
    } = await ft.unsignPreTransfer({
        codehash,
        genesis,
        senderPublicKey: CoffeeShop.publicKey,
        receivers: [
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
        ]
    });

    ft.sign(
        routeCheckTx,
        routeCheckSigHashList,
        signSigHashList(routeCheckSigHashList)
    );

    await ft.sensibleApi.broadcast(routeCheckTx.serialize(true));
    let { tx, sigHashList } = await ft.unsignTransfer(
        routeCheckTx,
        unsignTxRaw
    );
    ft.sign(tx, sigHashList, signSigHashList(sigHashList));

    await ft.sensibleApi.broadcast(tx.serialize(true));



------------------------------------------------------------------------------


unsignTransfer
=====================

.. code-block:: javascript

    ft.unsignTransfer(options)

This follows the previous unsignPreTransfer.

----------
Parameters
----------

* ``options`` - ``Object``: the options used for deployment.
    * ``routeCheckTx`` - ``bsv.Transaction``: the genesis of token.
    * ``unsignTxRaw`` - ``string``: the codehash of token.

-------
Returns
-------

``Promise`` returns ``Object``: 

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

The tx is still unsigned.

-------
Example
-------

See the example in unsignPreTransfer

------------------------------------------------------------------------------



unsignPreMerge
=====================

.. code-block:: javascript

    ft.unsignPreMerge(options)

Create unsigned transactions for merge

The unsigned merge token needs to be completed in two steps. 

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``ownerPublicKey`` - ``string``: the private key of the token owner
    * ``ftUtxos`` - :ref:`ParamFtUtxo[]<ParamFtUtxo>`: (Optional) specify token utxos
    * ``ftChangeAddress`` - ``string`` (Optional) specify ft changeAddress 
    * ``utxos`` - :ref:`ParamUtxo[]<ParamUtxo>`: (Optional) specify bsv utxos
    * ``changeAddress`` - ``string|bsv.Address``: (Optional) specify bsv changeAddress
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

The best practice is to determine the number of utxos in the address and merge them in advance.

-------
Returns
-------

``Promise`` returns ``Object``: 

- ``unsignTxRaw`` - ``string``: raw hex of the transaction.
- ``routeCheckTx`` - ``bsv.Transaction``: the amount-check transaction object.(With input data)
- ``routeCheckSigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

routeCheckSigHashList contains all the input that needs to be signed.

The signature method can refer to :ref:`signSigHashList<signSigHashList>` 
    
-------
Example
-------

.. code-block:: javascript
    
    //get genesis/codehash/sensibleId from genesis.
    const {...,genesis,codehash,sensibleId} = ft.genesis(options);

    const CoffeeShop = {
        wif: "L1Ljq1wKir7oJsTzHRq437JdDkmY9v8exFwm2jzytq7EdzunS71Q",
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3"
    };

    let {
        routeCheckTx,
        routeCheckSigHashList,
        unsignTxRaw,
    } = await ft.unsignPreMerge({
        codehash,
        genesis,
        ownerPublicKey: CoffeeShop.publicKey,
        utxos,
    });
    ft.sign(
        routeCheckTx,
        routeCheckSigHashList,
        signSigHashList(routeCheckSigHashList)
    );
    await sensibleApi.broadcast(routeCheckTx.serialize(true));

    let { tx, sigHashList } = await ft.unsignMerge(routeCheckTx, unsignTxRaw);
    ft.sign(tx, sigHashList, signSigHashList(sigHashList));
    await sensibleApi.broadcast(tx.serialize(true));

------------------------------------------------------------------------------


unsignMerge
=====================

.. code-block:: javascript

    ft.unsignMerge(options)

This follows the previous unsignPreMerge.

----------
Parameters
----------

* ``options`` - ``Object``: the options used for deployment.
    * ``routeCheckTx`` - ``bsv.Transaction``: the genesis of token.
    * ``unsignTxRaw`` - ``string``: the codehash of token.

-------
Returns
-------

``Promise`` returns ``Object``: 

- ``tx`` - ``bsv.Transaction``: the transaction object.
- ``sigHashList`` - :ref:`SigHashInfo[]<SigHashInfo>`: sighash info

-------
Example
-------

See the example in unsignPreTransfer

------------------------------------------------------------------------------



getGenesisEstimateFee
=====================

.. code-block:: javascript

    ft.getGenesisEstimateFee(options)

Estimate the cost of genesis

The cost mainly depends on the number of bsv utxo inputs.

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 10.

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript
    
    let estimateFee = await ft.getGenesisEstimateFee({
        utxoMaxCount: 1,
    });


------------------------------------------------------------------------------


getIssueEstimateFee
=====================

.. code-block:: javascript

    ft.getIssueEstimateFee(options)

Estimate the cost of issue

----------
Parameters
----------

* ``options`` - ``Object``: 
    * ``sensibleId`` - ``string``: the sensibleId of token.
    * ``genesisPublicKey`` - ``string|bsv.PublicKey``: the public key of token genesiser.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``allowIncreaseIssues`` - ``boolean``:  (Optional) if allow increase issues , the default is true.
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 10.


-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.


-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT(...);
    const {...,genesis,codehash,sensibleId} = ft.genesis(options);

    const CoffeeShop = {
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"02fe9584308dcab1c934cd82329d099152115cb9acced8e4413380333bbcb7520d",
    };

    let estimateFee = await ft.getIssueEstimateFee({
        sensibleId,
        genesisPublicKey: CoffeeShop.publicKey,
        allowIncreaseIssues: true,
      });



------------------------------------------------------------------------------

getTransferEstimateFee
=====================

.. code-block:: javascript

    ft.getTransferEstimateFee(options)

Estimate the cost of transfer

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``receivers`` - :ref:`TokenReceiver[]<TokenReceiver>`:   token receivers.[{address:'xxx',amount:'1000'}]
    * ``senderWif`` - ``string``: the private key of the token sender,can be wif or other format
    * ``senderPrivateKey`` - ``string|bsv.PrivateKey``: the private key of the token sender,can be wif or other format
    * ``senderPublicKey`` - ``string|bsv.PublicKey``: (Optional) senderWif and senderPublicKey must be provided 
    * ``ftUtxos`` - ``ParamFtUtxo[]``: (Optional) specify token utxos
    * ``ftChangeAddress`` - ``string|bsv.Adderss``: (Optional) specify ft changeAddress 
    * ``isMerge`` - ``boolean``: (Optional) do not use this param. Please use function Merge.
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 3.

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript
    
    //get genesis/codehash from genesis.
    const {...,genesis,codehash} = ft.genesis(options);

    const CoffeeShop = {
        address:"1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",
        publicKey:"02fe9584308dcab1c934cd82329d099152115cb9acced8e4413380333bbcb7520d",
    };

     let estimateFee = await ft.getTransferEstimateFee({
        codehash,
        genesis,
        senderPublicKey: CoffeeShop.publicKey,
        receivers: [
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
          { address: Alice.address.toString(), amount: "100" },
        ],
        utxoMaxCount: 3,
      });

------------------------------------------------------------------------------


getMergeEstimateFee
=====================

.. code-block:: javascript

    ft.getMergeEstimateFee(options)

Estimate the cost of merge

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``genesis`` - ``string``: the genesis of token.
    * ``codehash`` - ``string``: the codehash of token.
    * ``ownerWif`` - ``string``: the private key of the token sender,can be wif or other format
    * ``ownerPublicKey`` - ``string|bsv.PublicKey``: (Optional) senderWif and senderPublicKey must be provided 
    * ``ftUtxos`` - ``ParamFtUtxo[]``: (Optional) specify token utxos
    * ``ftChangeAddress`` - ``string|bsv.Adderss``: (Optional) specify ft changeAddress 
    * ``isMerge`` - ``String``: (Optional) do not use this param. Please use function Merge.
    * ``opreturnData`` - ``Array``: (Optional) append an opReturn output
    * ``utxoMaxCount`` - ``number``: (Optional) Maximum number of BSV UTXOs supported, the default is 3.

The number of bsv utxo inputs must not be greater than 3, or the transaction will failed.

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({});

    let estimateFee = await ft.getMergeEstimateFee({
        codehash,
        genesis,
        ownerWif: CoffeeShop.privateKey.toWIF(),
        opreturnData,
    });


------------------------------------------------------------------------------

getTransferEstimateFee2
=====================

.. code-block:: javascript

    ft.getTransferEstimateFee2(options)

Estimate the cost of transfer

----------
Parameters
----------

* ``options`` - ``Object``:
    * ``bsvInputLen`` - ``string``: the count of bsv inputs
    * ``tokenInputLen`` - ``string``: the count of token inputs 
    * ``tokenOutputLen`` - ``string``: the count of token outputs
    * ``opreturnData`` - ``string[]|string|Buffer``: (Optional) append an opReturn output

-------
Returns
-------
``Promise`` returns ``number``: The fee amount estimated.

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({});
    let estimateFee = await ft.getTransferEstimateFee2({
        bsvInputLen: 3,
        tokenInputLen: 1,
        tokenOutputLen: 6,
      });


------------------------------------------------------------------------------


setDustThreshold
=====================

.. code-block:: javascript

    ft.setDustThreshold(options)

Set dust. DustAmount has a higher priority than dustLimitFactor.

Notice, too low dust will be rejected by miner.

----------
Parameters
----------

1. ``options`` - ``Object``: The options used for deployment.
    * ``dustLimitFactor`` - ``number``: (Optional): specify the output dust rate, default is 0.25 .If the value is equal to 0, the final dust will be at least 1.
    * ``dustAmount`` - ``number``: (Optional): specify the output dust

-------
Returns
-------

none

-------
Example
-------

.. code-block:: javascript

    ft.setDustThreshold({
        dustLimitFactor: 0.25
    )

    ft.setDustThreshold({
        dustAmount: 1
    })



------------------------------------------------------------------------------


sign
=====================

.. code-block:: javascript

    ft.sign(options)

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
    
    const ft = new sensible.SensibleFT({});
    let { tx, sigHashList } = await ft.unsignGenesis({
        tokenName: "CoffeeCoin",
        tokenSymbol: "CC",
        decimalNum: 8,
        genesisPublicKey: CoffeeShop.publicKey,
        utxos,
    });

    let sigList = signSigHashList(sigHashList);

    ft.sign(tx, sigHashList, sigList);

    await sensibleApi.broadcast(tx.serialize(true));

    


------------------------------------------------------------------------------


broadcast
=====================

.. code-block:: javascript

    ft.broadcast(txHex)

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
    
    const {...,txHex} = ft.genesis({...,noBroadcast:true});

    let txid = await ft.broadcast(txHex);
    console.log(txid);

------------------------------------------------------------------------------



dumpTx
=====================

.. code-block:: javascript

    ft.dumpTx(tx)

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
    
    const {...,tx} = ft.genesis(options);

    ft.dumpTx(tx);

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

    ft.getSummary(address)

Query the token summary infos of address.


----------
Parameters
----------

* ``address`` - ``string``: token address.

-------
Returns
-------

``Promise`` returns :ref:`FungibleTokenSummary[]<FungibleTokenSummary>`

-------
Example
-------

.. code-block:: javascript

    const ft = new SensibleFT({});
    
    let summarys = await ft.getSummary("18WoTi5rkjtqrR74pQ2q6gSzshCosjyTTr");
    console.log(summarys)

    
    > [
        {
            codehash: '777e4dd291059c9f7a0fd563f7204576dcceb791',
            genesis: '8e9c53e1a38ff28772db99ee34a23bb305062a1a',
            sensibleId: '17f47c6861b3a4fec7d337d80d204e6d214836c88e49e9bea398feddddb455ae00000000',
            pendingBalance: '0',
            balance: '631034354',
            symbol: 'OVTS',
            decimal: 3
        }
    ]
------------------------------------------------------------------------------

getFtUtxos
=====================

.. code-block:: javascript

    ft.getFtUtxos(options)

Query token utxos.

----------
Parameters
----------

* ``genesis`` - ``string``: the genesis of token.
* ``codehash`` - ``string``: the codehash of token.
* ``address`` - ``string``  token address
* ``count`` - ``number`` (Optional) the default is 20.


-------
Returns
-------

``Promise`` returns :ref:`FungibleTokenUnspent[]<FungibleTokenUnspent>` : utxos of token

-------
Example
-------

.. code-block:: javascript

    const ft = new sensible.SensibleFT({});

    let ftUtxos = await ft.getFtUtxos(
        "777e4dd291059c9f7a0fd563f7204576dcceb791",
        "8e9c53e1a38ff28772db99ee34a23bb305062a1a",
        "18WoTi5rkjtqrR74pQ2q6gSzshCosjyTTr",
        20
    );

    >[
        {
            txId: '87f78f839ccca66e992fcbdd5065b0faa151e35ef8b7044a279f87c05b4038e3',
            outputIndex: 69,
            tokenAddress: '18WoTi5rkjtqrR74pQ2q6gSzshCosjyTTr',
            tokenAmount: '631034354'
        }
    ]

------------------------------------------------------------------------------


getCodehashAndGensisByTx
=====================

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

    const {tx} = ft.genesis(options);
    
    const {genesis,codehash,sensibleId} = ft.getCodehashAndGensisByTx(tx);

------------------------------------------------------------------------------


= Static Methods =
===================


selectSigners
==============

.. code-block:: javascript

    SensibleFT.selectSigners(signerConfigs)

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
    
    const SensibleFT = sensible.SensibleFT;
    const { signers, signerSelecteds } = await SensibleFT.selectSigners();
    const ft = new SensibleFT({
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

    SensibleFT.isSupportedToken(codehash)

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
    
    let isSupported = sensible.SensibleFT.isSupportedToken("777e4dd291059c9f7a0fd563f7204576dcceb791");
    console.log(isSupported);

    >true

------------------------------------------------------------------------------



parseTokenScript
=====================

.. code-block:: javascript

    SensibleFT.parseTokenScript(scriptBuf,[network])

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
- ``tokenName`` - ``string``: the token name
- ``tokenSymbol`` - ``string``: the token symbol
- ``genesisFlag`` - ``number``: is the TokenGenesis contract or not.
- ``decimalNum`` - ``number``: the token decimal
- ``tokenAddress`` - ``string``: the token address
- ``tokenAmount`` - ``BN``: the token amount
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
    let { tokenAmount } = await ft.parseTokenScript(scriptBuf);
    console.log(tokenAmount.toString('hex'));

------------------------------------------------------------------------------
