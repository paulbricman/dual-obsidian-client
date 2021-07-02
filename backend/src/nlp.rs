use crate::server::Query;
use crate::utils::*;

use itertools::Itertools;
use rust_bert::gpt2::{
    GPT2Generator, Gpt2ConfigResources, Gpt2MergesResources, Gpt2ModelResources, Gpt2VocabResources,
};
use rust_bert::pipelines::common::{ModelType, TokenizerOption};
use rust_bert::pipelines::generation_utils::{GenerateConfig, LanguageGenerator};
use rust_bert::resources::{RemoteResource, Resource};
use tch::Tensor;

use regex::Regex;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::MutexGuard;

use ngt::{DistanceType, Index, Properties, EPSILON};
use pickledb::{PickleDb, PickleDbDumpPolicy};
use sbert::SBertRT;
use std::env;
use std::path::Path;
use std::path::PathBuf;

pub type GenModel = Arc<Mutex<GPT2Generator>>;
pub type Tokenizer = Arc<Mutex<TokenizerOption>>;
pub type EmbModel = Arc<Mutex<SBertRT>>;

/// Initialize gen_model config
pub fn gen_model_config() -> GenerateConfig {
    let config = GenerateConfig {
        max_length: 1000,
        model_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2ModelResources::GPT2_MEDIUM,
        )),
        config_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2ConfigResources::GPT2_MEDIUM,
        )),
        vocab_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2VocabResources::GPT2_MEDIUM,
        )),
        merges_resource: Resource::Remote(RemoteResource::from_pretrained(
            Gpt2MergesResources::GPT2_MEDIUM,
        )),
        do_sample: false,
        num_beams: 1,
        num_return_sequences: 1,
        no_repeat_ngram_size: 0,
        ..Default::default()
    };
    config
}

/// Load gen_model
pub fn gen_model(config: GenerateConfig) -> GenModel {
    let gen_model = GPT2Generator::new(config).expect("Model failed to load");
    Arc::new(Mutex::new(gen_model))
}

pub fn emb_model() -> EmbModel {
    let mut home: PathBuf = env::current_dir().unwrap();
    home.push("models");
    home.push("distiluse-base-multilingual-cased");

    let emb_model = SBertRT::new(home.to_str().unwrap()).unwrap();
    Arc::new(Mutex::new(emb_model))
}

/// Load tokenizer
pub fn tokenizer(config: GenerateConfig) -> Tokenizer {
    let vocab_path = config.vocab_resource.get_local_path().expect("Failed");
    let merges_path = config.merges_resource.get_local_path().expect("Failed");

    let tokenizer = TokenizerOption::from_file(
        ModelType::GPT2,
        vocab_path.to_str().unwrap(),
        Some(merges_path.to_str().unwrap()),
        false,
        None,
        None,
    )
    .unwrap();
    Arc::new(Mutex::new(tokenizer))
}

/// Generate completions
pub async fn generate(query: Query, gen_model: GenModel, tokenizer: Tokenizer) -> Vec<String> {
    let gen_model = gen_model.lock().await;
    let tokenizer = tokenizer.lock().await;
    let prompt = query.prompt.clone();
    let prompt_len = prompt.chars().count();
    let context_tokens: Vec<Vec<String>>;
    let context_ids: Option<Vec<Vec<i64>>>;

    if let Some(context) = query.context.clone() {
        context_tokens = context
            .iter()
            .map(|e| tokenizer.tokenize(e.clone().as_str()))
            .collect();
        context_ids = Some(
            context_tokens
                .iter()
                .map(|e| tokenizer.convert_tokens_to_ids(e))
                .collect(),
        );
    } else {
        context_ids = None;
    }

    let allowed_tokens = allowed_tokens_factory(
        prompt.as_str(),
        &tokenizer,
        query.generate_sentences.clone(),
        query.generate_paragraphs.clone(),
        context_ids,
    );

    let output = gen_model.generate_indices(
        Some(&[prompt.as_str()]),
        None,
        None,
        None,
        None,
        None,
        Some(allowed_tokens.deref()),
        false,
    );

    output
        .iter()
        .map(|e| tokenizer.decode(e.indices.clone(), true, false)[prompt_len..].to_string())
        .collect()
}

/// Specify allowed tokens at each generation step
fn allowed_tokens_factory<'a>(
    prompt: &'a str,
    tokenizer: &'a MutexGuard<TokenizerOption>,
    generated_sentences: Option<usize>,
    generated_paragraphs: Option<usize>,
    context_ids: Option<Vec<Vec<i64>>>,
) -> Box<dyn Fn(i64, &Tensor) -> Vec<i64> + 'a> {
    Box::new(move |_batch_id: i64, previous_token_ids: &Tensor| {
        let previous_token_ids_vec: Vec<i64> = previous_token_ids.into();
        let tokenized_prompt = tokenizer.tokenize(prompt);
        let generated_ids = &previous_token_ids_vec[tokenized_prompt.len()..];

        if generated_ids.len() > 100 {
            return vec![50256];
        }

        let generated_text = tokenizer.decode(generated_ids.into(), false, false);
        let re = Regex::new(
            r"([a-zA-Z0-9]?\.[a-zA-Z0-9]*\.|[0-9]+\.[0-9]*|[A-Z]+[a-z]*\.\s[a-zA-Z]{1})",
        )
        .unwrap();
        let clean_generated_text = re.replace_all(generated_text.as_str(), "");
        let clean_generated_tokens = tokenizer.tokenize(&clean_generated_text);
        let clean_generated_ids = tokenizer.convert_tokens_to_ids(clean_generated_tokens);

        let sentence_token_count: usize = clean_generated_ids
            .iter()
            .filter(|&n| *n == 13 || *n == 30 || *n == 0)
            .count();
        let paragraph_token_count: usize = clean_generated_ids
            .iter()
            .filter(|&n| *n == 198 || *n == 628)
            .count();

        if let Some(gs) = generated_sentences {
            if sentence_token_count == gs {
                return vec![50256];
            }
        }

        if let Some(gp) = generated_paragraphs {
            if paragraph_token_count == gp {
                return vec![50256];
            }
        }

        if let Some(c) = &context_ids {
            if generated_ids.len() == 0 {
                return c.iter().fold(vec![], |mut a, b| {
                    a.append(&mut b.clone());
                    a
                });
            }

            let allowed_token_ids: Vec<Vec<i64>> = c
                .iter()
                .map(|e| {
                    let mut local_context_ids = e.clone();
                    let mut local_candidate_ids: Vec<i64> = vec![];

                    while let Some(start) = find_subsequence(&local_context_ids, &generated_ids) {
                        let end = start + generated_ids.len();
                        if end < local_context_ids.len() {
                            local_candidate_ids.push(local_context_ids[end]);
                        }
                        local_context_ids = local_context_ids[end..].into();
                    }
                    local_candidate_ids
                })
                .collect();

            let mut all_allowed_token_ids = allowed_token_ids.iter().fold(vec![], |mut a, b| {
                a.append(&mut b.clone());
                a
            });
            all_allowed_token_ids = all_allowed_token_ids.iter().unique().cloned().collect();
            all_allowed_token_ids.push(50256);

            return all_allowed_token_ids;
        }

        (0..50255).collect()
    })
}

pub async fn search(query: Query, emb_model: EmbModel) -> Vec<u32> {
    let prompt = query.prompt;
    let context = query.context.unwrap();
    let emb_model = emb_model.lock().await;
    let mut db: PickleDb;

    if Path::new("emb_cache.db").exists() {
        db = PickleDb::load_bin("emb_cache.db", PickleDbDumpPolicy::AutoDump).unwrap();
    } else {
        db = PickleDb::new_bin("emb_cache.db", PickleDbDumpPolicy::AutoDump);
    }

    let output_emb: Vec<Vec<f32>> = context
        .iter()
        .map(|e| {
            let key = e.as_str().clone();
            if db.exists(key) {
                let new_emb: Vec<f32> = db.get(key).unwrap();
                new_emb
            } else {
                let new_emb = emb_model
                    .forward(&[key], 1)
                    .unwrap()
                    .get(0)
                    .unwrap()
                    .clone();
                let _x = db.set(key, &new_emb);
                new_emb
            }
        })
        .collect();

    let prompt_emb = emb_model.forward(&[prompt], 1).unwrap();
    let prop = Properties::dimension(512)
        .unwrap()
        .distance_type(DistanceType::Cosine)
        .unwrap();
    let mut index = Index::create("index/", prop).unwrap();

    for emb in output_emb.iter() {
        let _x = index.insert(emb.clone().into());
    }
    let _x = index.build(4);

    let prompt_emb: Vec<f64> = prompt_emb[0].iter().map(|&e| e as f64).collect();
    let res = index.search(prompt_emb.as_slice(), 3, EPSILON).unwrap();
    res.iter().map(|e| e.id).collect()
}
