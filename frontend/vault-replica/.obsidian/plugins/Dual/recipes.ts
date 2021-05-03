import { App } from "obsidian";

export module Recipes {

  export async function followRecipe(app: App, path: string, query: string) {
    var recipeContents: string = await getRecipeContents(app, path);
    var placeholders: string[] = await getPlaceholders(app, recipeContents);
    var ingredients: string[] = ["blockchain", "advertising"]; //await getIngredients(query, placeholders);
    recipeContents = removeFrontMatter(recipeContents)
    recipeContents = resolvePlaceholders(recipeContents, placeholders, ingredients);

    var codeBlocks = detectCodeBlocks(recipeContents)
    var [splitBlockList, blockTypes] = splitBlocks(recipeContents, codeBlocks)
    interpretBlocks(splitBlockList, blockTypes)
  }

  // Walk through blocks and take actions based on them
  export function interpretBlocks(splitBlocks: string[], blockTypes: string[]) {
    var newText, textSoFar: string = "";

    for (let index = 0; index < splitBlocks.length; index++) {
      newText = resolveReferences(splitBlocks, index, textSoFar)
      splitBlocks[index] = newText
      console.log(index, splitBlocks[index])

      switch (blockTypes[index]) {
        case "text":
          textSoFar = textSoFar.concat(newText);
          break;
        case "js":
          splitBlocks[index] = eval(splitBlocks[index])
          textSoFar = textSoFar.concat(splitBlocks[index]);
          break;
        case "dual":
          splitBlocks[index] = "\n<" + newText + ">\n"
          textSoFar = textSoFar.concat(splitBlocks[index]);
      }
    }

    console.log(textSoFar)
  }

  // Fill in "#N" structures based on reference code block output
  export function resolveReferences(splitBlocks: string[], reachedIndex: number, textSoFar: string) {
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
    var m, res: any = [], re = RegExp(/\`\`\`(?<type>\w+)(?<contents>[^\`]*)\`\`\`/, "g")

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

    placeholders.forEach((val, index, placeholders) => {
      placeholders[index] = val.substring(1, val.length - 1);
    });

    return placeholders;
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
      res = res.split('"')[0];
      ingredients = ingredients.concat(res);
    }

    return ingredients;
  }

  // Parse one ingredient from the query
  export async function getIngredient(query: string, placeholder: string) {
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
        max_generated_token_count: Math.floor(query.length * 0.3),
      }),
    });

    var content = await rawResponse.json();
    content = content["output"][0];
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

  // Find closest example to a given query
  export async function matchQuery(app: App, query: string) {
    var examplePathPairs = this.getExamples(app);
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

query: `;
}
