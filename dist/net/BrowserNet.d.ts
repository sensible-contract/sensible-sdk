declare type ReqConfig = {
    uri?: string;
    method?: string;
    timeout?: number;
    body?: any;
};
declare type HttpConfig = {
    contentType?: string;
    timeout?: number;
    authorization?: string;
};
export declare class BrowserNet {
    static _xmlRequest(reqConfig: ReqConfig, callback: Function): void;
    static httpGet(url: string, params: any, cb?: Function): Promise<unknown>;
    static httpPost(url: string, params: any, cb?: Function, config?: HttpConfig): Promise<unknown>;
}
export {};
