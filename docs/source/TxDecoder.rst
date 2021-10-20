.. _TxDecoder:

===========
TxDecoder
===========

The ``TxDecoder`` helps you to decode sensible transaction.

------------------------------------------------------------------------------

= Static Methods =
============


------------------------------------------------------------------------------



decodeOutput
================================

.. code-block:: javascript

    TxDecoder.decodeOutput(output, network)

Decode transaction output

----------
Parameters
----------

* ``output`` - ``bsv.Transaction.Output``
* ``network`` - :ref:`API_NET<API_NET>`:

-------
Returns
-------

``Promise`` returns :ref:`DecodedOutput<DecodedOutput>`

-------
Example
-------

.. code-block:: javascript

    const { bsv, TxDecoder, SensibleApi, API_NET } = sensible;
    const sensibleApi = new SensibleApi(API_NET.MAIN);
    let rawtx = await sensibleApi.getRawTxData(
        "b69bfbd89d1db4c1408d0085a70a8aa3620e6378d66d5832ad537e907dbff0b2"
    );
    const tx = new bsv.Transaction(rawtx);
    const data = TxDecoder.decodeOutput(tx.outputs[0], API_NET.MAIN);
    console.log(data);

    > 
    {
        type: 1,
        satoshis: 4338,
        data: {
            codehash: '777e4dd291059c9f7a0fd563f7204576dcceb791',
            genesis: '5d15eedd93c90d91e0d76de5cc932c833baf8336',
            sensibleId: '3acda780d1f586bf1384772f3b4ee1a3368b9f25e9c4a92b20cef7680dd6e72300000000',
            tokenName: 'TokenSwap Coin\x00\x00\x00\x00\x00\x00',
            tokenSymbol: 'TSC\x00\x00\x00\x00\x00\x00\x00',
            genesisFlag: 0,
            decimalNum: 8,
            tokenAddress: '1FchRhpLKM8GTLGsWFcnDLaH8ChuQLWdpa',
            tokenAmount: BN { negative: 0, words: [Array], length: 2, red: null },
            genesisHash: '06c3447a01ec942361a5bb9b28632b433a2542b0',
            rabinPubKeyHashArrayHash: 'db6719ff663c74e57e2fd5d865582c6060165b54',
            sensibleID: {
            txid: '23e7d60d68f7ce202ba9c4e9259f8b36a3e14e3b2f778413bf86f5d180a7cd3a',
            index: 0
            },
            protoVersion: 1,
            protoType: 1
        }
    }

------------------------------------------------------------------------------

decodeTx
================================

.. code-block:: javascript

    TxDecoder.decodeTx(tx[, network])

Decode transaction

----------
Parameters
----------

* ``tx`` - ``bsv.Transaction``
* ``network`` - :ref:`API_NET<API_NET>`: (Optional)

-------
Returns
-------

``Promise`` returns ``Object``:

* ``txId`` - ``string``
* ``inputs`` - :ref:`DecodedOutput[]<DecodedOutput>`
* ``outputs`` - :ref:`DecodedOutput[]<DecodedOutput>`
* ``fee`` - ``number``

-------
Example
-------

.. code-block:: javascript

    const { bsv, TxDecoder, SensibleApi, API_NET } = sensible;
    const sensibleApi = new SensibleApi(API_NET.MAIN);
    let rawtx = await sensibleApi.getRawTxData(
        "b69bfbd89d1db4c1408d0085a70a8aa3620e6378d66d5832ad537e907dbff0b2"
    );
    const tx = new bsv.Transaction(rawtx);
    const data = TxDecoder.decodeTx(tx, API_NET.MAIN);
    console.log(data);

    > 
    {
        txId: 'b69bfbd89d1db4c1408d0085a70a8aa3620e6378d66d5832ad537e907dbff0b2',
        inputs: [],
        outputs: [
            { type: 1, satoshis: 4338, data: [Object] },
            { type: 1, satoshis: 4338, data: [Object] },
            {
            type: 2,
            satoshis: 72594,
            address: '1GZeGBdgSBKG7FGHrS1XSeoB4rwHEE476R'
            }
        ],
        fee: -81270
    }

Since raw transaction has no inputs data , the example looks strange.
------------------------------------------------------------------------------

