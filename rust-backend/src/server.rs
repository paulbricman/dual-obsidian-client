use crate::nlp::*;
use serde::Deserialize;
use std::collections::HashMap;
use std::convert::Infallible;
use tokio::task;
use warp::Filter;

/// Get completions and package them up in a JSON
async fn generate_handler_fn(
    query: Query,
    gen_model: GenModel,
    tokenizer: Tokenizer,
) -> Result<impl warp::Reply, Infallible> {
    let output = generate(query, gen_model, tokenizer).await;
    let mut response = HashMap::new();
    response.insert("output", output);

    Ok(warp::reply::json(&response))
}

/// Get search results and package them up in a JSON
async fn search_handler_fn(
    query: Query,
    emb_model: EmbModel,
) -> Result<impl warp::Reply, Infallible> {
    let mut response = HashMap::new();
    response.insert("output", search(query, emb_model).await);

    Ok(warp::reply::json(&response))
}

/// Houses JSON request body for both generate and search requests
#[derive(Debug, Deserialize)]
pub struct Query {
    pub prompt: String,
    pub generate_sentences: Option<usize>,
    pub generate_paragraphs: Option<usize>,
    pub context: Option<Vec<String>>,
}

/// Reuse loaded model on each request
fn with_gen_model(
    model: GenModel,
) -> impl Filter<Extract = (GenModel,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || model.clone())
}

fn with_emb_model(
    model: EmbModel,
) -> impl Filter<Extract = (EmbModel,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || model.clone())
}

/// Reuse loaded tokenizer on each request
fn with_tokenizer(
    tokenizer: Tokenizer,
) -> impl Filter<Extract = (Tokenizer,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || tokenizer.clone())
}

fn json_body() -> impl Filter<Extract = (Query,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(1024 * 512).and(warp::body::json())
}

/// Load model and tokenizer, define handlers, serve
pub async fn serve() {
    let tokenizer: Tokenizer = task::spawn_blocking(move || {
        let c = gen_model_config();
        let t = tokenizer(c);
        t
    })
    .await
    .expect("Working");

    let gen_model: GenModel = task::spawn_blocking(move || {
        let c = gen_model_config();
        let m = gen_model(c);
        m
    })
    .await
    .expect("Working");

    let emb_model: EmbModel = task::spawn_blocking(move || {
        let m = emb_model();
        m
    })
    .await
    .expect("Working");

    println!("Loaded models.");

    let generate_handler = warp::path!("generate")
        .and(warp::post())
        .and(json_body())
        .and(with_gen_model(gen_model.clone()))
        .and(with_tokenizer(tokenizer.clone()))
        .and_then(generate_handler_fn);

    let search_handler = warp::path!("search")
        .and(warp::post())
        .and(json_body())
        .and(with_emb_model(emb_model.clone()))
        .and_then(search_handler_fn);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["POST"]);

    println!("Starting to serve...");
    warp::serve(generate_handler.or(search_handler).with(cors))
        .run(([127, 0, 0, 1], 3030))
        .await;
}
