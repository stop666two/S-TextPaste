/// <reference types="vite/client" />

// Override Cloudflare workers-types Web Crypto API to match standard DOM types
declare global {
  interface CryptoKeyPair {
    publicKey: CryptoKey
    privateKey: CryptoKey
  }
}

// Fix BufferSource type incompatibility with Cloudflare types
declare global {
  interface CryptoKey {
    readonly algorithm: KeyAlgorithm
    readonly extractable: boolean
    readonly type: KeyType
    readonly usages: KeyUsage[]
  }
}

export {}
