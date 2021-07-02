use ngt::{DistanceType, Index, Properties, EPSILON};
use sbert::SBertRT;
use std::env;
use std::path::PathBuf;

pub fn _test() {
    // Load model and documents
    let mut home: PathBuf = env::current_dir().unwrap();
    home.push("..");
    home.push("models");
    home.push("distiluse-base-multilingual-cased");
    let sbert_model = SBertRT::new(home.to_str().unwrap()).unwrap();
    let texts = [
        "You can encode",
        "As many sentences",
        "As you want",
        "You can decode",
    ];

    // Compute embeddings and add them to the index
    let output = sbert_model.forward(&texts, 64).unwrap();
    let prop = Properties::dimension(512)
        .unwrap()
        .distance_type(DistanceType::Cosine)
        .unwrap();
    let mut index = Index::create("index/", prop).unwrap();
    output[1..].iter().for_each(|e| {
        let _y = index.insert(e.clone().into());
        ()
    });
    let _x = index.build(2);

    // Prepare the query and search for documents closest to it (first doc is used as query)
    let query: Vec<f64> = output[0].iter().map(|&e| e as f64).collect();
    let res = index.search(query.as_slice(), 1, EPSILON).unwrap();
    print!("{:?}", res[0].id);
}
