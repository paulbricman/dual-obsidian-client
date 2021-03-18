from sentence_transformers import SentenceTransformer, CrossEncoder, util
import pickle
import os
import glob
import torch
from transformers import pipeline
from qg_pipeline import qg_pipeline
from util import md_to_text
import json
import random


class Core:
    def __init__(self, root_dir):
        self.cache_address = os.path.join(root_dir, '.persona/cache.pickle')
        self.hidden_address = os.path.join(root_dir, '.persona')
        self.entry_regex = os.path.join(root_dir, '*md')

        print('Loading language model zoo...')
        self.text_encoder = SentenceTransformer('msmarco-distilbert-base-v2')
        self.pair_encoder = CrossEncoder('cross-encoder/ms-marco-TinyBERT-L-4')
        self.qa = pipeline('question-answering', model='distilbert-base-cased-distilled-squad')
        self.nli = CrossEncoder('cross-encoder/nli-distilroberta-base')
        self.qg = qg_pipeline('question-generation', model='valhalla/t5-small-qg-hl', ans_model='valhalla/t5-small-qa-qg-hl')

        if os.path.isfile(self.cache_address) is False:
            self.create_cache()
        else:
            self.load_cache()
            self.prune_cache_entries()
            self.update_cache_entries()
            self.add_cache_entries()

    def fluid_search(self, query, considered_candidates=50, selected_candidates=10, second_pass=True):
        selected_candidates = min(selected_candidates, considered_candidates)
        query_embedding = self.text_encoder.encode(query, convert_to_tensor=True)
        hits = util.semantic_search(query_embedding, torch.Tensor(self.entry_embeddings), top_k=considered_candidates)[0]

        if second_pass:
            cross_scores = self.pair_encoder.predict([[query, self.entry_contents[hit['corpus_id']]] for hit in hits])

            for idx in range(len(cross_scores)):
                hits[idx]['cross-score'] = cross_scores[idx]

            hits = sorted(hits, key=lambda x: x['cross-score'], reverse=True)
            return [self.entry_filenames[hit['corpus_id']] for hit in hits[:selected_candidates] if hit['cross-score'] > 1e-3]
        else:
            return [self.entry_filenames[hit['corpus_id']] for hit in hits[:selected_candidates]]

    def descriptive_search(self, claim, polarity=True, target='premise', considered_candidates=50, selected_candidates=10):
        selected_candidates = min(selected_candidates, considered_candidates)
        considered_candidates = min(considered_candidates, len(self.entry_filenames))     
        candidate_entry_filenames = self.fluid_search(claim, selected_candidates=considered_candidates, second_pass=False)
        candidate_entry_contents = [self.entries[e][0] for e in candidate_entry_filenames]

        if target == 'premise':
            cross_encoder_input = [(e, claim) for e in candidate_entry_contents]
        elif target == 'conclusion':
            cross_encoder_input = [(claim, e) for e in candidate_entry_contents]

        cross_encoder_output = self.nli.predict(cross_encoder_input, apply_softmax=False)
        
        if polarity == True:
            cross_encoder_output = [e[1] for e in cross_encoder_output]
        else:
            cross_encoder_output = [e[0] for e in cross_encoder_output]

        results = [(candidate_entry_filenames[idx], cross_encoder_output[idx]) for idx in range(considered_candidates)]
        results = sorted(results, key=lambda x: x[1], reverse=True)[:selected_candidates]
        results = [e[0] for e in results]

        return results

    def question_answering(self, question, considered_candidates=10):
        candidate_entry_filenames = self.fluid_search(question, selected_candidates=considered_candidates, second_pass=False)
        candidate_entry_contents = [self.entries[e][0] for e in candidate_entry_filenames]
        answer = self.qa(question, ' '.join(candidate_entry_contents))

        while answer['start'] > len(candidate_entry_contents[0]):
            answer['start'] -= len(candidate_entry_contents[0]) + 1 
            answer['end'] -= len(candidate_entry_contents[0]) + 1
            candidate_entry_contents.pop(0)
            candidate_entry_filenames.pop(0)

        return (answer['answer'], candidate_entry_filenames[0], answer['start'], answer['end'])

    def question_generation(self, query, considered_candidates=3, include_probes=True):
        candidate_entry_filenames = self.fluid_search(query, selected_candidates=considered_candidates)
        candidate_entry_contents = [self.entries[e][0] for e in candidate_entry_filenames]
        questions = self.qg(' '.join(candidate_entry_contents))
        questions = [e['question'] for e in questions]

        if include_probes:
            probes = json.load(open('probes.json'))['probes']
            probes = random.sample(probes, len(questions))
            questions += probes
            random.shuffle(questions)

        return questions

    def create_cache(self):
        print('Cache file doesn\'t exist, creating a new one...')

        self.entry_filenames = glob.glob(self.entry_regex)
        self.entry_contents = [md_to_text(
            file) for file in self.entry_filenames]
        self.entry_embeddings = list(self.text_encoder.encode(
            self.entry_contents))

        self.create_entries_dict()

        os.mkdir(self.hidden_address)
        pickle.dump(self.entries, open(self.cache_address, 'wb'))

    def create_entries_dict(self):
        self.entries = {}

        for entry_idx in range(len(self.entry_filenames)):
            self.entries[self.entry_filenames[entry_idx]] = (
                self.entry_contents[entry_idx], self.entry_embeddings[entry_idx])

    def load_cache(self):
        print('Previous cache file exist, loading it...')
        self.entries = pickle.load(open(self.cache_address, 'rb'))
        self.entry_filenames = list(self.entries.keys())
        self.entry_contents = [e[0] for e in self.entries.values()]
        self.entry_embeddings = [e[1] for e in self.entries.values()]

    def prune_cache_entries(self):
        print('Pruning cached entries which have been removed in the meanwhile...')
        actual_entry_filenames = glob.glob(self.entry_regex)

        for entry_idx, entry_filename in enumerate(self.entry_filenames):
            if entry_filename not in actual_entry_filenames:
                self.entry_filenames.pop(entry_idx)
                self.entry_contents.pop(entry_idx)
                self.entry_embeddings.pop(entry_idx)

        self.create_entries_dict()
        pickle.dump(self.entries, open(self.cache_address, 'wb'))

    def add_cache_entries(self):
        print('Caching new entries...')
        actual_entry_filenames = glob.glob(self.entry_regex)

        for entry_idx, entry_filename in enumerate(actual_entry_filenames):
            if entry_filename not in self.entry_filenames:
                self.entry_filenames.append(entry_filename)
                self.entry_contents.append(md_to_text(entry_filename))
                self.entry_embeddings.append(
                    self.text_encoder.encode(md_to_text(entry_filename)))

        self.create_entries_dict()
        pickle.dump(self.entries, open(self.cache_address, 'wb'))

    def update_cache_entries(self):
        print('Updating cached entries which have been modified in the meanwhile')

        for entry_idx, entry_filename in enumerate(self.entry_filenames):
            if self.entry_contents[entry_idx] != md_to_text(entry_filename):
                self.entry_contents[entry_idx] = md_to_text(entry_filename)
                self.entry_embeddings[entry_idx] = self.text_encoder.encode(self.entry_contents[entry_idx])

        self.create_entries_dict()
        pickle.dump(self.entries, open(self.cache_address, 'wb'))
