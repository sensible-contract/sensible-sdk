declare type HttpConfig = {
    contentType?: string;
    timeout?: number;
    authorization?: string;
};
export declare class ServerNet {
    static httpGet(url: string, params: any, cb?: Function): Promise<unknown>;
    static httpPost(url: string, params: any, cb?: Function, config?: HttpConfig): Promise<unknown>;
}
export {};
