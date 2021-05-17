from flask import Flask, request
from flask_cors import CORS, cross_origin
from core import Core

app = Flask(__name__)
cors = CORS(app)
c = Core()

@app.route('/extract/', methods=['POST'])
@cross_origin()
def respond_extract():
    request_body = request.get_json(force=True)

    if 'query' not in request_body.keys() or 'documents' not in request_body.keys():
        return 'Specify both a command and a list of documents'

    return {
        'result': c.extract(
            query=request_body['query'],
            documents=request_body['documents'],
            selected_candidates=request_body.get('selected_candidates', 5),
            return_documents=request_body.get('return_documents', False)
        )
    }

@app.route('/generate/', methods=['POST'])
@cross_origin()
def respond_generate():
    request_body = request.get_json(force=True)

    if 'prompt' not in request_body.keys():
        return 'Specify a prompt'

    return {
        'result': c.generate(
            prompt=request_body['prompt'],
            behavior=request_body.get('behavior', 'finish_paragraph'),
            pool=request_body.get('pool', None)
        )
    }

if __name__ == '__main__':
    app.run()
