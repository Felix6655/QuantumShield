use sha3::{Digest, Keccak256};
use serde::{Serialize, Deserialize};
use rand::RngCore;
use zeroize::Zeroize;

// --- encryption bits ---
use aes_gcm::{Aes256Gcm, KeyInit, aead::{Aead, OsRng, generic_array::GenericArray}};
use argon2::{Argon2, password_hash::SaltString, Algorithm, Params, Version};
use aead::AeadCore;

#[derive(Serialize, Deserialize, Clone)]
pub struct DilithiumKeypair { pub public: Vec<u8>, pub secret: Vec<u8> }

#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedKeyfile {
    pub kdf: String,        // "argon2id"
    pub salt_b64: String,
    pub nonce_b64: String,
    pub ct_b64: String,     // ciphertext of secret key bytes
    pub public_hex: String, // convenience
}

// ---------------- PQ (Dilithium) ----------------
#[cfg(feature = "pq")]
mod pq_impl {
    pub use pqcrypto_dilithium::dilithium3::{
        keypair, sign, open, PublicKey, SecretKey, SignedMessage,
    };
    pub use pqcrypto_traits::sign::{
        PublicKey as PublicKeyTrait,
        SecretKey as SecretKeyTrait,
        SignedMessage as SignedMessageTrait,
        Message as MessageTrait,
    };
}
#[cfg(feature = "pq")]
use pq_impl::*;

// ---------------- Ed25519 fallback ----------------
#[cfg(feature = "ed25519")]
mod ed_impl {
    use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
    use rand_core::OsRng;

    pub fn keypair() -> (Vec<u8>, Vec<u8>) {
        let sk = SigningKey::generate(&mut OsRng);
        let vk = VerifyingKey::from(&sk);
        (vk.to_bytes().to_vec(), sk.to_bytes().to_vec())
    }
    pub fn sign(msg: &[u8], sk_bytes: &[u8]) -> Vec<u8> {
        let sk = SigningKey::from_bytes(sk_bytes.try_into().expect("bad sk len"));
        let sig: Signature = sk.sign(msg);
        // concat: sig || msg (to mimic SignedMessage style)
        [sig.to_bytes().to_vec(), msg.to_vec()].concat()
    }
    pub fn open(signed: &[u8], pk_bytes: &[u8]) -> Option<Vec<u8>> {
        use ed25519_dalek::{Signature, VerifyingKey, Verifier};
        if signed.len() < 64 { return None; }
        let (sig_bytes, msg) = signed.split_at(64);
        let sig = Signature::from_bytes(sig_bytes.try_into().ok()?);
        let vk = VerifyingKey::from_bytes(pk_bytes.try_into().ok()?).ok()?;
        vk.verify(msg, &sig).ok()?;
        Some(msg.to_vec())
    }
}
#[cfg(feature = "ed25519")]
use ed_impl::*;

pub fn generate_dilithium3() -> DilithiumKeypair {
    #[cfg(feature = "pq")]
    {
        let (pk, sk) = keypair();
        DilithiumKeypair { public: pk.as_bytes().to_vec(), secret: sk.as_bytes().to_vec() }
    }
    #[cfg(feature = "ed25519")]
    {
        let (pk, sk) = keypair();
        DilithiumKeypair { public: pk, secret: sk }
    }
}

pub fn address_from_pubkey(pubkey: &[u8]) -> String {
    let mut h = Keccak256::new();
    h.update(pubkey);
    let hash = h.finalize();
    let addr = &hash[hash.len()-20..];
    format!("QS{}", hex::encode(addr))
}

pub fn sign_message(secret: &[u8], msg: &[u8]) -> Vec<u8> {
    #[cfg(feature = "pq")]
    {
        let sk = SecretKey::from_bytes(secret).expect("invalid secret key");
        let sm: SignedMessage = sign(msg, &sk);
        return sm.as_bytes().to_vec();
    }
    #[cfg(feature = "ed25519")]
    {
        return ed_impl::sign(msg, secret);
    }
}

pub fn verify_message(public: &[u8], signed: &[u8]) -> Option<Vec<u8>> {
    #[cfg(feature = "pq")]
    {
        let pk = PublicKey::from_bytes(public).ok()?;
        let sm = SignedMessage::from_bytes(signed).ok()?;
        let m = open(&sm, &pk).ok()?;
        return Some(m.as_bytes().to_vec());
    }
    #[cfg(feature = "ed25519")]
    {
        return ed_impl::open(signed, public);
    }
}

// -------- keystore helpers (common) --------
fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let params = Params::new(32, 3, 1, None).expect("argon2 params");
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8; 32];
    argon.hash_password_into(password.as_bytes(), salt, &mut out).expect("kdf");
    out
}

pub fn encrypt_secret(public: &[u8], secret: &[u8], password: &str) -> EncryptedKeyfile {
    let mut salt = [0u8; 16]; OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 12 bytes
    let ct = cipher.encrypt(&nonce, secret).expect("encrypt");

    let ek = EncryptedKeyfile {
        kdf: "argon2id".to_string(),
        salt_b64: base64::encode(salt),
        nonce_b64: base64::encode(nonce),
        ct_b64: base64::encode(ct),
        public_hex: hex::encode(public),
    };
    let mut key_z = key; key_z.zeroize();
    ek
}

pub fn decrypt_secret(ek: &EncryptedKeyfile, password: &str) -> Option<Vec<u8>> {
    let salt = base64::decode(&ek.salt_b64).ok()?;
    let nonce = base64::decode(&ek.nonce_b64).ok()?;
    let ct = base64::decode(&ek.ct_b64).ok()?;
    let key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&key));
    let pt = cipher.decrypt(GenericArray::from_slice(&nonce), ct.as_ref()).ok()?;
    let mut key_z = key; key_z.zeroize();
    Some(pt)
}
