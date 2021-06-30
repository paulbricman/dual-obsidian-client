#![feature(proc_macro_hygiene, decl_macro)]
extern crate anyhow;

mod nlp;
mod sbert_test;
mod server;
mod utils;

use sbert_test::test;

use crate::server::*;

#[tokio::main]
async fn main() {
    test();
    serve().await;
}
