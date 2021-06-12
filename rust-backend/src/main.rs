#![feature(proc_macro_hygiene, decl_macro)]
extern crate anyhow;

use rust_bert::gpt2::{
    GPT2Generator, Gpt2ConfigResources, Gpt2MergesResources, Gpt2ModelResources, Gpt2VocabResources,
};
use rust_bert::pipelines::generation_utils::{GenerateConfig, LanguageGenerator};
use rust_bert::resources::{RemoteResource, Resource};

use std::ops::Deref;
use tch::Tensor;

use serde::Deserialize;
use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task;
use warp::Filter;

type TextGenModel = Arc<Mutex<GPT2Generator>>;

fn textgen_model_config() -> GenerateConfig {
    let config = GenerateConfig {
        max_length: 56,
        model_resource: Resource::Remote(RemoteResource::from_pretrained(Gpt2ModelResources::GPT2)),
        config_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2ConfigResources::GPT2,
        )),
        vocab_resource: Resource::Remote(RemoteResource::from_pretrained(Gpt2VocabResources::GPT2)),
        merges_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2MergesResources::GPT2,
        )),
        do_sample: false,
        num_beams: 5,
        ..Default::default()
    };
    config
}

fn textgen_model(config: GenerateConfig) -> TextGenModel {
    let textgen_model = GPT2Generator::new(config).expect("Model failed to load");
    Arc::new(Mutex::new(textgen_model))
}

async fn generate(query: TextGenQuery, textgen_model: TextGenModel)-> Result<impl warp::Reply, Infallible> {
    let model = textgen_model.lock().await;
    let custom_force_paragraph = generic_force_paragraph_factory();

    let output = model.generate(
        Some(&[string_to_static_str(query.prompt.clone())]),
        None,
        None,
        None,
        None,
        Some(custom_force_paragraph.deref()),
    );

    let prompt_len = query.prompt.clone().len();
    let output_sliced = (&output[0][prompt_len..]).to_string();

    let mut response = HashMap::new();
    response.insert("output", output_sliced);

    Ok(warp::reply::json(&response))
}
    
fn string_to_static_str(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

#[derive(Debug, Deserialize)]
pub struct TextGenQuery {
    pub prompt: String,
}

fn with_model(textgen_model: TextGenModel) -> impl Filter<Extract = (TextGenModel,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || textgen_model.clone())
}

fn json_body() -> impl Filter<Extract = (TextGenQuery,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(1024 * 16).and(warp::body::json())
}

#[tokio::main]
async fn main() {
    let textgen_model: TextGenModel = task::spawn_blocking(move || {
        let c = textgen_model_config();
        let m = textgen_model(c);
        m
    })
    .await
    .expect("Working");

    println!("Loaded config and model");

    let textgen_handler = warp::path!("generate")
        .and(warp::post())
        .and(json_body())
        .and(with_model(textgen_model.clone()))
        .and_then(generate);
        
    println!("Starting to serve...");
    warp::serve(textgen_handler)
        .run(([127, 0, 0, 1], 3030))
        .await;
}

fn generic_force_paragraph_factory() -> Box<dyn Fn(i64, &Tensor) -> Vec<i64>> {
    Box::new(move |_batch_id: i64, previous_token_ids: &Tensor| (0..50256).collect())

    /*
    Box::new(move |_batch_id: i64, previous_token_ids: &Tensor| {
        let paragraph_tokens = [198, 628];

        for paragraph_token in paragraph_tokens.iter() {
            if previous_token_ids
                .iter::<i64>()
                .unwrap()
                .any(|x| x == *paragraph_token)
            {
                return vec![eos_id];
            }
        }
        (0..50255).collect()
    })
    */
}