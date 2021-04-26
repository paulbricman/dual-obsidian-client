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
}