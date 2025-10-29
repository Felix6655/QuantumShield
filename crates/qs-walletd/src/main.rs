use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, path::PathBuf, sync::Arc, fs, time::Duration};
use tower_http::cors::{Any, CorsLayer};
use http::HeaderValue;
// simple readiness: wallet dir exists + r/w works + quick crypto self-check
async fn readyz() -> Result<&'static str, (axum::http::StatusCode, String)> {
    // 1) wallet dir
    let root = qs_utils::ensure_wallet_dir().map_err(internal)?;

    // 2) r/w check
    let probe = root.join(".readyz.tmp");
    fs::write(&probe, b"ok").map_err(internal)?;
    fs::remove_file(&probe).ok();

    // 3) quick crypto self-check (sign/open roundtrip)
    let kp = qs_crypto::generate_dilithium3();
    let sig = qs_crypto::sign_message(&kp.secret, b"probe");
    let opened = qs_crypto::verify_message(&kp.public, &sig).ok_or_else(|| internal("verify failed"))?;
    if opened.as_slice() != b"probe" {
        return Err(internal("crypto roundtrip mismatch"));
    }

    Ok("ready")
}

use qs_crypto::{
    DilithiumKeypair, EncryptedKeyfile, address_from_pubkey, decrypt_secret, encrypt_secret,
    generate_dilithium3, sign_message, verify_message,
};
use qs_utils::{ensure_wallet_dir, read_json, wallet_dir, write_json};

#[derive(Clone)]
struct AppState {
    _root: PathBuf,
}

#[derive(Deserialize)] struct NewWalletReq { name: String, password: String }
#[derive(Serialize)]   struct NewWalletRes { name: String, address: String }
#[derive(Serialize)]   struct AddressRes   { address: String }
#[derive(Deserialize)] struct SignReq      { password: String, message: String }
#[derive(Serialize)]   struct SignRes      { signed_hex: String }
#[derive(Deserialize)] struct VerifyReq    { signed_hex: String }
#[derive(Serialize)]   struct VerifyRes    { ok: bool, message: Option<String> }

fn wallet_path(name: &str) -> PathBuf {
    let mut p = wallet_dir();
    p.push(format!("{name}.json"));
    p
}

async fn healthz() -> &'static str { "ok" }

async fn new_wallet(
    State(_st): State<Arc<AppState>>,
    Json(req): Json<NewWalletReq>,
) -> Result<Json<NewWalletRes>, (axum::http::StatusCode, String)> {
    ensure_wallet_dir().map_err(internal)?;
    let kp: DilithiumKeypair = generate_dilithium3();
    let ek: EncryptedKeyfile = encrypt_secret(&kp.public, &kp.secret, &req.password);
    write_json(wallet_path(&req.name), &ek).map_err(internal)?;
    let addr = address_from_pubkey(&kp.public);
    Ok(Json(NewWalletRes { name: req.name, address: addr }))
}

async fn get_address(Path(name): Path<String>) -> Result<Json<AddressRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    let pub_bytes = hex::decode(&ek.public_hex).map_err(bad_request)?;
    Ok(Json(AddressRes { address: address_from_pubkey(&pub_bytes) }))
}

async fn sign(
    Path(name): Path<String>,
    Json(req): Json<SignReq>,
) -> Result<Json<SignRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    let secret = decrypt_secret(&ek, &req.password).ok_or_else(|| unauthorized("bad password"))?;
    Ok(Json(SignRes { signed_hex: hex::encode(sign_message(&secret, req.message.as_bytes())) }))
}

async fn verify(
    Path(name): Path<String>,
    Json(req): Json<VerifyReq>,
) -> Result<Json<VerifyRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    let public = hex::decode(&ek.public_hex).map_err(bad_request)?;
    let signed = hex::decode(&req.signed_hex).map_err(bad_request)?;
    match verify_message(&public, &signed) {
        Some(m) => Ok(Json(VerifyRes { ok: true, message: Some(String::from_utf8_lossy(&m).to_string()) })),
        None => Ok(Json(VerifyRes { ok: false, message: None })),
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let root = ensure_wallet_dir()?;
    let state = Arc::new(AppState { _root: root });

    let cors = CorsLayer::new()
        .allow_origin(HeaderValue::from_static("http://localhost:3000"))
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz",  get(readyz))
        .route("/wallets", post(new_wallet))
        .route("/wallets/:name/address", get(get_address))
        .route("/wallets/:name/sign",    post(sign))
        .route("/wallets/:name/verify",  post(verify))
        .with_state(state)
        .layer(cors);

    let addr: SocketAddr = ([127, 0, 0, 1], 8787).into();
    println!("qs-walletd listening on http://{addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}

// error mappers
fn internal<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("{e}"))
}
fn not_found<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::NOT_FOUND, format!("{e}"))
}
fn bad_request<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::BAD_REQUEST, format!("{e}"))
}
fn unauthorized(msg: &str) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::UNAUTHORIZED, msg.to_string())
}
use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc, path::PathBuf};
use tower_http::cors::{Any, CorsLayer};
use qs_crypto::{
    DilithiumKeypair, EncryptedKeyfile, generate_dilithium3, address_from_pubkey,
    encrypt_secret, decrypt_secret, sign_message, verify_message,
};
use qs_utils::{ensure_wallet_dir, wallet_dir, write_json, read_json,};
use anyhow::{Result, anyhow};

#[derive(Clone)]
struct AppState {
    _root: PathBuf,
}

#[derive(Deserialize)]
struct NewWalletReq { name: String, password: String }
#[derive(Serialize)]
struct NewWalletRes { name: String, address: String }

#[derive(Serialize)]
struct AddressRes { address: String }

#[derive(Deserialize)]
struct SignReq { password: String, message: String }
#[derive(Serialize)]
struct SignRes { signed_hex: String }

#[derive(Deserialize)]
struct VerifyReq { signed_hex: String }
#[derive(Serialize)]
struct VerifyRes { ok: bool, message: Option<String> }

fn wallet_path(name: &str) -> PathBuf {
    let mut p = wallet_dir(); p.push(format!("{name}.json")); p
}

async fn new_wallet(State(st): State<Arc<AppState>>, Json(req): Json<NewWalletReq>) -> Result<Json<NewWalletRes>, (axum::http::StatusCode, String)> {
    ensure_wallet_dir().map_err(internal)?;
    let kp: DilithiumKeypair = generate_dilithium3();
    let ek: EncryptedKeyfile = encrypt_secret(&kp.public, &kp.secret, &req.password);
    let path = wallet_path(&req.name); 
    write_json(path, &ek).map_err(internal)?;
    let addr = address_from_pubkey(&kp.public);
    Ok(Json(NewWalletRes { name: req.name, address: addr }))
}

async fn get_address(Path(name): Path<String>) -> Result<Json<AddressRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    // stored as hex of pubkey
    let pub_bytes = hex::decode(&ek.public_hex).map_err(bad_request)?;
    let addr = address_from_pubkey(&pub_bytes);
    Ok(Json(AddressRes { address: addr }))
}

async fn sign(Path(name): Path<String>, Json(req): Json<SignReq>) -> Result<Json<SignRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    let secret = decrypt_secret(&ek, &req.password).ok_or_else(|| unauthorized("bad password"))?;
    let sig = sign_message(&secret, req.message.as_bytes());
    Ok(Json(SignRes { signed_hex: hex::encode(sig) }))
}

async fn verify(Path(name): Path<String>, Json(req): Json<VerifyReq>) -> Result<Json<VerifyRes>, (axum::http::StatusCode, String)> {
    let ek: EncryptedKeyfile = read_json(wallet_path(&name)).map_err(not_found)?;
    let public = hex::decode(&ek.public_hex).map_err(bad_request)?;
    let signed = hex::decode(&req.signed_hex).map_err(bad_request)?;
    match verify_message(&public, &signed) {
        Some(m) => Ok(Json(VerifyRes { ok: true, message: Some(String::from_utf8_lossy(&m).to_string()) })),
        None    => Ok(Json(VerifyRes { ok: false, message: None })),
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let root = ensure_wallet_dir()?;
    let state = Arc::new(AppState { _root: root });

    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any); // local apps; if you want stricter, set a specific origin list

    let app = Router::new()
        .route("/wallets", post(new_wallet))
        .route("/wallets/:name/address", get(get_address))
        .route("/wallets/:name/sign", post(sign))
        .route("/wallets/:name/verify", post(verify))
        .route("/healthz", get(|| async { "ok" }))
        .with_state(state)
        .layer(cors);

    // Bind to localhost only
    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    println!("qs-walletd listening on http://{addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}

// --- small helpers to map errors to http ---
fn internal<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("{e}"))
}
fn not_found<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::NOT_FOUND, format!("{e}"))
}
fn bad_request<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::BAD_REQUEST, format!("{e}"))
}
fn unauthorized(msg: &str) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::UNAUTHORIZED, msg.to_string())
}
