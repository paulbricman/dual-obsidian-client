from sentence_transformers import SentenceTransformer, CrossEncoder, util
import pickle
import os
import glob
from markdown import markdown
from bs4 import BeautifulSoup
import frontmatter


class Persona:
    def __init__(self, root_dir):
        cache_address = os.path.join(root_dir, '.persona/cache.pickle')
        hidden_address = os.path.join(root_dir, '.persona')
        entry_regex = os.path.join(root_dir, '*md')
        self.text_encoder = SentenceTransformer('msmarco-distilbert-base-v2')
        self.pair_encoder = CrossEncoder('cross-encoder/ms-marco-TinyBERT-L-6')

        if os.path.isfile(cache_address) is False:
            print('Cache file doesn\'t exist, creating a new one...')

            self.entry_filenames = glob.glob(entry_regex)
            self.entry_contents = [self.md_to_text(
                file) for file in self.entry_filenames]
            self.entry_embeddings = self.text_encoder.encode(
                self.entry_contents)
            cache = {}

            for entry_idx in range(len(self.entry_filenames)):
                cache[self.entry_filenames[entry_idx]] = (
                    self.entry_contents[entry_idx], self.entry_embeddings)

            os.mkdir(hidden_address)
            pickle.dump(cache, open(cache_address, 'wb'))

    def md_to_text(self, file):
        content = frontmatter.load(file)
        content.metadata = ''
        content = markdown(frontmatter.dumps(content))
        content = BeautifulSoup(content, features='html.parser')
        content = content.get_text()[4:]
        return content


if __name__ == '__main__':
    p = Persona('./test_kb')
