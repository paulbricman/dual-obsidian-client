from sentence_transformers import SentenceTransformer, CrossEncoder, util
import pickle
import os
import glob
from markdown import markdown
from bs4 import BeautifulSoup
import frontmatter
import torch
from transformers import pipeline


class Persona:
    def __init__(self, root_dir):
        self.cache_address = os.path.join(root_dir, '.persona/cache.pickle')
        self.hidden_address = os.path.join(root_dir, '.persona')
        self.entry_regex = os.path.join(root_dir, '*md')

        print('Loading language models...')
        self.text_encoder = SentenceTransformer('msmarco-distilbert-base-v2')
        self.pair_encoder = CrossEncoder('cross-encoder/ms-marco-TinyBERT-L-6')
        self.qa = pipeline('question-answering')
        self.nli = pipeline('zero-shot-classification')

        if os.path.isfile(self.cache_address) is False:
            self.create_cache()
        else:
            self.load_cache()
            self.prune_cache_entries()
            self.update_cache_entries()
            self.add_cache_entries()

    def topic_search(self, query):
        """Utility for retrieving entries most relevant to a given query."""
        
        # First pass, find passages most similar to query
        query_embedding = self.text_encoder.encode(
            query, convert_to_tensor=True)
        hits = util.semantic_search(
            query_embedding, torch.Tensor(self.entry_embeddings), top_k=100)[0]

        # Second pass, re-rank passages more thoroughly
        cross_scores = self.pair_encoder.predict(
            [[query, self.entry_contents[hit['corpus_id']]] for hit in hits])

        for idx in range(len(cross_scores)):
            hits[idx]['cross-score'] = cross_scores[idx]

        # Select best few results
        hits = sorted(hits, key=lambda x: x['cross-score'], reverse=True)

        results = []
        for hit in hits[:5]:
            if hit['cross-score'] > 1e-3:
                results += [self.entry_filenames[hit['corpus_id']]]

        return results

    def related_search(self, filename):
        """Utility for retrieving entries most relevant to a given entry."""
        query_contents, query_embedding = self.entries[filename]
        hits = util.semantic_search(
            torch.Tensor(query_embedding), torch.Tensor(self.entry_embeddings), top_k=5)[0]

        results = []
        for hit in hits:
            results += [self.entry_filenames[hit['corpus_id']]]

        return results

    def descriptive_search(self, description):        
        query_embedding = self.text_encoder.encode(
            description, convert_to_tensor=True)
        hits = util.semantic_search(
            query_embedding, torch.Tensor(self.entry_embeddings), top_k=100)[0]

        candidate_entry_filenames = []
        for hit in hits:
            candidate_entry_filenames += [self.entry_filenames[hit['corpus_id']]]

        candidate_entry_contents = [self.entries[e][0] for e in candidate_entry_filenames]
        selection_contents = self.nli(candidate_entry_contents, description, hypothesis_template='{}', multi_class=True)
        selection_contents = sorted(selection_contents, key=lambda x: x['scores'][0], reverse=True)
        selection_contents = [e['sequence'] for e in selection_contents]
        selection_filenames = []

        for selected_entry_contents in selection_contents:
            for entry_filename in self.entries.keys():
                if self.entries[entry_filename][0] == selected_entry_contents:
                    selection_filenames += [entry_filename]

        return selection_filenames

    def question_answering(self, question):
        candidate_entry_filenames = self.topic_search(question)
        candidate_entry_contents = [self.entries[e][0] for e in candidate_entry_filenames]
        answer = self.qa(question, ' '.join(candidate_entry_contents))

        while answer['start'] > len(candidate_entry_contents[0]):
            answer['start'] -= len(candidate_entry_contents[0]) + 1 
            answer['end'] -= len(candidate_entry_contents[0]) + 1
            candidate_entry_contents.pop(0)
            candidate_entry_filenames.pop(0)

        return (answer['answer'], candidate_entry_filenames[0], answer['start'], answer['end'])

    def md_to_text(self, file):
        """Extract text from markdown file which contains front matter."""
        content = frontmatter.load(file)
        content.metadata = ''
        content = markdown(frontmatter.dumps(content))
        content = BeautifulSoup(content, features='html.parser')
        content = content.get_text()[4:]
        return content

    def create_cache(self):
        print('Cache file doesn\'t exist, creating a new one...')

        self.entry_filenames = glob.glob(self.entry_regex)
        self.entry_contents = [self.md_to_text(
            file) for file in self.entry_filenames]
        self.entry_embeddings = self.text_encoder.encode(
            self.entry_contents)

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
                self.entry_contents.append(self.md_to_text(entry_filename))
                self.entry_embeddings.append(
                    self.text_encoder.encode(self.md_to_text(entry_filename)))

        self.create_entries_dict()
        pickle.dump(self.entries, open(self.cache_address, 'wb'))

    def update_cache_entries(self):
        print('Updating cached entries which have been modified in the meanwhile')

        for entry_idx, entry_filename in enumerate(self.entry_filenames):
            if self.entry_contents[entry_idx] != self.md_to_text(entry_filename):
                self.entry_contents[entry_idx] = self.md_to_text(entry_filename)
                self.entry_embeddings[entry_idx] = self.text_encoder.encode(self.entry_contents[entry_idx])

        self.create_entries_dict()
        pickle.dump(self.entries, open(self.cache_address, 'wb'))
