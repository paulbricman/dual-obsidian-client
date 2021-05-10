import { App } from "obsidian";
import { Utils } from "utils";

export module Recipes {

  // Returns final response to a query 
  export async function runCommand(app: App, query: string) {
    var recipePath = await matchQuery(app, query);
    console.log('FOLLOWING', recipePath, 'USING', query)
    var output = followRecipe(app, recipePath, query);

    return output
  }

  // Follows a specific recipe using a certain query
  export async function followRecipe(app: App, path: string, query: string) {
    var recipeContents: string = await getRecipeContents(app, path);
    var outputPattern: string = await getOutputPattern(app, path);
    recipeContents = removeFrontMatter(recipeContents)

    var placeholders: string[] = await getPlaceholders(app, recipeContents);
    var ingredients: string[] = await getIngredients(query, placeholders);
    recipeContents = resolvePlaceholders(recipeContents, placeholders, ingredients);

    var codeBlocks = detectCodeBlocks(recipeContents)
    var [splitBlockList, blockTypes] = splitBlocks(recipeContents, codeBlocks)
    var [splitBlockList, textSoFar] = await interpretBlocks(app, splitBlockList, blockTypes)
    
    var output = resolveOutputReferences(splitBlockList, textSoFar, outputPattern)
    var outputPlaceholders: string[] = await getPlaceholders(app, output);
    var outputIngredients: string[] = await getIngredients(query, placeholders);
    output = resolvePlaceholders(output, outputPlaceholders, outputIngredients);

    return output
  }

  // Walk through blocks and take actions based on them
  export async function interpretBlocks(app: App, splitBlocks: string[], blockTypes: string[]): Promise<[string[], string]> {
    var newText, textSoFar: string = "";

    for (let index = 0; index < splitBlocks.length; index++) {
      newText = resolveBodyReferences(splitBlocks, index, textSoFar)
      splitBlocks[index] = newText
      
      switch (blockTypes[index]) {
        case "text":
          textSoFar = textSoFar.concat(newText);
          break;
          case "js":
            splitBlocks[index] = await waitEval(app, splitBlocks[index]);
            textSoFar = textSoFar.concat(splitBlocks[index]);
            break;
            case "dual":
              splitBlocks[index] = await runCommand(app, newText);
              textSoFar = textSoFar.concat(splitBlocks[index]);
            }
    }

    return [splitBlocks, textSoFar];
  }

  // Wait for eval wrapper
  export async function waitEval(app: App, toEval: string): Promise<string> {
    return eval(toEval);
  };

  // Fill in "#N" structures in recipe output based on reference code block output
  export function resolveOutputReferences(splitBlocks: string[], textSoFar: string, outputPattern: string) {
    outputPattern = outputPattern.replace("#0", textSoFar)

    for (let referencedCodeBlock = 1; referencedCodeBlock <= 10; referencedCodeBlock++) {
      outputPattern = outputPattern.replace("#" + referencedCodeBlock, splitBlocks[referencedCodeBlock * 2 - 1])
    }

    return outputPattern;
  }

  // Fill in "#N" structures in recipe body based on reference code block output
  export function resolveBodyReferences(splitBlocks: string[], reachedIndex: number, textSoFar: string) {
    var newText = splitBlocks[reachedIndex].trim()
    newText = newText.replace("#0", textSoFar)

    for (let referencedCodeBlock = 1; referencedCodeBlock <= reachedIndex / 2; referencedCodeBlock++) {
      newText = newText.replace("#" + referencedCodeBlock, splitBlocks[referencedCodeBlock * 2 - 1])
    }

    return newText;
  }

  // Get list of all blocks with type and contents
  export function splitBlocks(recipeContents: string, codeBlocks: [codeBlock: {"type": string, "contents": string, "start": number, "end": number}]) {
    var splitBlockList = [recipeContents], blockTypes = ["text"];

    for (let index = 0; index < codeBlocks.length; index++) {
      splitBlockList.push(codeBlocks[index]["contents"])
      blockTypes.push(codeBlocks[index]["type"])

      splitBlockList.push(splitBlockList[2 * index].slice(codeBlocks[index]["end"]))
      blockTypes.push("text")

      splitBlockList[2 * index] = splitBlockList[2 * index].slice(0, codeBlocks[index]["start"])

      for (let indexFuture = index + 1; indexFuture < codeBlocks.length; indexFuture++) {
        codeBlocks[indexFuture]["start"] -= splitBlockList[2 * index].length + codeBlocks[index]["end"] - codeBlocks[index]["start"];
        codeBlocks[indexFuture]["end"] -= splitBlockList[2 * index].length + codeBlocks[index]["end"] - codeBlocks[index]["start"];
      }
    }

    splitBlockList.forEach((val, index, arr) => {
      arr[index] = val.trim()
    })

    return [splitBlockList, blockTypes]
  }

  // Get a list of code blocks with details
  export function detectCodeBlocks(recipeContents: string) {
    var m, res: any = [], re = RegExp(/\`\`\`(?<type>\w+)(?<contents>(?:\`[^\`]|[^\`])*)\`\`\`/, "g")

    do {
        m = re.exec(recipeContents);
        if (m) {
            res = res.concat({
                type: m["groups"]["type"],
                contents: m["groups"]["contents"].trim(),
                start: m["index"],
                end: m["index"] + m[0].length
            })
        }
    } while (m);

    return res;
  }

  // Get list of ingredient names mentioned in a recipe
  export async function getPlaceholders(app: App, recipeContents: string) {
    var re = /\*[^\*]*\*/g;
    var placeholders = recipeContents.match(re);

    if (placeholders != null) {
      placeholders.forEach((val, index, placeholders) => {
        placeholders[index] = val.substring(1, val.length - 1);
      });

      return placeholders;
    }

    return []
  }

  // Parse ingredients from the query
  export async function getIngredients(
    query: string,
    placeholders: string[]
  ) {
    var ingredients: string[] = [],
      res;

    for (let index = 0; index < placeholders.length; index++) {
      res = await getIngredient(query, placeholders[index]);
      ingredients = ingredients.concat(res);
    }

    return ingredients;
  }

  // Parse one ingredient from the query
  export async function getIngredient(query: string, placeholder: string) {
    if (placeholder == "quoted content") {
      var ingredient = RegExp(/"[\s\S]*"/g).exec(query)[0]
      ingredient = ingredient.substring(1, ingredient.length - 1)
      return ingredient
    }

    var prompt: string =
      getIngredientPrompt + query + "\n" + placeholder + ': "';

    const rawResponse = await fetch("http://127.0.0.1:5000/generate/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        early_stopping_criterion: "finish_paragraph",
        max_generated_token_count: Math.floor(query.length * 0.4),
        attitude: "mechanic"
      }),
    });

    var content = await rawResponse.json();
    content = content["output"][0];
    content = content.split('"')[0];
    
    return content;
  }

  // Get two parallel lists of query examples and the paths they originate from
  export function getExamples(app: App) {
    var examples: string[] = [];
    var paths: string[] = [];

    app.vault.getMarkdownFiles().forEach((file) => {
      if (file.path.startsWith("dual-recipes")) {
        app.metadataCache
          .getFileCache(file)
          .frontmatter["examples"].forEach((example: string) => {
            examples = examples.concat(example);
            paths = paths.concat(file.path);
          });
      }
    });

    return [examples, paths];
  }

  // Get contents of a recipe at a path
  export async function getRecipeContents(app: App, path: string) {
    var markdownFiles = app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == path) {
        return await app.vault.cachedRead(markdownFiles[index]);
      }
    }
  }

  // Get output pattern of a recipe at a path
  export async function getOutputPattern(app: App, path: string) {
    var markdownFiles = app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == path) {
        return app.metadataCache
          .getFileCache(markdownFiles[index])
          .frontmatter["output"]
      }
    }
  }

  // Find closest recipe to a given query through examples
  export async function matchQuery(app: App, query: string) {
    query = query.replace(/"[\s\S]*"/, '""')
    var examplePathPairs = getExamples(app);
    var examples = examplePathPairs[0],
      paths = examplePathPairs[1];

    const rawResponse = await fetch("http://127.0.0.1:5000/extract/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        documents: examples,
        selected_candidates: 1,
      }),
    });

    var content = await rawResponse.json();
    return paths[content["output"][0]];
  }

  // Substitute placeholders with ingredients in a recipe
  export function resolvePlaceholders(recipeContents: string, placeholders: string[], ingredients: string[]) {
    for (let index = 0; index < placeholders.length; index++) {
        var re = RegExp("\\*" + placeholders[index] + "\\*", "g")
        recipeContents = recipeContents.replace(re, ingredients[index])
    }

    return recipeContents
  }

  export function removeFrontMatter(recipeContents: string) {
    recipeContents = recipeContents.replace(/---[\s\S]*---/g, "")
    return recipeContents.trim() 
  }

  export async function getNotes(app: App) {
    var markdownFiles = app.vault.getMarkdownFiles();
    var notes: string[] = [];

    for (let index = 0; index < markdownFiles.length; index++) {
      if (!markdownFiles[index].path.startsWith('dual-recipes')) {
        var note = await app.vault.cachedRead(markdownFiles[index]);
        note = Utils.removeMd(note, {});
        notes.push(note);
      }
    }

    return notes
  }

  const getIngredientPrompt: string = `query: Come up with a writing prompt about aliens and robots.
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

query: How can first-order logic be used in AI?
query: "How can first-order logic be used in AI?"

query: What's the connection between a bridge and a metaphor?
query: "What's the connection between a bridge and a metaphor?"

query: What would be a useful analogy for understanding pupillometry?
concept: "pupillometry"

query: What are some possible applications of brain-computer interfaces?
technology: "brain-computer interfaces"

query: How can I say "sprandel" in Romanian?
language: "Romanian"

query: What's the relation between neuroscience and dynamical systems?
query: "What's the relation between neuroscience and dynamical systems?"

query: How would a school look like in Victorian London?
context: "Victorian London"

query: Translate "Ik ben een olifant" in English
target language: "English"

query: What is the role of genetic material?
query: "What is the role of genetic material?"

query: Come up with a setting for a science fiction book.
genre: "science fiction"

query: What is autonomic arousal?
query: "What is autonomic arousal?"

query: Try to come up with an exercise on thermodynamics.
subject: "thermodynamics"

query: What's the difference between realism and idealism?
query: "What's the difference between realism and idealism?"

query: Come up with a parallel for: neuron, brain.
sequence: "neuron, brain"

query: Darwin, what is the origin of species?
person: "Darwin"

query: What is the meaning of life?
query: "What is the meaning of life?"

query: Mix the concepts brain and science
first concept: "brain"

query: How can we build artificial general intelligence?
query: "How can we build artificial general intelligence?"

query: Isaac Asimov, come up with a writing prompt about space exploration.
person: "Isaac Asimov"

query: Why is consciousness a thing?
query: "Why is consciousness a thing?"

query: How can a conversational interface be used?
query: "How can a conversational interface be used?"

query: Merge the concepts human and chaos.
second concept: "chaos"

query: How can version control help
query: "How can version control help?"

query: Come up with an analogy for: sun, planet, solar system
sequence: "sun, planet, solar system"

query: Look for notes about pupillometry.
topic: "pupillometry"

query: Combine the concepts computer and virus.
second concept: "virus"

query: What is evolution?
query: "What is evolution?"

query: What's the connection between the brain and a stadium?
query: "What's the connection between the brain and a stadium?" 

query: `;
}