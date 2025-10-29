declare module "qs-wallet-wasm" {
  export function dilithium2_keypair(): [string, string];
  export function dilithium2_sign_and_verify(message: string): [string, string, boolean];
}
