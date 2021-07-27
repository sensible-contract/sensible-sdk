import { bsv } from "scryptlib";
import { dumpTx } from "../common/utils";
import {
  API_NET,
  API_TARGET,
  SensibleApi,
  SensibleApiBase,
} from "../sensible-api";
import { TxComposer } from "../tx-composer";
type RECEIVER = {
  amount: number;
  address: any;
};

type BroadcastOptions = {
  noBroadcast: boolean;
  dump?: boolean;
};
export class Wallet {
  private privateKey: any;
  private address: any;
  feeb: number;
  blockChainApi: SensibleApiBase;
  network: API_NET;

  constructor(
    privwif: string,
    network: API_NET = API_NET.MAIN,
    feeb: number,
    apiTarget: API_TARGET = API_TARGET.SENSIBLE
  ) {
    if (privwif) {
      this.privateKey = new bsv.PrivateKey(privwif, network);
    } else {
      this.privateKey = bsv.PrivateKey.fromRandom(network);
    }
    this.address = this.privateKey.toAddress();
    this.blockChainApi = new SensibleApi(network, apiTarget);
    this.feeb = feeb;
    this.network = network;
  }

  public async getUnspents() {
    return await this.blockChainApi.getUnspents(this.address.toString());
  }

  public async getBalance() {
    let { pendingBalance, balance } = await this.blockChainApi.getBalance(
      this.address.toString()
    );
    return balance + pendingBalance;
  }

  public async send(
    address: string,
    amount: number,
    options?: BroadcastOptions
  ) {
    const txComposer = new TxComposer();
    let utxos = await this.blockChainApi.getUnspents(this.address.toString());
    utxos.forEach((v) => {
      txComposer.appendP2PKHInput({
        address: new bsv.Address(v.address, this.network),
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
      });
    });
    txComposer.appendP2PKHOutput({
      address: new bsv.Address(address, this.network),
      satoshis: amount,
    });
    txComposer.appendChangeOutput(this.address, this.feeb);
    utxos.forEach((v, index) => {
      txComposer.unlockP2PKHInput(this.privateKey, index);
    });

    return await this.broadcastTxComposer(txComposer, options);
  }

  public async sendArray(receivers: RECEIVER[], options?: BroadcastOptions) {
    const txComposer = new TxComposer();
    let utxos = await this.blockChainApi.getUnspents(this.address.toString());
    utxos.forEach((v) => {
      txComposer.appendP2PKHInput({
        address: new bsv.Address(v.address, this.network),
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
      });
    });
    receivers.forEach((v) => {
      txComposer.appendP2PKHOutput({
        address: new bsv.Address(v.address, this.network),
        satoshis: v.amount,
      });
    });
    txComposer.appendChangeOutput(this.address, this.feeb);
    utxos.forEach((v, index) => {
      txComposer.unlockP2PKHInput(this.privateKey, index);
    });

    return await this.broadcastTxComposer(txComposer, options);
  }

  public async merge(options?: BroadcastOptions) {
    const txComposer = new TxComposer();
    let utxos = await this.blockChainApi.getUnspents(this.address.toString());
    utxos.forEach((v) => {
      txComposer.appendP2PKHInput({
        address: new bsv.Address(v.address, this.network),
        txId: v.txId,
        outputIndex: v.outputIndex,
        satoshis: v.satoshis,
      });
    });

    txComposer.appendChangeOutput(this.address, this.feeb);
    utxos.forEach((v, index) => {
      txComposer.unlockP2PKHInput(this.privateKey, index);
    });

    return await this.broadcastTxComposer(txComposer, options);
  }

  private async broadcastTxComposer(
    txComposer: TxComposer,
    options?: BroadcastOptions
  ) {
    const { noBroadcast, dump } = options || {};
    if (dump) {
      dumpTx(txComposer.getTx(), this.network);
    }
    if (noBroadcast) {
      return txComposer;
    }

    await this.blockChainApi.broadcast(txComposer.getRawHex());
    return txComposer;
  }
}
