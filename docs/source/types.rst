.. _types:

.. _API_NET:

API_NET
=====================
.. code-block:: javascript

    enum API_NET {
        MAIN = "mainnet",
        TEST = "testnet",
    }

.. _API_TARGET:

API_TARGET
=====================
.. code-block:: javascript
    enum API_TARGET {
        SENSIBLE = "sensible",
        METASV = "metasv",
        SHOW = "show",
    }

.. _ParamUtxo:

ParamUtxo
=====================
.. code-block:: javascript

    type ParamUtxo = {
        txId: string;
        outputIndex: number;
        satoshis: number;
        wif?: string;
        address?: string | bsv.Address;
    };


.. _ParamFtUtxo:

ParamFtUtxo
=====================
.. code-block:: javascript

    type ParamFtUtxo = {
        txId: string;
        outputIndex: number;
        tokenAddress: string;
        tokenAmount: string;
        wif?: string;
    };

.. _TokenReceiver:

TokenReceiver
=====================
.. code-block:: javascript

    type TokenReceiver = {
        address: string;
        amount: string;
    };

.. _SigHashInfo:

SigHashInfo
=====================
.. code-block:: javascript

    type SigHashInfo = {
        sighash: string;
        sighashType: number;
        address: string;
        inputIndex: number;
        contractType: CONTRACT_TYPE;
    };

.. _SigInfo:

SigInfo
=====================
.. code-block:: javascript

    type SigInfo = {
        sig: string;
        publicKey: string | bsv.PublicKey;
    };

.. _FungibleTokenUnspent:

FungibleTokenUnspent
=====================
.. code-block:: javascript

    type FungibleTokenUnspent = {
        txId: string;
        outputIndex: number;
        tokenAddress: string;
        tokenAmount: string;
    };


.. _FungibleTokenSummary:

FungibleTokenSummary
=====================
.. code-block:: javascript

    type FungibleTokenSummary = {
        codehash: string;
        genesis: string;
        sensibleId: string;
        pendingBalance: string;
        balance: string;
        symbol: string;
        decimal: number;
    };

.. _SignerConfig:

SignerConfig
=====================
.. code-block:: javascript

    type SignerConfig = {
        satotxApiPrefix: string;
        satotxPubKey: string;
    }


.. _SensibleID:

SensibleID
=====================
.. code-block:: javascript

    type SensibleID = {
        txid: string;
        index: number;
    };

.. _NftSellUtxo:

NftSellUtxo
=====================
.. code-block:: javascript

    type NftSellUtxo = {
        codehash: string;
        genesis: string;
        tokenIndex: string;
        txId: string;
        outputIndex: number;
        sellerAddress: string;
        satoshisPrice: number;
    };




.. _SellUtxo:

SellUtxo
=====================
.. code-block:: javascript

    type SellUtxo = {
        txId: string;
        outputIndex: number;
        sellerAddress: string;
        satoshisPrice: number;
    };

.. _MetaidOutpoint:

MetaidOutpoint
=====================
.. code-block:: javascript

    type MetaidOutpoint = {
        txid: string;
        index: number;
    };

.. _signSigHashList:

signSigHashList
=====================
.. code-block:: javascript

    function signSigHashList(sigHashList: SigHashInfo[]) {
        let sigList = sigHashList.map(({ sighash, sighashType, address }) => {
            let privateKey = wallets.find((v) => v.address.toString() == address).privateKey;
            var sig = bsv.crypto.ECDSA.sign(
                Buffer.from(sighash, "hex"),
                privateKey,
                "little"
            ).set({
                nhashtype: sighashType,
            }).toString();
            return {
                sig,
                publicKey: privateKey.toPublicKey(),
            };
        });
        return sigList;
    }

.. _defaultSignerConfigs:

defaultSignerConfigs
=====================
.. code-block:: javascript

    const defaultSignerConfigs: SignerConfig[] = [
        {
            satotxApiPrefix: "https://s1.satoplay.cn,https://s1.satoplay.com",
            satotxPubKey:
            "2c8c0117aa5edba9a4539e783b6a1bdbc1ad88ad5b57f3d9c5cba55001c45e1fedb877ebc7d49d1cfa8aa938ccb303c3a37732eb0296fee4a6642b0ff1976817b603404f64c41ec098f8cd908caf64b4a3aada220ff61e252ef6d775079b69451367eda8fdb37bc55c8bfd69610e1f31b9d421ff44e3a0cfa7b11f334374827256a0b91ce80c45ffb798798e7bd6b110134e1a3c3fa89855a19829aab3922f55da92000495737e99e0094e6c4dbcc4e8d8de5459355c21ff055d039a202076e4ca263b745a885ef292eec0b5a5255e6ecc45534897d9572c3ebe97d36626c7b1e775159e00b17d03bc6d127260e13a252afd89bab72e8daf893075f18c1840cb394f18a9817913a9462c6ffc8951bee50a05f38da4c9090a4d6868cb8c955e5efb4f3be4e7cf0be1c399d78a6f6dd26a0af8492dca67843c6da9915bae571aa9f4696418ab1520dd50dd05f5c0c7a51d2843bd4d9b6b3b79910e98f3d98099fd86d71b2fac290e32bdacb31943a8384a7668c32a66be127b74390b4b0dec6455",
        },
        {
            satotxApiPrefix: "https://satotx.showpay.top,https://cnsatotx.showpay.top",
            satotxPubKey:
            "5b94858991d384c61ffd97174e895fcd4f62e4fea618916dc095fe4c149bbdf1188c9b33bc15cbe963a63b2522e70b80a5b722ac0e6180407917403755df4de27d69cc115c683a99face8c823cbccf73c7f0d546f1300b9ee2e96aea85542527f33b649f1885caebe19cf75d9a645807f03565c65bd4c99c8f6bb000644cfb56969eac3e9331c254b08aa279ceb64c47ef66be3f071e28b3a5a21e48cdfc3335d8b52e80a09a104a791ace6a2c1b4da88c52f9cc28c54a324e126ec91a988c1fe4e21afc8a84d0e876e01502386f74e7fc24fc32aa249075dd222361aea119d4824db2a797d58886e93bdd60556e504bb190b76a451a4e7b0431973c0410e71e808d0962415503931bbde3dfce5186b371c5bf729861f239ef626b7217d071dfd62bac877a847f2ac2dca07597a0bb9dc1969bed40606c025c4ff7b53a4a6bd921642199c16ede8165ed28da161739fa8d33f9f483212759498c1219d246092d14c9ae63808f58f03c8ca746904ba51fa326d793cea80cda411c85d35894bdb5",
        },
        {
            satotxApiPrefix: "https://satotx.volt.id",
            satotxPubKey:
            "3a62ce90c189ae322150cfc68cd00739cd681babf46a9b27793413ad780ea7c4ef22afd0042bc3711588587c2b8a953ced78496cb95579b1272b8979183ea3c66d204c8eeffebfa115c596c0c561f3569fe6d6e8e06d7e82192a24a84b739838ac846db8594a565679d617695f184eb85a3902a036eb8e82f95b83acc207f0deeac87291539865765899d97cfe41169c555480372195729269ae30b6c39324a6731d6f4e46da5ba1789c6e9bd14b16426d35fd4449eecd177e2834e87fb65d9d469176ffe0c12097fcc7e2393dbaa504631487a3ad725235b4d25fe3d09c2460f8a6c0bf4defc1ffe65d5fa28e85fae11eace2a66e48a0ae2ed6bcfb4bb94296717a4a5b1b3fa9b0fb3c165e517b9b69fa8aaca7fdc7351a0ac14d110258f442f423a780bebd87ac10173ca00ee4e9f56ced0510e7f53ed41411b91286f288438c361d2a15868d1c84d6a73510ef23eee9312ae2a7162c1fcd5438788236c0571ee822c326ebd123b8a6636e7b192db2911725a20da027bfaa79c33f58174285",
        },
        {
            satotxApiPrefix: "https://satotx.metasv.com",
            satotxPubKey:
            "19d9193ee2e95d09445d28408e8a3da730b2d557cd8d39a7ae4ebbfbceb17ed5d745623529ad33d043511f3e205c1f92b6322833424d19823c3b611b3adabb74e1006e0e93a8f1e0b97ab801c6060a4c060f775998d9f003568ab4ea7633a0395eb761c36106e229394f2c271b8522a44a5ae759254f5d22927923ba85b3729460ecccca07a5556299aa7f2518814c74a2a4d48b48013d609002631f2d93c906d07077ef58d473e3d971362d1129c1ab9b8f9b1365519f0c023c1cadad5ab57240d19e256e08022fd0708951ff90a8af0655aff806c6382d0a72c13f1e52b88222d7dfc6357179b06ffcf937f9da3b0419908aa589a731e26bbaba2fa0b754bf722e338c5627b11dc24aadc4d83c35851c034936cf0df18167e856a5f0a7121d23cd48b3f8a420869a37bd1362905d7f76ff18a991f75a0f9d1bcfc18416d76691cc357cbdcc8cc0df9dbd9318a40e08adb2fb4e78b3c47bdf07eeed4f3f4e0f7e81e37460a09b857e0194c72ec03bb564b5b409d8a1b84c153186ecbb4cfdfd",
        },
        {
            satotxApiPrefix: "https://satotx.tswap.io",
            satotxPubKey:
            "a36531727b324b34baef257d223b8ba97bac06d6b631cccb271101f20ef1de2523a0a3a5367d89d98ff354fe1a07bcfb00425ab252950ce10a90dc9040930cf86a3081f0c68ea05bfd40aab3e8bfaaaf6b5a1e7a2b202892dc9b1c0fe478210799759b31ee04e842106a58d901eb5bc538c1b58b7eb774a382e7ae0d6ed706bb0b12b9b891828da5266dd9f0b381b05ecbce99fcde628360d281800cf8ccf4630b2a0a1a25cf4d103199888984cf61edaa0dad578b80dbce25b3316985a8f846ada9bf9bdb8c930e2a43e69994a9b15ea33fe6ee29fa1a6f251f8d79a5de9f1f24152efddedc01b63e2f2468005ecce7da382a64d7936b22a7cac697e1b0a48419101a802d3be554a9b582a80e5c5d8b998e5eb9684c7aaf09ef286d3d990c71be6e3f3340fdaeb2dac70a0be928b6de6ef79f353c868def3385bccd36aa871eb7c8047d3f10b0a38135cdb3577eaafa512111a7af088e8f77821a27b195c95bf80da3c59fda5ff3dd1d40f60d61c099a608b58b6de4a76146cf7b89444c1055",
        },
    ];

.. _AuthorizationOption:

AuthorizationOption
=====================
.. code-block:: javascript

    type AuthorizationOption = {
        authorization?: string;
        privateKey?: any;
    };

.. _FungibleTokenBalance:

FungibleTokenBalance
=====================
.. code-block:: javascript

    type FungibleTokenBalance = {
        balance: string;
        pendingBalance: string;
        utxoCount: number;
        decimal: number;
    };

.. _NonFungibleTokenUnspent:

NonFungibleTokenUnspent
=======================
.. code-block:: javascript

    type NonFungibleTokenUnspent = {
        txId: string;
        outputIndex: number;
        tokenAddress: string;
        tokenIndex: string;
        metaTxId: string;
        metaOutputIndex: number;
    };

.. _NonFungibleTokenSummary:

NonFungibleTokenSummary
=======================
.. code-block:: javascript

    type NonFungibleTokenSummary = {
        codehash: string;
        genesis: string;
        sensibleId: string;
        count: string;
        pendingCount: string;
        metaTxId: string;
        metaOutputIndex: number;
        supply: string;
    };



.. _OutputType:

OutputType
=======================
.. code-block:: javascript

    enum OutputType {
        SENSIBLE_NFT,
        SENSIBLE_FT,
        P2PKH,
        OP_RETURN,
        UNKNOWN,
    }

.. _DecodedOutput:

DecodedOutput
=======================
.. code-block:: javascript

    type DecodedOutput = {
        type: OutputType;
        satoshis: number;
        data?: any;
        address?: string;
    };

