.. _SensibleApi:

===========
SensibleApi
===========

The ``SensibleApi`` object provides calls to some interfaces of `sensiblequery <https://api.sensiblequery.com/swagger/index.html>`_



------------------------------------------------------------------------------

new
=====================


.. code-block:: javascript

    new SensibleApi(apiNet[, apiTarget])


----------
Parameters
----------

* ``apiNet`` - :ref:`API_NET<API_NET>`: specify the network
* ``apiTarget`` - :ref:`API_TARGET<API_TARGET>`: (Optional) specify the api target point.

-------
Returns
-------

``Object``: The SensibleApi object


-------
Example
-------

.. code-block:: javascript
    
    const sensibleApi = new sensible.SensibleApi(API_NET.MAIN, API_TARGET.SENSIBLE);

------------------------------------------------------------------------------



= Methods =
============


------------------------------------------------------------------------------


authorize
=====================

.. code-block:: javascript

    sensibleApi.authorize(options)

When your apiTarget is metasv, you need to authorize.

----------
Parameters
----------

* ``options`` - :ref:`AuthorizationOption<AuthorizationOption>` 

-------
Returns
-------

none


-------
Example
-------

.. code-block:: javascript

    const sensibleApi = new sensible.SensibleApi(API_NET.MAIN, API_TARGET.METASV);
    sensibleApi.authorize({authorization:"xxx"})


------------------------------------------------------------------------------


getBalance
================================

.. code-block:: javascript

    sensibleApi.getBalance(address)

Get bsv balance

----------
Parameters
----------

* ``address`` - ``string``: the bsv address


-------
Returns
-------

``Promise`` returns ``Object``:

* ``balance`` - ``string``: the confirmed balance
* ``pendingBalance`` - ``string``: the unconfirmed balance

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let balance = await sensibleApi.getBalance("1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3");
    console.log(balance);

    > 
    { balance: 0, pendingBalance: 0 }

------------------------------------------------------------------------------


getUnspents
=====================

.. code-block:: javascript

    sensibleApi.getUnspents(address)

Query bsv utxos.

----------
Parameters
----------

* ``address`` - ``string`` bsv address

-------
Returns
-------

``Object[]``: The utxo object array:

- ``txid`` - ``string``: txid
- ``outputIndex`` - ``number``: outputIndex
- ``satoshis`` - ``number``: satoshis
- ``address`` - ``string``: address 

-------
Example
-------

.. code-block:: javascript

    const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);
    let utxos = await sensibleApi.getUnspents("1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu")
    console.log(utxos);
    >
    [
        {
            txId: 'e37dbe764865f5e887cdd5c91f4c9853e5d6898b71429f08df83b67cf8b1a531',
            outputIndex: 4,
            satoshis: 4350,
            address: '1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu'
        }
    ]

------------------------------------------------------------------------------


broadcast
=====================

.. code-block:: javascript

    sensibleApi.broadcast(txHex)

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
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let txid = await sensibleApi.broadcast(txHex);
    console.log(txid);

------------------------------------------------------------------------------

getRawTxData
=====================

.. code-block:: javascript

    sensibleApi.getRawTxData(txid)

Get raw transaction

----------
Parameters
----------

* ``txid`` - ``string``: the id of transaction


-------
Returns
-------

``Promise`` returns ``string``: the txid of transaction

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let rawtx = await sensibleApi.getRawTxData("e37dbe764865f5e887cdd5c91f4c9853e5d6898b71429f08df83b67cf8b1a531");
    console.log(rawtx);

------------------------------------------------------------------------------

getOutpointSpent
================================

.. code-block:: javascript

    sensibleApi.getOutpointSpent(txid, index)

Get the spend info of the outpoint.

----------
Parameters
----------

* ``txid`` - ``string``: the id of transaction
* ``index`` - ``number``: the index of output.

-------
Returns
-------

``Promise`` returns ``Object``:
* ``spentTxId`` - ``string``: the id of the spenting transaction
* ``spentInputIndex`` - ``number``: the input index of the spenting transaction

If there is no spend, null is returned.

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let spent = await sensibleApi.getOutpointSpent("62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf",1);
    console.log(spent);

    >
    {
        spentTxId: '283b8c9047a9e5d002e9520761b4d51cd06a85877b9ca865b5643fbfd1af786c',
        spentInputIndex: 1
    }
------------------------------------------------------------------------------



getFungibleTokenUnspents
=====================

.. code-block:: javascript

    sensibleApi.getFungibleTokenUnspents(codehash, genesis, address[, size])

Get ft utxos.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of token
* ``genesis`` - ``string``: the genesis of token
* ``address`` - ``string``: the owner of token
* ``size`` - ``number``: (Optional) the number to get.


-------
Returns
-------

``Promise`` returns :ref:`FungibleTokenUnspent[]<FungibleTokenUnspent>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let ftUtxos = await sensibleApi.getFungibleTokenUnspents("777e4dd291059c9f7a0fd563f7204576dcceb791","5d15eedd93c90d91e0d76de5cc932c833baf8336","1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu",10);
    console.log(ftUtxos);

    > 
    [
        {
            txId: 'e467016c96dda51b23186060ff115089459b5b8d8f649236c80e6b4b35279598',
            outputIndex: 1,
            tokenAddress: '1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu',
            tokenAmount: '1656451380'
        }
    ]
------------------------------------------------------------------------------


getFungibleTokenBalance
=====================

.. code-block:: javascript

    sensibleApi.getFungibleTokenBalance(codehash, genesis, address)

Get ft balance.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of token
* ``genesis`` - ``string``: the genesis of token
* ``address`` - ``string``: the owner address of token


-------
Returns
-------

``Promise`` returns :ref:`FungibleTokenBalance<FungibleTokenBalance>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let balance = await sensibleApi.getFungibleTokenBalance("777e4dd291059c9f7a0fd563f7204576dcceb791","5d15eedd93c90d91e0d76de5cc932c833baf8336","1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu");
    console.log(balance);

    > 
    {
        balance: '1656451380',
        pendingBalance: '0',
        utxoCount: 1,
        decimal: 8
    }

------------------------------------------------------------------------------


getFungibleTokenSummary
================================

.. code-block:: javascript

    sensibleApi.getFungibleTokenSummary(address)

Get all fungible token infos of the address.

----------
Parameters
----------

* ``address`` - ``string``: the owner address


-------
Returns
-------

``Promise`` returns :ref:`FungibleTokenSummary[]<FungibleTokenSummary>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let ftSummary = await sensibleApi.getFungibleTokenSummary("1Bq7WZKzxe3Ftf4U7e9treVrnn7Uo3evQu");
    console.log(ftSummary);

    > 
    [
        {
            codehash: '777e4dd291059c9f7a0fd563f7204576dcceb791',
            genesis: '5d15eedd93c90d91e0d76de5cc932c833baf8336',
            sensibleId: '3acda780d1f586bf1384772f3b4ee1a3368b9f25e9c4a92b20cef7680dd6e72300000000',
            pendingBalance: '0',
            balance: '1656451380',
            symbol: 'TSC',
            decimal: 8
        }
    ]

------------------------------------------------------------------------------

getNonFungibleTokenUnspents
=====================

.. code-block:: javascript

    sensibleApi.getNonFungibleTokenUnspents(codehash, genesis, address[, cursor][, size])

Get nft utxos.

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
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let nftUtxos = await sensibleApi.getNonFungibleTokenUnspents("0d0fc08db6e27dc0263b594d6b203f55fb5282e2","8b3a2aac0aa3ed60745898ffaba10891ec09b97b","1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",0,10);
    console.log(nftUtxos);

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

getNonFungibleTokenUnspentDetail
================================

.. code-block:: javascript

    sensibleApi.getNonFungibleTokenUnspentDetail(codehash, genesis, tokenIndex)

Get nft utxo.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of token
* ``genesis`` - ``string``: the genesis of token
* ``tokenIndex`` - ``string``: the index of NFT


-------
Returns
-------

``Promise`` returns :ref:`NonFungibleTokenUnspent<NonFungibleTokenUnspent>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let nftUtxo = await sensibleApi.getNonFungibleTokenUnspentDetail("0d0fc08db6e27dc0263b594d6b203f55fb5282e2","8b3a2aac0aa3ed60745898ffaba10891ec09b97b",0);
    console.log(nftUtxo);

    > 
    {
        txId: '987a56b4018643b70f088f0c84f62d8fe2208f7d192780704ab86c89b24a362b',
        outputIndex: 1,
        tokenAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
        tokenIndex: '0',
        metaTxId: '8424d5efb0c11f574d7f045959bdc233c17804312c9ca1e196cebdae2b2646ea',
        metaOutputIndex: 1
    }

------------------------------------------------------------------------------

getNonFungibleTokenSummary
================================

.. code-block:: javascript

    sensibleApi.getNonFungibleTokenSummary(address)

Get all nfts of the address.

----------
Parameters
----------

* ``address`` - ``string``: the owner address


-------
Returns
-------

``Promise`` returns :ref:`NonFungibleTokenSummary[]<NonFungibleTokenSummary>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let nftSummary = await sensibleApi.getNonFungibleTokenSummary("1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3");
    console.log(nftSummary);

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


getNftSellUtxo
================================

.. code-block:: javascript

    sensibleApi.getNftSellUtxo(codehash,genesis,tokenIndex)

Get sell utxo of a NFT.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of NFT
* ``genesis`` - ``string``: the genesis of NFT
* ``tokenIndex`` - ``string``: the index of NFT


-------
Returns
-------

``Promise`` returns :ref:`NftSellUtxo<NftSellUtxo>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let sellUtxo = await sensibleApi.getNftSellUtxo("0d0fc08db6e27dc0263b594d6b203f55fb5282e2","8b3a2aac0aa3ed60745898ffaba10891ec09b97b",0);
    console.log(sellUtxo);

    > 
    {
        codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
        genesis: '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',
        tokenIndex: 1,
        txId: '62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf',
        outputIndex: 0,
        sellerAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
        satoshisPrice: 2100
    }

------------------------------------------------------------------------------

getNftSellList
================================

.. code-block:: javascript

    sensibleApi.getNftSellList(codehash, genesis[, cursor][, size])

Get all sell utxos of NFT.

----------
Parameters
----------

* ``codehash`` - ``string``: the codehash of NFT
* ``genesis`` - ``string``: the genesis of NFT
* ``cursor`` - ``number``: (Optional) the cursor of records.
* ``size`` - ``number``: (Optional) the number of records.

-------
Returns
-------

``Promise`` returns :ref:`NftSellUtxo[]<NftSellUtxo>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let sellUtxos = await sensibleApi.getNftSellList("0d0fc08db6e27dc0263b594d6b203f55fb5282e2","8b3a2aac0aa3ed60745898ffaba10891ec09b97b",0,10);
    console.log(sellUtxos);

    > 
    [
        {
            codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
            genesis: '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',
            tokenIndex: 1,
            txId: '62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf',
            outputIndex: 0,
            sellerAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
            satoshisPrice: 2100
        }
    ]

------------------------------------------------------------------------------




getNftSellListByAddress
================================

.. code-block:: javascript

    sensibleApi.getNftSellListByAddress(address[, cursor][, size])

Get all sell utxos of address.

----------
Parameters
----------

* ``address`` - ``string``: the seller address
* ``cursor`` - ``number``: (Optional) the cursor of records.
* ``size`` - ``number``: (Optional) the number of records.

-------
Returns
-------

``Promise`` returns :ref:`NftSellUtxo[]<NftSellUtxo>`

-------
Example
-------

.. code-block:: javascript
    
   const sensibleApi = new sensible.SensibleApi(API_NET.MAIN);

    let sellUtxos = await sensibleApi.getNftSellListByAddress("1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3",0,10);
    console.log(sellUtxos);

    > 
    [
        {
            codehash: '0d0fc08db6e27dc0263b594d6b203f55fb5282e2',
            genesis: '8b3a2aac0aa3ed60745898ffaba10891ec09b97b',
            tokenIndex: 1,
            txId: '62b37ce3bb9f2b146abef0faa4dcc7dd6d9266880923b0ae5a1237bf2b4c25cf',
            outputIndex: 0,
            sellerAddress: '1FVyetCQrPdjNaG962bqYA5EL6q1JxNET3',
            satoshisPrice: 2100
        }
    ]

------------------------------------------------------------------------------

