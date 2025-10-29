use reqwest::Client;
use serde_json::json;

pub async fn send_to_novatok(pubkey: &str, amount: f64) -> Result<(), reqwest::Error> {
    let client = Client::new();
    let body = json!({
        "public_key": pubkey,
        "amount": amount,
        "network": "solana",
        "token": "NOVA"
    });

    let res = client
        .post("https://api.novatok.tech/bridge") // placeholder
        .json(&body)
        .send()
        .await?;

    println!("🌉 Bridge Response: {:?}", res.status());
    Ok(())
}
