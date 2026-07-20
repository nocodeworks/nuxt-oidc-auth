interface Base64Options {
    dataURL?: boolean;
    urlSafe?: boolean;
}
export declare function textToBase64(text: string, options?: Base64Options): string;
export declare function arrayBufferToBase64(buffer: ArrayBuffer, options?: Base64Options): string;
export declare function base64ToText(input: string, _options?: Base64Options): string;
export declare function base64ToUint8Array(input: string): Uint8Array;
export declare function uint8ArrayToBase64(input: Uint8Array, options?: Base64Options): string;
export {};
