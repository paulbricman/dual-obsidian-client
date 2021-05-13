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

    def generate(self, prompt, behavior='finish_paragraph', pool=None):
        input_token_ids = self.gen_tokenizer.encode(prompt, return_tensors='pt')[-1000:]
        input_ids_count = len(input_token_ids[0])

        if pool is not None:
            pool_token_ids = self.gen_tokenizer.encode(pool, return_tensors='pt')[-1000:]
        else:
            pool_token_ids = None

        if behavior in ['finish_paragraph', 'finish_sentence']:
            temperature = 0.7
            max_generated_token_count = 200
            forced_eos_token_id = 13

            if behavior == 'finish_paragraph':
                max_sentence_tokens = random.randint(2, 5)
                max_paragraph_tokens = 0
            elif behavior == 'finish_sentence':
                max_sentence_tokens = 1
                max_paragraph_tokens = 0

        elif behavior == 'parse_arguments':
            temperature = 0.2
            forced_eos_token_id = None
            max_generated_token_count = 100
            max_sentence_tokens = 1000
            max_paragraph_tokens = 0

        generator_output = self.gen_model.generate(
            input_token_ids, 
            do_sample=True, 
            max_length=input_ids_count + max_generated_token_count, 
            top_p=0.9,
            temperature=temperature,
            no_repeat_ngram_size=4,
            forced_eos_token_id=forced_eos_token_id,
            prefix_allowed_tokens_fn=lambda x, y: self.allowed_tokens(x, y, input_ids_count, behavior, pool_token_ids, max_sentence_tokens, max_paragraph_tokens)
        )

        output_sample = self.gen_tokenizer.decode(generator_output[0], skip_special_tokens=True)[len(prompt):]
        return [output_sample]

    def allowed_tokens(self, batch_id, previous_token_ids, input_ids_count, behavior, pool_token_ids=None, max_sentence_tokens=3, max_paragraph_tokens=1):
        sentence_tokens = [13, 30, 0]
        paragraph_tokens = [198, 628]

        used_token_ids = previous_token_ids[input_ids_count:]
        used_sentence_tokens_count = len([e for e in used_token_ids if e in sentence_tokens])
        used_paragraph_tokens_count = len([e for e in used_token_ids if e in paragraph_tokens])
        
        if used_sentence_tokens_count > max_sentence_tokens or used_paragraph_tokens_count > max_paragraph_tokens:
            return [self.gen_tokenizer.eos_token_id]

        return range(0, 50255)

    def sublist_match(self, pool_token_ids, used_token_ids):
        matches = []
        for i in range(len(pool_token_ids)):
            if pool_token_ids[i] == used_token_ids[0] and pool_token_ids[i:i+len(used_token_ids)] == used_token_ids:
                matches.append(i)
        return matches

    def load_models(self):
        print('Loading models...')
        self.bi_encoder = SentenceTransformer('distiluse-base-multilingual-cased-v2')
        self.pair_encoder = CrossEncoder('amberoad/bert-multilingual-passage-reranking-msmarco', max_length=512)
        self.gen_tokenizer = GPT2Tokenizer.from_pretrained('gpt2-medium')
        self.gen_model = GPT2LMHeadModel.from_pretrained('model')

    def create_cache(self):
        print('Cache file doesn\'t exist, creating a new one...')
        self.cache = {}
        pickle.dump({}, open(self.cache_address, 'wb'))

    def load_cache(self):
        print('Previous cache file exists, loading it...')
        self.cache = pickle.load(open(self.cache_address, 'rb'))

    def update_cache(self):
        pickle.dump(self.cache, open(self.cache_address, 'wb'))