use warp::Filter;
use pqcrypto_dilithium::dilithium5::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct ApiResponse {
    public_key: String,
}

#[tokio::main]
async fn main() {
    let route = warp::path("generate")
        .map(|| {
            let (pk, _sk) = keypair();
            warp::reply::json(&ApiResponse {
                public_key: base64::encode(pk.as_bytes()),
            })
        });

    println!("🚀 QuantumShield API running on http://127.0.0.1:8080");
    warp::serve(route).run(([127, 0, 0, 1], 8080)).await;
}
