declare module "node:crypto" {
  export interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(): Uint8Array;
    digest(encoding: "hex"): string;
  }

  export interface Hmac {
    update(data: string | Uint8Array): Hmac;
    digest(): Uint8Array;
    digest(encoding: "hex"): string;
  }

  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Uint8Array): Hmac;
  export function randomBytes(size: number): Uint8Array;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

interface PiaxisBufferLike extends Uint8Array {
  toString(encoding?: string): string;
}

declare const Buffer: {
  from(data: string | ArrayLike<number> | ArrayBufferView, encoding?: string): PiaxisBufferLike;
  concat(chunks: readonly Uint8Array[]): PiaxisBufferLike;
};
