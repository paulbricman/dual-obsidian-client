from flask import Flask, request
from flask_cors import CORS, cross_origin
from core import Core

app = Flask(__name__)
cors = CORS(app)
c = Core()


@app.route('/extract/', methods=['POST'])
@cross_origin()
def respond_extract():
    request_body = request.get_json()

    if 'query' not in request_body.keys() or 'documents' not in request_body.keys():
        return 'Specify both a query and a list of documents'

    return {
        "output": c.extract(
            request_body['query'],
            request_body['documents'],
            selected_candidates=request_body.get('selected_candidates', 5),
            return_documents=request_body.get('return_documents', False)
        )
    }

if __name__ == '__main__':
    app.run()
