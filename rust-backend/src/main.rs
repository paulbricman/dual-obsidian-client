#![feature(proc_macro_hygiene, decl_macro)]
#[macro_use]
extern crate rocket;
extern crate anyhow;

use rust_bert::gpt2::{
    GPT2Generator, Gpt2ConfigResources, Gpt2MergesResources, Gpt2ModelResources, Gpt2VocabResources,
};
use rust_bert::pipelines::generation_utils::{GenerateConfig, LanguageGenerator};
use rust_bert::resources::{RemoteResource, Resource};
use std::error::Error;
use std::ops::Deref;
use tch::Tensor;

fn string_to_static_str(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

#[get("/generate/<prompt>")]
fn index(prompt: String) -> &'static str {
    let output = string_to_static_str(generate(&*prompt).expect("Error"));
    output
    // let output = generate(&*prompt).expect("Error");
    // let output = &*output;
    // // output.to_string();
    // output
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

fn generate(prompt: &str) -> Result<String, Box<dyn Error>> {
    let generate_config = GenerateConfig {
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
        num_beams: 1,
        ..Default::default()
    };

    let model = GPT2Generator::new(generate_config)?;
    let custom_force_paragraph = generic_force_paragraph_factory();
    let output = model.generate(
        Some(&[prompt]),
        None,
        None,
        None,
        None,
        Some(custom_force_paragraph.deref()),
    );

    let item = output.into_iter().nth(0).expect("Missing element");
    Ok(item)
}

fn main() -> anyhow::Result<()> {
    rocket::ignite().mount("/", routes![index]).launch();
    /*
    let input_context_1 = "Rust is a";

    let output = generate(input_context_1).expect("Error");

    println!("{:?}", output);
    */
    Ok(())
}
