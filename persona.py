from sentence_transformers import SentenceTransformer, CrossEncoder, util
import pickle
import os
import glob
from markdown import markdown
from bs4 import BeautifulSoup
import frontmatter


class Persona:
    def __init__(self, root_dir):
        self.cache_address = os.path.join(root_dir, '.persona/cache.pickle')
        self.hidden_address = os.path.join(root_dir, '.persona')
        self.entry_regex = os.path.join(root_dir, '*md')

        print('Loading language models...')
        self.text_encoder = SentenceTransformer('msmarco-distilbert-base-v2')
        self.pair_encoder = CrossEncoder('cross-encoder/ms-marco-TinyBERT-L-6')

        if os.path.isfile(self.cache_address) is False:
            self.create_cache()
        else:
            self.load_cache()
            self.prune_cache_entries()
            self.update_cache_entries()
            self.add_cache_entries()

    def md_to_text(self, file):
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
        print(self.entry_filenames)

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

if __name__ == '__main__':
    p = Persona('./test_kb')
