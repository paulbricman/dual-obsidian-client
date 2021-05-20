import { App, FrontMatterCache } from "obsidian";
import { Utils } from "utils";

export class SkillManager {
  app: App;
  skillMetadata: FrontMatterCache;
  skillContents: string;

  constructor(app: App) {
    this.app = app;
  }

  // Returns result of following a command
  async followCommand(command: string) {
    var skillPath = await this.matchCommand(command);
    console.log("FOLLOWING", command, "USING", skillPath);
    var result = this.useSkill(skillPath, command);

    return result;
  }

  // Uses a skill when following a command
  async useSkill(skillPath: string, command: string) {
    await this.loadSkillContents(skillPath);
    this.loadSkillMetadata(skillPath);
    this.removeFrontMatter();

    var params: string[] = await this.getParams(this.skillContents);
    var args: string[] = await this.getArgs(command, params);
    this.skillContents = this.resolveParams(this.skillContents, params, args);

    var codeBlocks = this.detectCodeBlocks();
    var [splitBlockList, blockTypes] = this.splitBlocks(codeBlocks);
    var [splitBlockList, textSoFar] = await this.interpretBlocks(
      splitBlockList,
      blockTypes
    );

    var result = this.getLastBlock(splitBlockList);
    return result;
  }

  // Walk through blocks and take actions based on them
  async interpretBlocks(
    splitBlocks: string[],
    blockTypes: string[]
  ): Promise<[string[], string]> {
    var newText,
      textSoFar: string = "";

    for (let index = 0; index < splitBlocks.length; index++) {
      newText = this.resolveBodyReferences(
        splitBlocks,
        blockTypes,
        index,
        textSoFar
      );
      splitBlocks[index] = newText;

      switch (blockTypes[index]) {
        case "text":
          textSoFar = textSoFar.concat(newText);
          break;
        case "js":
          splitBlocks[index] = await this.waitEval(splitBlocks[index]);
          textSoFar = textSoFar.concat(splitBlocks[index]);
          break;
        case "dual":
          splitBlocks[index] = await this.followCommand(newText);
          textSoFar = textSoFar.concat(splitBlocks[index] + " ");
      }
    }

    return [splitBlocks, textSoFar];
  }

  // Wait for eval wrapper
  async waitEval(toEval: string): Promise<string> {
    return eval(toEval);
  }

  // Fill in "#N" structures in skill body based on reference code block result
  resolveBodyReferences(
    splitBlocks: string[],
    blockTypes: string[],
    reachedIndex: number,
    textSoFar: string
  ) {
    var newText = splitBlocks[reachedIndex];
    newText = newText.replace("#0", textSoFar);

    for (
      let referencedCodeBlock = 1;
      referencedCodeBlock <= reachedIndex;
      referencedCodeBlock++
    ) {
      if (newText.includes("#" + referencedCodeBlock)) {
        var remainingCodeBlocks = referencedCodeBlock;

        for (
          let blockIndex = 0;
          blockIndex < splitBlocks.length && remainingCodeBlocks > 0;
          blockIndex++
        ) {
          if (
            splitBlocks[blockIndex].toString().trim() != "" ||
            blockTypes[blockIndex] != "text"
          ) {
            remainingCodeBlocks--;
          }

          if (remainingCodeBlocks == 0) {
            newText = newText.replace(
              "#" + referencedCodeBlock,
              splitBlocks[blockIndex]
            );
          }
        }
      }
    }

    return newText;
  }

  getLastBlock(splitBlocks: string[]) {
    for (
      let blockIndex = splitBlocks.length - 1;
      blockIndex >= 0;
      blockIndex--
    ) {
      if (splitBlocks[blockIndex].toString().trim() != "") {
        return splitBlocks[blockIndex];
      }
    }
  }

  // Get list of all blocks with type and contents
  splitBlocks(
    codeBlocks: [
      codeBlock: { type: string; contents: string; start: number; end: number }
    ]
  ) {
    var splitBlockList = [this.skillContents],
      blockTypes = ["text"];

    for (let index = 0; index < codeBlocks.length; index++) {
      splitBlockList.push(codeBlocks[index]["contents"]);
      blockTypes.push(codeBlocks[index]["type"]);

      splitBlockList.push(
        splitBlockList[2 * index].slice(codeBlocks[index]["end"])
      );
      blockTypes.push("text");

      splitBlockList[2 * index] = splitBlockList[2 * index].slice(
        0,
        codeBlocks[index]["start"]
      );

      for (
        let indexFuture = index + 1;
        indexFuture < codeBlocks.length;
        indexFuture++
      ) {
        codeBlocks[indexFuture]["start"] -=
          splitBlockList[2 * index].length +
          codeBlocks[index]["end"] -
          codeBlocks[index]["start"];
        codeBlocks[indexFuture]["end"] -=
          splitBlockList[2 * index].length +
          codeBlocks[index]["end"] -
          codeBlocks[index]["start"];
      }
    }

    return [splitBlockList, blockTypes];
  }

  // Get a list of code blocks with details
  detectCodeBlocks() {
    var m,
      res: any = [],
      re = RegExp(
        /\`\`\`(?<type>\w+)(?<contents>(?:\`[^\`]|[^\`])*)\`\`\`/,
        "g"
      );

    do {
      m = re.exec(this.skillContents);
      if (m) {
        res = res.concat({
          type: m["groups"]["type"],
          contents: m["groups"]["contents"].trim(),
          start: m["index"],
          end: m["index"] + m[0].length,
        });
      }
    } while (m);

    return res;
  }

  // Get list of parameters mentioned in a skill
  async getParams(document: string) {
    var re = /\*[a-zA-Z0-9\s]*\*/g;
    var params = document.match(re);

    if (params != null) {
      params.forEach((val, index, params) => {
        params[index] = val.substring(1, val.length - 1);
      });

      return params;
    }

    return [];
  }

  // Parse arguments from the command
  async getArgs(command: string, params: string[]) {
    var args: string[] = [],
      res;

    for (let index = 0; index < params.length; index++) {
      res = await this.getArg(command, params[index]);
      args = args.concat(res);
    }

    return args;
  }

  // Parse one argument from the command
  async getArg(command: string, param: string) {
    if (param == Object.keys(this.skillMetadata[0])[0]) {
      return command;
    }

    var prompt: string = this.getParamPrompt(command, param);

    const rawResponse = await fetch("http://127.0.0.1:5000/generate/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        behavior: "parse_args",
        pool: command,
      }),
    });

    var content = await rawResponse.json();
    content = content["result"][0];
    content = content.split('"')[0];

    return content;
  }

  getParamPrompt(command: string, param: string) {
    var commandParam: string;
    var prompt: string;

    // TODO do ablation
    prompt = "Extract " + param + " from the following:\n\n";

    commandParam = Object.keys(this.skillMetadata[0])[0];

    this.skillMetadata.forEach((val: any, index: any, array: any) => {
      if (commandParam in val && param in val) {
        if (Math.random() >= 0.5) {
          prompt += val[commandParam] + ' => "' + val[param] + '"\n\n';
        } else {
          prompt += val[commandParam] + ' => " ' + val[param] + '"\n\n';
        }
      }
    });

    prompt += command + ' => "';
    return prompt;
  }

  // Get two parallel lists of command examples and the paths they originate from
  getCommandExamples() {
    var commandExamples: string[] = [];
    var skillPaths: string[] = [];
    var commandExampleParam: string;
    var newCommandExample: string;

    this.app.vault.getMarkdownFiles().forEach((file) => {
      if (file.path.startsWith("skillset")) {
        commandExampleParam = Object.keys(
          this.app.metadataCache.getFileCache(file).frontmatter[0]
        )[0];

        this.app.metadataCache
          .getFileCache(file)
          .frontmatter.forEach((val: any, index: any, array: any) => {
            if (commandExampleParam in val) {
              newCommandExample = val[commandExampleParam];

              Object.entries(val).forEach((field, fieldIndex, fieldArray) => {
                if (fieldIndex > 0) {
                  newCommandExample = newCommandExample.replace(
                    field[1],
                    " ___ "
                  );
                }
              });

              commandExamples = commandExamples.concat(newCommandExample);
              skillPaths = skillPaths.concat(file.path);
            }
          });
      }
    });

    return [commandExamples, skillPaths];
  }

  // Get contents of a skill at a path
  async loadSkillContents(skillPath: string) {
    var markdownFiles = this.app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == skillPath) {
        this.skillContents = await this.app.vault.cachedRead(
          markdownFiles[index]
        );
      }
    }
  }

  // Get metadata of a skill at a path
  loadSkillMetadata(skillPath: string) {
    var markdownFiles = this.app.vault.getMarkdownFiles();

    for (let index = 0; index < markdownFiles.length; index++) {
      if (markdownFiles[index].path == skillPath) {
        this.skillMetadata = this.app.metadataCache.getFileCache(
          markdownFiles[index]
        ).frontmatter;
      }
    }
  }

  // Find closest skill to a given command through examples
  async matchCommand(command: string) {
    // Hide quoted content from command matching
    command = command.replace(/"[\s\S]*"/, '""');
    var examplePathPairs = this.getCommandExamples();
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
  resolveParams(document: string, params: string[], args: string[]) {
    for (let index = 0; index < params.length; index++) {
      var re = RegExp("\\*" + params[index] + "\\*", "g");
      document = document.replace(re, args[index]);
    }

    return document;
  }

  removeFrontMatter() {
    this.skillContents = this.skillContents.replace(/---[\s\S]*---/g, "");
  }

  async getNotes() {
    var markdownFiles = this.app.vault.getMarkdownFiles();
    var notes: string[] = [];

    for (let index = 0; index < markdownFiles.length; index++) {
      if (!markdownFiles[index].path.startsWith("skillset")) {
        var note = await this.app.vault.cachedRead(markdownFiles[index]);
        note = Utils.removeMd(note, {});
        notes.push(note);
      }
    }

    return notes;
  }
}
