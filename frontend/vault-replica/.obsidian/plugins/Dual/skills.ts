import { App } from "obsidian";
import { Utils } from "utils";

export module Skills {

  // Returns result of following a command 
  export async function followCommand(app: App, command: string) {
    var skillPath = await matchCommand(app, command);
    console.log('FOLLOWING', command, 'USING', skillPath);
    var result = useSkill(app, skillPath, command);

    return result
  }

  // Uses a skill when following a command
  export async function useSkill(app: App, skillPath: string, command: string) {
    var skillContents: string = await getSkillContents(app, skillPath);
    var resultPattern: string = await getResultPattern(app, skillPath);
    skillContents = removeFrontMatter(skillContents)

    var params: string[] = await getParams(app, skillContents);
    var args: string[] = await getArgs(command, params);
    skillContents = resolveParams(skillContents, params, args);

    var codeBlocks = detectCodeBlocks(skillContents)
    var [splitBlockList, blockTypes] = splitBlocks(skillContents, codeBlocks)
    var [splitBlockList, textSoFar] = await interpretBlocks(app, splitBlockList, blockTypes)
    
    var result = resolveResultReferences(splitBlockList, textSoFar, resultPattern)
    var resultParams: string[] = await getParams(app, result);
    var resultArgs: string[] = await getArgs(command, resultParams);
    result = resolveParams(result, resultParams, resultArgs);

    return result
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
          splitBlocks[index] = await followCommand(app, newText);
          textSoFar = textSoFar.concat(splitBlocks[index] + " ");
      }
    }

    return [splitBlocks, textSoFar];
  }

  // Wait for eval wrapper
  export async function waitEval(app: App, toEval: string): Promise<string> {
    return eval(toEval);
  };

  // Fill in "#N" structures in skill result based on reference code block result
  export function resolveResultReferences(splitBlocks: string[], textSoFar: string, resultPattern: string) {
    resultPattern = resultPattern.replace("#0", textSoFar)

    for (let referencedCodeBlock = 1; referencedCodeBlock <= 10; referencedCodeBlock++) {
      resultPattern = resultPattern.replace("#" + referencedCodeBlock, splitBlocks[referencedCodeBlock * 2 - 1])
    }

    return resultPattern;
  }

  // Fill in "#N" structures in skill body based on reference code block result
  export function resolveBodyReferences(splitBlocks: string[], reachedIndex: number, textSoFar: string) {
    // change numbering scheme to include text blocks?
    var newText = splitBlocks[reachedIndex].trim() + " ";
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
      arr[index] = val.trim() + " ";
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

  // Get list of parameters mentioned in a skill
  export async function getParams(app: App, skillContents: string) {
    var re = /\*[^\*]*\*/g;
    var params = skillContents.match(re);

    if (params != null) {
      params.forEach((val, index, params) => {
        params[index] = val.substring(1, val.length - 1);
      });

      return params;
    }

    return []
  }

  // Parse arguments from the command
  export async function getArgs(
    command: string,
    params: string[]
  ) {
    var args: string[] = [], res;

    for (let index = 0; index < params.length; index++) {
      res = await getArg(command, params[index]);
      args = args.concat(res);
    }

    return args;
  }

  // Parse one argument from the command
  export async function getArg(command: string, param: string) {
    if (param == "quoted content") {
      var argument = RegExp(/"[\s\S]*"/g).exec(command)[0]
      argument = argument.substring(1, argument.length - 1)
      return argument
    }

    var prompt: string = getArgPrompt + command + "\n" + param + ": \"";
    console.log(prompt)

    const rawResponse = await fetch("http://127.0.0.1:5000/generate/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        behavior: "parse_args",
        pool: command
      }),
    });

    var content = await rawResponse.json();
    content = content["result"][0];
    content = content.split('"')[0];
    
    return content;
  }

  // Get two parallel lists of command examples and the paths they originate from
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

  // Get contents of a skill at a path
  export async function getSkillContents(app: App, skillPath: string) {
    var markdownFiles = app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == skillPath) {
        return await app.vault.cachedRead(markdownFiles[index]);
      }
    }
  }

  // Get result pattern of a skill at a path
  export async function getResultPattern(app: App, path: string) {
    var markdownFiles = app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == path) {
        return app.metadataCache
          .getFileCache(markdownFiles[index])
          .frontmatter["output"]
      }
    }
  }

  // Find closest skill to a given command through examples
  export async function matchCommand(app: App, command: string) {
    command = command.replace(/"[\s\S]*"/, '""')
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
        query: command,
        documents: examples,
        selected_candidates: 1,
      }),
    });

    var content = await rawResponse.json();
    return paths[content["result"][0]];
  }

  // Substitute parameters with arguments in a skill
  export function resolveParams(skillContents: string, params: string[], args: string[]) {
    for (let index = 0; index < params.length; index++) {
        var re = RegExp("\\*" + params[index] + "\\*", "g")
        skillContents = skillContents.replace(re, args[index])
    }

    return skillContents
  }

  export function removeFrontMatter(skillContents: string) {
    skillContents = skillContents.replace(/---[\s\S]*---/g, "")
    return skillContents.trim() 
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

  const getArgPrompt: string = `query: Come up with a writing prompt about aliens and robots.
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

query: Blue is to color as circle is to...
query: "Blue is to color as circle is to..."

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

query: A bowl is to a soup as
query: "A bowl is to a soup as"

query: How can a conversational interface be used?
query: "How can a conversational interface be used?"

query: Merge the concepts human and chaos.
second concept: "chaos"

query: How can version control help
query: "How can version control help?"

query: A tree is to a bark as a person is to...
query: "A tree is to a bark as a person is to..."

query: Come up with an analogy for: sun, planet, solar system
sequence: "sun, planet, solar system"

query: Look for notes about pupillometry.
topic: "pupillometry"

query: Combine the concepts computer and virus.
second concept: "virus"

query: What is evolution?
query: "What is evolution?"

query: Come up with a fitting term for an indicator of robot cuteness
description: "an indicator of robot cuteness"

query: What's the connection between the brain and a stadium?
query: "What's the connection between the brain and a stadium?" 

query: `;
}