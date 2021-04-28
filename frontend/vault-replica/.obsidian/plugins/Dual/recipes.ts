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

    export function getIngredientNames(app: App, path: string) {
        var re = /\*[^\*]*\*/g;
        var ingredientNames: string[];

        app.vault.getMarkdownFiles().forEach(file => {
            if (file.path == path) {
                app.vault.cachedRead(file).then((res) => {
                    ingredientNames = res.match(re)
                    ingredientNames.forEach((val, index, ingredientNames) => {
                        ingredientNames[index] = val.substring(1, val.length - 1);
                    });
                    return ingredientNames;
                })
            }
        })
    }

    export async function getIngredients(query: string, ingredientNames: string[]) {
        var ingredients: string[] = [], res;

        for (let index = 0; index < ingredientNames.length; index++) {
            res = await this.getIngredient(query, ingredientNames[index]);
            res = res.split("\"")[0];
            ingredients = ingredients.concat(res);
        }

        return ingredients;
    }

    export async function getIngredient(query: string, ingredientName: string) {
        var prompt: string = getIngredientPrompt + query + '\n' + ingredientName + ': "'
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

    const getIngredientPrompt: string =
`query: Come up with a writing prompt about aliens and robots.
topic: "aliens and robots"

query: Einstein, what is general relativity?
person: "Einstein"

query: Come up with a fitting term for a metaphor which bridges disparate fields.
description: "a metaphor which bridges disparate fields"

query: Write a Python query which reverses the contents of a list.
description: "reverses the contents of a list"

query: How could one operationalize working memory capacity?
concept: "working memory capacity"

query: What specific operations should I perform to model an airplane in Blender?
object: "airplane"

query: What would be a useful analogy for understanding pupillometry?
concept: "pupillometry"

query: What are some possible applications of brain-computer interfaces?
technology: "brain-computer interfaces"

query: How can I say "sprandel" in Romanian?
language: "Romanian"

query: How would a school look like in Victorian London?
context: "Victorian London"

query: Come up with a setting for a science fiction book.
genre: "science fiction"

query: Try to come up with an exercise on thermodynamics.
subject: "thermodynamics"

query: Darwin, what is the origin of species?
person: "Darwin"

query: Look for notes about evolution.
topic: "evolution"

query: Isaac Asimov, come up with a writing prompt about space exploration.
person: "Isaac Asimov" 

query: `
}