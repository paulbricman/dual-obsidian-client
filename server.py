from flask import Flask
from flask_cors import CORS, cross_origin
from conversational_wrapper import ConversationalWrapper
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--path', help='The path to your collection of Markdown files.', type=str)
args = parser.parse_args()

app = Flask(__name__)
cors = CORS(app)
cw = ConversationalWrapper(args.path)

@app.route('/<query>')
@cross_origin()
def respond(query):
    return cw.respond(query)

if __name__ == '__main__':
   app.run()