use crate::nlp::*;
use itertools::Itertools;
use serde::Deserialize;
use std::collections::HashMap;
use std::convert::Infallible;
use tokio::task;
use warp::Filter;

/// Get completions and package them up in a JSON
async fn generate_handler_fn(
    query: Query,
    model: Model,
    tokenizer: Tokenizer,
) -> Result<impl warp::Reply, Infallible> {
    let output = generate(query, model, tokenizer).await;
    let mut response = HashMap::new();
    response.insert("output", output);

    Ok(warp::reply::json(&response))
}

/// Get search results and package them up in a JSON
async fn search_handler_fn(
    query: Query,
    model: Model,
    tokenizer: Tokenizer,
) -> Result<impl warp::Reply, Infallible> {
    let context = query.context.clone().unwrap();
    let output = generate(query, model, tokenizer).await;
    let idx: Vec<usize> = output
        .iter()
        .map(|quote| {
            context
                .iter()
                .position(|source| source.contains(quote))
                .unwrap()
        })
        .unique()
        .collect();

    let mut response = HashMap::new();
    response.insert("output", idx);

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
fn with_model(
    model: Model,
) -> impl Filter<Extract = (Model,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || model.clone())
}

/// Reuse loaded tokenizer on each request
fn with_tokenizer(
    tokenizer: Tokenizer,
) -> impl Filter<Extract = (Tokenizer,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || tokenizer.clone())
}

fn json_body() -> impl Filter<Extract = (Query,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(1024 * 16).and(warp::body::json())
}

/// Load model and tokenizer, define handlers, serve
pub async fn serve() {
    let tokenizer: Tokenizer = task::spawn_blocking(move || {
        let c = model_config();
        let t = tokenizer(c);
        t
    })
    .await
    .expect("Working");

    let model: Model = task::spawn_blocking(move || {
        let c = model_config();
        let m = model(c);
        m
    })
    .await
    .expect("Working");

    println!("Loaded config and model");

    let generate_handler = warp::path!("generate")
        .and(warp::post())
        .and(json_body())
        .and(with_model(model.clone()))
        .and(with_tokenizer(tokenizer.clone()))
        .and_then(generate_handler_fn);

    let search_handler = warp::path!("search")
        .and(warp::post())
        .and(json_body())
        .and(with_model(model.clone()))
        .and(with_tokenizer(tokenizer.clone()))
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
