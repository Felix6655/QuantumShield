use pqcrypto_dilithium::dilithium5::*;
use serde::{Serialize, Deserialize};
use sled;
use std::fs;
use std::path::Path;
use warp::{Filter, http::Method};
use base64;
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Wallet {
    public_key: String,
    secret_key: String,
    balance: f64,
}

fn init_wallet_dir() {
    let dir = Path::new("./wallet_data");
    if !dir.exists() {
        fs::create_dir_all(dir).unwrap();
    }
}

fn create_wallet() -> Wallet {
    let (pk, sk) = keypair();
    Wallet {
        public_key: base64::encode(pk.as_bytes()),
        secret_key: base64::encode(sk.as_bytes()),
        balance: 0.0,
    }
}

fn save_wallet(wallet: &Wallet) {
    let db = sled::open("wallet_data/db").unwrap();
    db.insert("wallet", serde_json::to_vec(wallet).unwrap()).unwrap();
    db.flush().unwrap();
}

fn load_wallet() -> Wallet {
    let db = sled::open("wallet_data/db").unwrap();
    let bytes = db.get("wallet").unwrap().expect("wallet not found");
    serde_json::from_slice(&bytes).unwrap()
}

fn ensure_wallet() -> Wallet {
    let db = sled::open("wallet_data/db").unwrap();
    if db.get("wallet").unwrap().is_none() {
        let w = create_wallet();
        save_wallet(&w);
        return w;
    }
    load_wallet()
}

fn sign_message(msg: &str, wallet: &Wallet) -> String {
    let sk_bytes = base64::decode(&wallet.secret_key).unwrap();
    let sk = SecretKey::from_bytes(&sk_bytes).unwrap();
    let signed = sign(msg.as_bytes(), &sk);
    base64::encode(signed)
}

fn verify_message(msg: &str, sig_b64: &str, wallet: &Wallet) -> bool {
    let pk_bytes = base64::decode(&wallet.public_key).unwrap();
    let pk = PublicKey::from_bytes(&pk_bytes).unwrap();
    let sig = base64::decode(sig_b64).unwrap();
    let verify_res = open(&sig, &pk);
    match verify_res {
        Ok(plain) => plain == msg.as_bytes(),
        Err(_) => false,
    }
}

#[tokio::main]
async fn main() {
    // Logging
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    init_wallet_dir();
    let wallet = ensure_wallet();
    info!("QuantumShield API starting");

    // CORS
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(&[Method::GET])
        .allow_headers(vec!["content-type"]);

    // Routes
    let get_balance = warp::path("balance").map(move || {
        let w = load_wallet();
        warp::reply::json(&serde_json::json!({
            "public_key": w.public_key,
            "balance": w.balance
        }))
    });

    let sign = warp::path!("sign" / String).map(move |msg| {
        let w = load_wallet();
        let sig = sign_message(&msg, &w);
        warp::reply::json(&serde_json::json!({ "message": msg, "signature": sig }))
    });

    let verify = warp::path!("verify" / String / String).map(move |msg, sig| {
        let w = load_wallet();
        let ok = verify_message(&msg, &sig, &w);
        warp::reply::json(&serde_json::json!({ "verified": ok }))
    });

    let routes = get_balance.or(sign).or(verify).with(cors);

    info!("API on http://127.0.0.1:8080");
    warp::serve(routes).run(([127,0,0,1], 8080)).await;
}
use pqcrypto_dilithium::dilithium5::*;
use serde::{Serialize, Deserialize};
use sled;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
struct Wallet {
    public_key: String,
    secret_key: String,
}

fn init_wallet_dir() {
    let dir = Path::new("./wallet_data");
    if !dir.exists() {
        fs::create_dir_all(dir).unwrap();
    }
}

fn create_wallet() -> Wallet {
    let (pk, sk) = keypair();
    Wallet {
        public_key: base64::encode(pk.as_bytes()),
        secret_key: base64::encode(sk.as_bytes()),
    }
}

fn save_wallet(wallet: &Wallet) {
    let db = sled::open("wallet_data/db").unwrap();
    db.insert("wallet", serde_json::to_vec(wallet).unwrap()).unwrap();
    db.flush().unwrap();
    println!("✅ Wallet created and saved successfully!");
    println!("Public Key: {}", wallet.public_key);
}

fn main() {
    init_wallet_dir();
    let wallet = create_wallet();
    save_wallet(&wallet);
}
