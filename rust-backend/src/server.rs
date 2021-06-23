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
    textgen_model: TextGenModel,
    textgen_tokenizer: TextGenTokenizer,
) -> Result<impl warp::Reply, Infallible> {
    let textgen_output = generate(query, textgen_model, textgen_tokenizer).await;
    let mut response = HashMap::new();
    response.insert("output", textgen_output);

    Ok(warp::reply::json(&response))
}

/// Get search results and package them up in a JSON
async fn search_handler_fn(
    query: Query,
    textgen_model: TextGenModel,
    textgen_tokenizer: TextGenTokenizer,
) -> Result<impl warp::Reply, Infallible> {
    let context = query.context.clone().unwrap();
    let textgen_output = generate(query, textgen_model, textgen_tokenizer).await;
    let idx: Vec<usize> = textgen_output
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
    textgen_model: TextGenModel,
) -> impl Filter<Extract = (TextGenModel,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || textgen_model.clone())
}

/// Reuse loaded tokenizer on each request
fn with_tokenizer(
    textgen_tokenizer: TextGenTokenizer,
) -> impl Filter<Extract = (TextGenTokenizer,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || textgen_tokenizer.clone())
}

fn json_body() -> impl Filter<Extract = (Query,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(1024 * 16).and(warp::body::json())
}

/// Load model and tokenizer, define handlers, serve
pub async fn serve() {
    let textgen_tokenizer: TextGenTokenizer = task::spawn_blocking(move || {
        let c = textgen_model_config();
        let t = textgen_tokenizer(c);
        t
    })
    .await
    .expect("Working");

    let textgen_model: TextGenModel = task::spawn_blocking(move || {
        let c = textgen_model_config();
        let m = textgen_model(c);
        m
    })
    .await
    .expect("Working");

    println!("Loaded config and model");

    let generate_handler = warp::path!("generate")
        .and(warp::post())
        .and(json_body())
        .and(with_model(textgen_model.clone()))
        .and(with_tokenizer(textgen_tokenizer.clone()))
        .and_then(generate_handler_fn);

    let search_handler = warp::path!("search")
        .and(warp::post())
        .and(json_body())
        .and(with_model(textgen_model.clone()))
        .and(with_tokenizer(textgen_tokenizer.clone()))
        .and_then(search_handler_fn);

    println!("Starting to serve...");
    warp::serve(generate_handler.or(search_handler))
        .run(([127, 0, 0, 1], 3030))
        .await;
}
