from flask import Flask
from conversational_wrapper import ConversationalWrapper
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--path', help='The path to your collection of Markdown files.', type=str)
args = parser.parse_args()

app = Flask(__name__)
cw = ConversationalWrapper(args.path)

@app.route('/<query>')
def respond(query):
    return cw.respond(query)

if __name__ == '__main__':
   app.run()