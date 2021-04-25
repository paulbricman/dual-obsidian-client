from sentence_transformers import SentenceTransformer, CrossEncoder, util
from transformers import AutoModel, AutoTokenizer
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

    def fluid_search(self, query, documents, considered_candidates=50, selected_candidates=5, second_pass=True, return_documents=False):        
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

    def descriptive_search(self, query, documents, considered_candidates=50, selected_candidates=5, return_documents=False):
        selected_candidates = min(selected_candidates, considered_candidates)
        considered_candidates = min(considered_candidates, len(documents))

        # Encode novel documents
        for document_idx, document in enumerate(documents):
            if document not in self.cache.keys():
                self.cache[document] = self.bi_encoder.encode(document, convert_to_tensor=True)
        
        self.update_cache()
   
        # Conduct a preliminary semantic search first pass
        candidate_idx = self.fluid_search(query, documents, selected_candidates=considered_candidates, second_pass=False)
        candidate_documents = [documents[e] for e in candidate_idx]
        print(candidate_documents)

        # Rerank using entailment strength
        cross_encoder_input = [(e, query) for e in candidate_documents]
        print(cross_encoder_input)
        cross_encoder_output = self.nli.predict(cross_encoder_input, apply_softmax=False)
        print(cross_encoder_output)
        cross_encoder_output = [e[2] for e in cross_encoder_output]

        hits = [(idx, cross_encoder_output[idx]) for idx in range(considered_candidates)]
        hits = sorted(hits, key=lambda x: x[1], reverse=True)[:selected_candidates]

        if return_documents:
            return [documents[hit[0]] for hit in hits[:selected_candidates]]
        
        return [hit[0] for hit in hits[:selected_candidates]]

    def open_dialogue(self, question, considered_candidates=3):
        self.load_essence()

        if self.essence_ready == False:
            return ['The essence is not present at the required location.']

        candidate_entry_filenames = self.fluid_search(question, selected_candidates=considered_candidates)
        candidate_entry_contents = reversed([self.entries[e][0] for e in candidate_entry_filenames])
        generator_prompt = '\n\n'.join(candidate_entry_contents) + '\n\nQ: ' + question + '\nA: '
        input_ids = self.gen_tokenizer.encode(generator_prompt, return_tensors='pt')
        
        generator_output = self.gen_model.generate(
            input_ids, 
            do_sample=True, 
            max_length=len(input_ids[0]) + 100, 
            top_p=0.9, 
            top_k=40,
            temperature=0.9
        )

        output_sample = self.gen_tokenizer.decode(generator_output[0], skip_special_tokens=True)[len(generator_prompt):]
        output_sample = re.sub(r'^[\W_]+|[\W_]+$', '', output_sample)
        output_sample = re.sub(r'[^a-zA-Z0-9\s]{3,}', '', output_sample)
        output_sample = output_sample.split('Q:')[0].split('\n\n')[0].strip()
        output_sample += '...'
        
        return [output_sample]

    def load_models(self):
        print('Loading models...')
        self.bi_encoder = SentenceTransformer('distiluse-base-multilingual-cased-v2')
        self.pair_encoder = CrossEncoder('amberoad/bert-multilingual-passage-reranking-msmarco', max_length=512)
        self.nli = CrossEncoder('joeddav/xlm-roberta-large-xnli')
        #self.gen_tokenizer = AutoTokenizer.from_pretrained('EleutherAI/gpt-neo-125M')
        #self.gen_model = AutoModel.from_pretrained('EleutherAI/gpt-neo-125M')

    def create_cache(self):
        print('Cache file doesn\'t exist, creating a new one...')
        self.cache = {}
        pickle.dump({}, open(self.cache_address, 'wb'))

    def load_cache(self):
        print('Previous cache file exists, loading it...')
        self.cache = pickle.load(open(self.cache_address, 'rb'))

    def update_cache(self):
        pickle.dump(self.cache, open(self.cache_address, 'wb'))