from sentence_transformers import SentenceTransformer, CrossEncoder, util
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from pathlib import Path
import pickle
import os
import glob
import torch
import json
import random
import re


class Core:
    def __init__(self):
        self.root_dir = Path(os.getcwd())
        self.cache_address = self.root_dir / 'cache.pickle'
        self.load_models()

        if os.path.isfile(self.cache_address) is False:
            self.create_cache()
        else:
            self.load_cache()

    def extract(self, query, documents, considered_candidates=50, selected_candidates=5, second_pass=True, return_documents=False):  
        selected_candidates = min(selected_candidates, considered_candidates)

        # Encode novel documents
        for document_idx, document in enumerate(documents):
            if document not in self.cache.keys():
                self.cache[document] = self.bi_encoder.encode(document, convert_to_tensor=True)
        
        self.update_cache()

        # Load document embeddings, encode query, and use those for a semantic search first pass 
        document_embeddings = [self.cache[document] for document in documents]
        query_embedding = self.bi_encoder.encode(query, convert_to_tensor=True)
        hits = util.semantic_search(query_embedding, document_embeddings, top_k=considered_candidates)[0]

        # Optionally perform a semantic search second pass using pair encoders
        if second_pass:
            cross_scores = self.pair_encoder.predict([[query, documents[hit['corpus_id']]] for hit in hits])
            cross_scores = [e[1] for e in cross_scores]

            for idx in range(len(cross_scores)):
                hits[idx]['cross-score'] = cross_scores[idx]
            hits = sorted(hits, key=lambda x: x['cross-score'], reverse=True)
        
        if return_documents:
            return [documents[hit['corpus_id']] for hit in hits[:selected_candidates]]
        
        return [hit['corpus_id'].item() for hit in hits[:selected_candidates]]

    def generate(self, prompt, early_stopping_criterion=None, max_generated_token_count=100, attitude='natural'):
        input_ids = self.gen_tokenizer.encode(prompt, return_tensors='pt')[-1000:]

        if early_stopping_criterion == None:
            bad_words_ids = None
        elif early_stopping_criterion == 'finish_paragraph':
            bad_words_ids = [[198], [628]]

        if attitude == 'natural':
            temperature = 0.7
        elif attitude == 'mechanic':
            temperature = 0.01
        
        generator_output = self.gen_model.generate(
            input_ids, 
            do_sample=True, 
            max_length=len(input_ids[0]) + max_generated_token_count, 
            top_p=0.9,
            temperature=temperature,
            bad_words_ids=bad_words_ids
        )

        output_sample = self.gen_tokenizer.decode(generator_output[0], skip_special_tokens=True)[len(prompt):]
        return [output_sample]

    def load_models(self):
        print('Loading models...')
        self.bi_encoder = SentenceTransformer('distiluse-base-multilingual-cased-v2')
        self.pair_encoder = CrossEncoder('amberoad/bert-multilingual-passage-reranking-msmarco', max_length=512)
        self.gen_tokenizer = GPT2Tokenizer.from_pretrained('gpt2-medium')
        self.gen_model = GPT2LMHeadModel.from_pretrained('gpt2-medium')

    def create_cache(self):
        print('Cache file doesn\'t exist, creating a new one...')
        self.cache = {}
        pickle.dump({}, open(self.cache_address, 'wb'))

    def load_cache(self):
        print('Previous cache file exists, loading it...')
        self.cache = pickle.load(open(self.cache_address, 'rb'))

    def update_cache(self):
        pickle.dump(self.cache, open(self.cache_address, 'wb'))