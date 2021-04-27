import { App } from 'obsidian';

export module Recipes {
    export function getExamples(app: App) {
        var examples: string[] = [];
        var paths: string[] = [];

        app.vault.getMarkdownFiles().forEach(file => {
            if (file.path.startsWith("dual-recipes")) {
                app.metadataCache.getFileCache(file).frontmatter['examples'].forEach((example: string) => {
                    examples = examples.concat(example);
                    paths = paths.concat(file.path);
                });
            }
        });
        
        return [examples, paths]        
    }

    export async function matchQuery(app: App, query: string) {
        var examplePathPairs = this.getExamples(app);
        var examples = examplePathPairs[0], paths = examplePathPairs[1];

        const rawResponse = await fetch('http://127.0.0.1:5000/extract/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({query: query, documents: examples, selected_candidates: 1})
        });

        var content = await rawResponse.json();
        return paths[content['output'][0]];
    }

    export function getArguments(app: App, path: string) {
        var re = /\*[^\*]*\*/g;
        var args: string[];

        app.vault.getMarkdownFiles().forEach(file => {
            if (file.path == path) {
                app.vault.cachedRead(file).then((res) => {
                    args = res.match(re)
                    args.forEach((val, index, args) => {
                        args[index] = val.substring(1, val.length - 1);
                    });
                    return args;
                })
            }
        })
    }

    export async function extractArguments(query: string, args: string[]) {
        var contents: string[] = [];
        var res;

        res = await args.forEach(async (val) => {
            res = await this.extractArgument(query, val)
            res = res.split("\"")[0];
            contents = contents.concat(res);

            if (contents.length == args.length) {
                console.log('in loop', contents);
                return contents;
            }
                
        });

        return res;
        //console.log('outside loop', contents)
        //return contents;
    }

    export async function extractArgument(query: string, argument: string) {
        var prompt: string = `query: Come up with a writing prompt about aliens and robots.
The topic mentioned in this query is: "aliens and robots"

query: Einstein, what is general relativity?
The person mentioned in this query is: "Einstein"

query: Come up with a fitting term for a metaphor which bridges disparate fields.
The description mentioned in this query is: "a metaphor which bridges disparate fields"

query: Write a Python query which reverses the contents of a list.
The description mentioned in this query is: "reverses the contents of a list"

query: How could one operationalize working memory capacity?
The concept mentioned in this query is: "working memory capacity"

query: What specific operations should I perform to model an airplane in Blender?
The object mentioned in this query is: "airplane"

query: What would be a useful analogy for understanding pupillometry?
The concept mentioned in this query is: "pupillometry"

query: What are some possible applications of brain-computer interfaces?
The technology mentioned in this query is: "brain-computer interfaces"

query: How can I say "sprandel" in Romanian?
The language mentioned in this query is: "Romanian"

query: How would a school look like in Victorian London?
The context mentioned in this query is: "Victorian London"

query: Come up with a setting for a science fiction book.
The genre mentioned in this query is: "science fiction"

query: Try to come up with an exercise on thermodynamics.
The subject mentioned in this query is: "thermodynamics"

query: Darwin, what is the origin of species?
The person mentioned in this query is: "Darwin"

query: Look for notes about evolution.
The topic mentioned in this query is: "evolution"

query: Isaac Asimov, come up with a writing prompt about space exploration.
The person mentioned in this query is: "Isaac Asimov" 

query: ` + query + '\n' + argument + ': "'        
        const rawResponse = await fetch('http://127.0.0.1:5000/generate/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({prompt: prompt, early_stopping_criterion:'finish_paragraph', max_generated_token_count:Math.floor(query.length * 0.3)})
        });

        var content = await rawResponse.json();
        content = content['output'][0];
        return content
    }
}