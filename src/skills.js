import { __awaiter } from "tslib";
import { Utils } from "./utils";
import { fetchGenerate, fetchSearch } from "./network";
export class SkillManager {
    constructor(app) {
        this.app = app;
    }
    // Returns result of following a command
    followCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            var skillPath = yield this.matchCommand(command);
            console.log("FOLLOWING", command, "USING", skillPath);
            var result = this.useSkill(skillPath, command);
            return result;
        });
    }
    // Uses a skill when following a command
    useSkill(skillPath, command) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSkillContents(skillPath);
            this.loadSkillMetadata(skillPath);
            this.removeFrontMatter();
            var params = yield this.getParams(this.skillContents);
            var args = yield this.getArgs(command, params);
            this.skillContents = this.resolveParams(this.skillContents, params, args);
            var codeBlocks = this.detectCodeBlocks();
            var [splitBlockList, blockTypes] = this.splitBlocks(codeBlocks);
            var [splitBlockList, textSoFar] = yield this.interpretBlocks(splitBlockList, blockTypes);
            var result = this.getLastBlock(splitBlockList);
            return result;
        });
    }
    // Walk through blocks and take actions based on them
    interpretBlocks(splitBlocks, blockTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            var newText, textSoFar = "";
            for (let index = 0; index < splitBlocks.length; index++) {
                newText = this.resolveBodyReferences(splitBlocks, blockTypes, index, textSoFar);
                splitBlocks[index] = newText;
                switch (blockTypes[index]) {
                    case "text":
                        textSoFar = textSoFar.concat(newText);
                        break;
                    case "js":
                        splitBlocks[index] = yield this.waitEval(splitBlocks[index]);
                        textSoFar = textSoFar.concat(splitBlocks[index]);
                        break;
                    case "dual":
                        splitBlocks[index] = yield this.followCommand(newText);
                        textSoFar = textSoFar.concat(splitBlocks[index] + " ");
                }
            }
            return [splitBlocks, textSoFar];
        });
    }
    // Wait for eval wrapper
    waitEval(toEval) {
        return __awaiter(this, void 0, void 0, function* () {
            return eval(toEval);
        });
    }
    // Fill in "#N" structures in skill body based on reference code block result
    resolveBodyReferences(splitBlocks, blockTypes, reachedIndex, textSoFar) {
        var newText = splitBlocks[reachedIndex];
        newText = newText.replace("#0", textSoFar);
        for (let referencedCodeBlock = 1; referencedCodeBlock <= reachedIndex; referencedCodeBlock++) {
            if (newText.includes("#" + referencedCodeBlock)) {
                var remainingCodeBlocks = referencedCodeBlock;
                for (let blockIndex = 0; blockIndex < splitBlocks.length && remainingCodeBlocks > 0; blockIndex++) {
                    if (splitBlocks[blockIndex].toString().trim() != "" ||
                        blockTypes[blockIndex] != "text") {
                        remainingCodeBlocks--;
                    }
                    if (remainingCodeBlocks == 0) {
                        newText = newText.replace("#" + referencedCodeBlock, splitBlocks[blockIndex]);
                    }
                }
            }
        }
        return newText;
    }
    getLastBlock(splitBlocks) {
        for (let blockIndex = splitBlocks.length - 1; blockIndex >= 0; blockIndex--) {
            if (splitBlocks[blockIndex].toString().trim() != "") {
                return splitBlocks[blockIndex];
            }
        }
    }
    // Get list of all blocks with type and contents
    splitBlocks(codeBlocks) {
        var splitBlockList = [this.skillContents], blockTypes = ["text"];
        for (let index = 0; index < codeBlocks.length; index++) {
            splitBlockList.push(codeBlocks[index]["contents"]);
            blockTypes.push(codeBlocks[index]["type"]);
            splitBlockList.push(splitBlockList[2 * index].slice(codeBlocks[index]["end"]));
            blockTypes.push("text");
            splitBlockList[2 * index] = splitBlockList[2 * index].slice(0, codeBlocks[index]["start"]);
            for (let indexFuture = index + 1; indexFuture < codeBlocks.length; indexFuture++) {
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
        let m, res = [];
        const re = RegExp(/\`\`\`(?<type>\w+)(?<contents>(?:\`[^\`]|[^\`])*)\`\`\`/, "g");
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
    getParams(document) {
        return __awaiter(this, void 0, void 0, function* () {
            var re = /\*[a-zA-Z0-9\s]*\*/g;
            var params = document.match(re);
            if (params != null) {
                params.forEach((val, index, params) => {
                    params[index] = val.substring(1, val.length - 1);
                });
                return params;
            }
            return [];
        });
    }
    // Parse arguments from the command
    getArgs(command, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var args = [], res;
            for (let index = 0; index < params.length; index++) {
                res = yield this.getArg(command, params[index]);
                args = args.concat(res);
            }
            return args;
        });
    }
    // Parse one argument from the command
    getArg(command, param) {
        return __awaiter(this, void 0, void 0, function* () {
            if (param == Object.keys(this.skillMetadata[0])[0]) {
                return command;
            }
            var prompt = this.getParamPrompt(command, param);
            const rawResponse = yield fetchGenerate({
                prompt: prompt,
                context: [command],
                generate_paragraphs: 1,
            });
            var content = yield rawResponse.json();
            content = content["output"][0].trim();
            return content;
        });
    }
    getParamPrompt(command, param) {
        var commandParam;
        var prompt;
        // TODO do ablation
        prompt = "Extract " + param + " from the following:\n\n";
        commandParam = Object.keys(this.skillMetadata[0])[0];
        this.skillMetadata.forEach((val, index, array) => {
            if (commandParam in val && param in val) {
                if (Math.random() >= 0.6) {
                    prompt += val[commandParam] + " => " + val[param] + "\n\n";
                }
                else {
                    prompt += val[commandParam] + " =>  " + val[param] + "\n\n";
                }
            }
        });
        prompt += command + " => ";
        return prompt;
    }
    // Get two parallel lists of command examples and the paths they originate from
    getCommandExamples() {
        var commandExamples = [];
        var skillPaths = [];
        var commandExampleParam;
        var newCommandExample;
        this.app.vault.getMarkdownFiles().forEach((file) => {
            if (file.path.startsWith("skillset")) {
                commandExampleParam = Object.keys(this.app.metadataCache.getFileCache(file).frontmatter[0])[0];
                this.app.metadataCache
                    .getFileCache(file)
                    .frontmatter.forEach((val, index, array) => {
                    if (commandExampleParam in val) {
                        newCommandExample = val[commandExampleParam];
                        Object.entries(val).forEach((field, fieldIndex, fieldArray) => {
                            if (fieldIndex > 0) {
                                newCommandExample = newCommandExample.replace(field[1], " ___ ");
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
    loadSkillContents(skillPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var markdownFiles = this.app.vault.getMarkdownFiles();
            for (let index = 0; index < markdownFiles.length; index++) {
                if (markdownFiles[index].path == skillPath) {
                    this.skillContents = yield this.app.vault.cachedRead(markdownFiles[index]);
                }
            }
        });
    }
    // Get metadata of a skill at a path
    loadSkillMetadata(skillPath) {
        var markdownFiles = this.app.vault.getMarkdownFiles();
        for (let index = 0; index < markdownFiles.length; index++) {
            if (markdownFiles[index].path == skillPath) {
                this.skillMetadata = this.app.metadataCache.getFileCache(markdownFiles[index]).frontmatter;
            }
        }
    }
    // Find closest skill to a given command through examples
    matchCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            // Hide quoted content from command matching
            command = command.replace(/"[\s\S]*"/, '""');
            var examplePathPairs = this.getCommandExamples();
            var examples = examplePathPairs[0], paths = examplePathPairs[1];
            // TODO: Refactor into network
            const rawResponse = yield fetchSearch({
                prompt: command,
                context: examples,
                generate_paragraphs: 1,
            });
            var content = yield rawResponse.json();
            return paths[content["output"][0]];
        });
    }
    // Substitute parameters with arguments in a skill
    resolveParams(document, params, args) {
        for (let index = 0; index < params.length; index++) {
            var re = RegExp("\\*" + params[index] + "\\*", "g");
            document = document.replace(re, args[index]);
        }
        return document;
    }
    removeFrontMatter() {
        this.skillContents = this.skillContents.replace(/---[\s\S]*---/g, "");
    }
    getNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            var markdownFiles = this.app.vault.getMarkdownFiles();
            var notes = [];
            for (let index = 0; index < markdownFiles.length; index++) {
                if (!markdownFiles[index].path.startsWith("skillset")) {
                    var note = yield this.app.vault.cachedRead(markdownFiles[index]);
                    note = Utils.removeMd(note);
                    notes.push(note);
                }
            }
            return notes;
        });
    }
}
/*
argmin => Argmin

reward systems => neural systems which regulate reward

RNNs and backpropagation => backpropagation through time with RNNs

metaphors of concepts => concepts are associated with rooms

NCC => neural correlates of consciousness

*topic* =>
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2tpbGxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXZELE1BQU0sT0FBTyxZQUFZO0lBS3ZCLFlBQVksR0FBUTtRQUNsQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNqQixDQUFDO0lBRUQsd0NBQXdDO0lBQ2xDLGFBQWEsQ0FBQyxPQUFlOztZQUNqQyxJQUFJLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUUvQyxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO0tBQUE7SUFFRCx3Q0FBd0M7SUFDbEMsUUFBUSxDQUFDLFNBQWlCLEVBQUUsT0FBZTs7WUFDL0MsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBRXpCLElBQUksTUFBTSxHQUFhLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDaEUsSUFBSSxJQUFJLEdBQWEsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFB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QUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2pFLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM1QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNsQjthQUNGO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0tBQUE7Q0FDRjtBQUVEOzs7Ozs7Ozs7Ozs7RUFZRSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgRnJvbnRNYXR0ZXJDYWNoZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgVXRpbHMgfSBmcm9tIFwiLi91dGlsc1wiO1xuaW1wb3J0IHsgZmV0Y2hHZW5lcmF0ZSwgZmV0Y2hTZWFyY2ggfSBmcm9tIFwiLi9uZXR3b3JrXCI7XG5cbmV4cG9ydCBjbGFzcyBTa2lsbE1hbmFnZXIge1xuICBhcHA6IEFwcDtcbiAgc2tpbGxNZXRhZGF0YTogRnJvbnRNYXR0ZXJDYWNoZTtcbiAgc2tpbGxDb250ZW50czogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwKSB7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gIH1cblxuICAvLyBSZXR1cm5zIHJlc3VsdCBvZiBmb2xsb3dpbmcgYSBjb21tYW5kXG4gIGFzeW5jIGZvbGxvd0NvbW1hbmQoY29tbWFuZDogc3RyaW5nKSB7XG4gICAgdmFyIHNraWxsUGF0aCA9IGF3YWl0IHRoaXMubWF0Y2hDb21tYW5kKGNvbW1hbmQpO1xuICAgIGNvbnNvbGUubG9nKFwiRk9MTE9XSU5HXCIsIGNvbW1hbmQsIFwiVVNJTkdcIiwgc2tpbGxQYXRoKTtcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy51c2VTa2lsbChza2lsbFBhdGgsIGNvbW1hbmQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFVzZXMgYSBza2lsbCB3aGVuIGZvbGxvd2luZyBhIGNvbW1hbmRcbiAgYXN5bmMgdXNlU2tpbGwoc2tpbGxQYXRoOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZykge1xuICAgIGF3YWl0IHRoaXMubG9hZFNraWxsQ29udGVudHMoc2tpbGxQYXRoKTtcbiAgICB0aGlzLmxvYWRTa2lsbE1ldGFkYXRhKHNraWxsUGF0aCk7XG4gICAgdGhpcy5yZW1vdmVGcm9udE1hdHRlcigpO1xuXG4gICAgdmFyIHBhcmFtczogc3RyaW5nW10gPSBhd2FpdCB0aGlzLmdldFBhcmFtcyh0aGlzLnNraWxsQ29udGVudHMpO1xuICAgIHZhciBhcmdzOiBzdHJpbmdbXSA9IGF3YWl0IHRoaXMuZ2V0QXJncyhjb21tYW5kLCBwYXJhbXMpO1xuICAgIHRoaXMuc2tpbGxDb250ZW50cyA9IHRoaXMucmVzb2x2ZVBhcmFtcyh0aGlzLnNraWxsQ29udGVudHMsIHBhcmFtcywgYXJncyk7XG5cbiAgICB2YXIgY29kZUJsb2NrcyA9IHRoaXMuZGV0ZWN0Q29kZUJsb2NrcygpO1xuICAgIHZhciBbc3BsaXRCbG9ja0xpc3QsIGJsb2NrVHlwZXNdID0gdGhpcy5zcGxpdEJsb2Nrcyhjb2RlQmxvY2tzKTtcbiAgICB2YXIgW3NwbGl0QmxvY2tMaXN0LCB0ZXh0U29GYXJdID0gYXdhaXQgdGhpcy5pbnRlcnByZXRCbG9ja3MoXG4gICAgICBzcGxpdEJsb2NrTGlzdCxcbiAgICAgIGJsb2NrVHlwZXNcbiAgICApO1xuXG4gICAgdmFyIHJlc3VsdCA9IHRoaXMuZ2V0TGFzdEJsb2NrKHNwbGl0QmxvY2tMaXN0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gV2FsayB0aHJvdWdoIGJsb2NrcyBhbmQgdGFrZSBhY3Rpb25zIGJhc2VkIG9uIHRoZW1cbiAgYXN5bmMgaW50ZXJwcmV0QmxvY2tzKFxuICAgIHNwbGl0QmxvY2tzOiBzdHJpbmdbXSxcbiAgICBibG9ja1R5cGVzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPFtzdHJpbmdbXSwgc3RyaW5nXT4ge1xuICAgIHZhciBuZXdUZXh0LFxuICAgICAgdGV4dFNvRmFyOiBzdHJpbmcgPSBcIlwiO1xuXG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHNwbGl0QmxvY2tzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgbmV3VGV4dCA9IHRoaXMucmVzb2x2ZUJvZHlSZWZlcmVuY2VzKFxuICAgICAgICBzcGxpdEJsb2NrcyxcbiAgICAgICAgYmxvY2tUeXBlcyxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIHRleHRTb0ZhclxuICAgICAgKTtcbiAgICAgIHNwbGl0QmxvY2tzW2luZGV4XSA9IG5ld1RleHQ7XG5cbiAgICAgIHN3aXRjaCAoYmxvY2tUeXBlc1tpbmRleF0pIHtcbiAgICAgICAgY2FzZSBcInRleHRcIjpcbiAgICAgICAgICB0ZXh0U29GYXIgPSB0ZXh0U29GYXIuY29uY2F0KG5ld1RleHQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwianNcIjpcbiAgICAgICAgICBzcGxpdEJsb2Nrc1tpbmRleF0gPSBhd2FpdCB0aGlzLndhaXRFdmFsKHNwbGl0QmxvY2tzW2luZGV4XSk7XG4gICAgICAgICAgdGV4dFNvRmFyID0gdGV4dFNvRmFyLmNvbmNhdChzcGxpdEJsb2Nrc1tpbmRleF0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiZHVhbFwiOlxuICAgICAgICAgIHNwbGl0QmxvY2tzW2luZGV4XSA9IGF3YWl0IHRoaXMuZm9sbG93Q29tbWFuZChuZXdUZXh0KTtcbiAgICAgICAgICB0ZXh0U29GYXIgPSB0ZXh0U29GYXIuY29uY2F0KHNwbGl0QmxvY2tzW2luZGV4XSArIFwiIFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW3NwbGl0QmxvY2tzLCB0ZXh0U29GYXJdO1xuICB9XG5cbiAgLy8gV2FpdCBmb3IgZXZhbCB3cmFwcGVyXG4gIGFzeW5jIHdhaXRFdmFsKHRvRXZhbDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXZhbCh0b0V2YWwpO1xuICB9XG5cbiAgLy8gRmlsbCBpbiBcIiNOXCIgc3RydWN0dXJlcyBpbiBza2lsbCBib2R5IGJhc2VkIG9uIHJlZmVyZW5jZSBjb2RlIGJsb2NrIHJlc3VsdFxuICByZXNvbHZlQm9keVJlZmVyZW5jZXMoXG4gICAgc3BsaXRCbG9ja3M6IHN0cmluZ1tdLFxuICAgIGJsb2NrVHlwZXM6IHN0cmluZ1tdLFxuICAgIHJlYWNoZWRJbmRleDogbnVtYmVyLFxuICAgIHRleHRTb0Zhcjogc3RyaW5nXG4gICkge1xuICAgIHZhciBuZXdUZXh0ID0gc3BsaXRCbG9ja3NbcmVhY2hlZEluZGV4XTtcbiAgICBuZXdUZXh0ID0gbmV3VGV4dC5yZXBsYWNlKFwiIzBcIiwgdGV4dFNvRmFyKTtcblxuICAgIGZvciAoXG4gICAgICBsZXQgcmVmZXJlbmNlZENvZGVCbG9jayA9IDE7XG4gICAgICByZWZlcmVuY2VkQ29kZUJsb2NrIDw9IHJlYWNoZWRJbmRleDtcbiAgICAgIHJlZmVyZW5jZWRDb2RlQmxvY2srK1xuICAgICkge1xuICAgICAgaWYgKG5ld1RleHQuaW5jbHVkZXMoXCIjXCIgKyByZWZlcmVuY2VkQ29kZUJsb2NrKSkge1xuICAgICAgICB2YXIgcmVtYWluaW5nQ29kZUJsb2NrcyA9IHJlZmVyZW5jZWRDb2RlQmxvY2s7XG5cbiAgICAgICAgZm9yIChcbiAgICAgICAgICBsZXQgYmxvY2tJbmRleCA9IDA7XG4gICAgICAgICAgYmxvY2tJbmRleCA8IHNwbGl0QmxvY2tzLmxlbmd0aCAmJiByZW1haW5pbmdDb2RlQmxvY2tzID4gMDtcbiAgICAgICAgICBibG9ja0luZGV4KytcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgc3BsaXRCbG9ja3NbYmxvY2tJbmRleF0udG9TdHJpbmcoKS50cmltKCkgIT0gXCJcIiB8fFxuICAgICAgICAgICAgYmxvY2tUeXBlc1tibG9ja0luZGV4XSAhPSBcInRleHRcIlxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmVtYWluaW5nQ29kZUJsb2Nrcy0tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChyZW1haW5pbmdDb2RlQmxvY2tzID09IDApIHtcbiAgICAgICAgICAgIG5ld1RleHQgPSBuZXdUZXh0LnJlcGxhY2UoXG4gICAgICAgICAgICAgIFwiI1wiICsgcmVmZXJlbmNlZENvZGVCbG9jayxcbiAgICAgICAgICAgICAgc3BsaXRCbG9ja3NbYmxvY2tJbmRleF1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld1RleHQ7XG4gIH1cblxuICBnZXRMYXN0QmxvY2soc3BsaXRCbG9ja3M6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChcbiAgICAgIGxldCBibG9ja0luZGV4ID0gc3BsaXRCbG9ja3MubGVuZ3RoIC0gMTtcbiAgICAgIGJsb2NrSW5kZXggPj0gMDtcbiAgICAgIGJsb2NrSW5kZXgtLVxuICAgICkge1xuICAgICAgaWYgKHNwbGl0QmxvY2tzW2Jsb2NrSW5kZXhdLnRvU3RyaW5nKCkudHJpbSgpICE9IFwiXCIpIHtcbiAgICAgICAgcmV0dXJuIHNwbGl0QmxvY2tzW2Jsb2NrSW5kZXhdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEdldCBsaXN0IG9mIGFsbCBibG9ja3Mgd2l0aCB0eXBlIGFuZCBjb250ZW50c1xuICBzcGxpdEJsb2NrcyhcbiAgICBjb2RlQmxvY2tzOiBbXG4gICAgICBjb2RlQmxvY2s6IHsgdHlwZTogc3RyaW5nOyBjb250ZW50czogc3RyaW5nOyBzdGFydDogbnVtYmVyOyBlbmQ6IG51bWJlciB9XG4gICAgXVxuICApIHtcbiAgICB2YXIgc3BsaXRCbG9ja0xpc3QgPSBbdGhpcy5za2lsbENvbnRlbnRzXSxcbiAgICAgIGJsb2NrVHlwZXMgPSBbXCJ0ZXh0XCJdO1xuXG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvZGVCbG9ja3MubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBzcGxpdEJsb2NrTGlzdC5wdXNoKGNvZGVCbG9ja3NbaW5kZXhdW1wiY29udGVudHNcIl0pO1xuICAgICAgYmxvY2tUeXBlcy5wdXNoKGNvZGVCbG9ja3NbaW5kZXhdW1widHlwZVwiXSk7XG5cbiAgICAgIHNwbGl0QmxvY2tMaXN0LnB1c2goXG4gICAgICAgIHNwbGl0QmxvY2tMaXN0WzIgKiBpbmRleF0uc2xpY2UoY29kZUJsb2Nrc1tpbmRleF1bXCJlbmRcIl0pXG4gICAgICApO1xuICAgICAgYmxvY2tUeXBlcy5wdXNoKFwidGV4dFwiKTtcblxuICAgICAgc3BsaXRCbG9ja0xpc3RbMiAqIGluZGV4XSA9IHNwbGl0QmxvY2tMaXN0WzIgKiBpbmRleF0uc2xpY2UoXG4gICAgICAgIDAsXG4gICAgICAgIGNvZGVCbG9ja3NbaW5kZXhdW1wic3RhcnRcIl1cbiAgICAgICk7XG5cbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBpbmRleEZ1dHVyZSA9IGluZGV4ICsgMTtcbiAgICAgICAgaW5kZXhGdXR1cmUgPCBjb2RlQmxvY2tzLmxlbmd0aDtcbiAgICAgICAgaW5kZXhGdXR1cmUrK1xuICAgICAgKSB7XG4gICAgICAgIGNvZGVCbG9ja3NbaW5kZXhGdXR1cmVdW1wic3RhcnRcIl0gLT1cbiAgICAgICAgICBzcGxpdEJsb2NrTGlzdFsyICogaW5kZXhdLmxlbmd0aCArXG4gICAgICAgICAgY29kZUJsb2Nrc1tpbmRleF1bXCJlbmRcIl0gLVxuICAgICAgICAgIGNvZGVCbG9ja3NbaW5kZXhdW1wic3RhcnRcIl07XG4gICAgICAgIGNvZGVCbG9ja3NbaW5kZXhGdXR1cmVdW1wiZW5kXCJdIC09XG4gICAgICAgICAgc3BsaXRCbG9ja0xpc3RbMiAqIGluZGV4XS5sZW5ndGggK1xuICAgICAgICAgIGNvZGVCbG9ja3NbaW5kZXhdW1wiZW5kXCJdIC1cbiAgICAgICAgICBjb2RlQmxvY2tzW2luZGV4XVtcInN0YXJ0XCJdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbc3BsaXRCbG9ja0xpc3QsIGJsb2NrVHlwZXNdO1xuICB9XG5cbiAgLy8gR2V0IGEgbGlzdCBvZiBjb2RlIGJsb2NrcyB3aXRoIGRldGFpbHNcbiAgZGV0ZWN0Q29kZUJsb2NrcygpIHtcbiAgICBsZXQgbSxcbiAgICAgIHJlczogYW55ID0gW107XG4gICAgY29uc3QgcmUgPSBSZWdFeHAoXG4gICAgICAvXFxgXFxgXFxgKD88dHlwZT5cXHcrKSg/PGNvbnRlbnRzPig/OlxcYFteXFxgXXxbXlxcYF0pKilcXGBcXGBcXGAvLFxuICAgICAgXCJnXCJcbiAgICApO1xuXG4gICAgZG8ge1xuICAgICAgbSA9IHJlLmV4ZWModGhpcy5za2lsbENvbnRlbnRzKTtcbiAgICAgIGlmIChtKSB7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQoe1xuICAgICAgICAgIHR5cGU6IG1bXCJncm91cHNcIl1bXCJ0eXBlXCJdLFxuICAgICAgICAgIGNvbnRlbnRzOiBtW1wiZ3JvdXBzXCJdW1wiY29udGVudHNcIl0udHJpbSgpLFxuICAgICAgICAgIHN0YXJ0OiBtW1wiaW5kZXhcIl0sXG4gICAgICAgICAgZW5kOiBtW1wiaW5kZXhcIl0gKyBtWzBdLmxlbmd0aCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSB3aGlsZSAobSk7XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLy8gR2V0IGxpc3Qgb2YgcGFyYW1ldGVycyBtZW50aW9uZWQgaW4gYSBza2lsbFxuICBhc3luYyBnZXRQYXJhbXMoZG9jdW1lbnQ6IHN0cmluZykge1xuICAgIHZhciByZSA9IC9cXCpbYS16QS1aMC05XFxzXSpcXCovZztcbiAgICB2YXIgcGFyYW1zID0gZG9jdW1lbnQubWF0Y2gocmUpO1xuXG4gICAgaWYgKHBhcmFtcyAhPSBudWxsKSB7XG4gICAgICBwYXJhbXMuZm9yRWFjaCgodmFsLCBpbmRleCwgcGFyYW1zKSA9PiB7XG4gICAgICAgIHBhcmFtc1tpbmRleF0gPSB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8vIFBhcnNlIGFyZ3VtZW50cyBmcm9tIHRoZSBjb21tYW5kXG4gIGFzeW5jIGdldEFyZ3MoY29tbWFuZDogc3RyaW5nLCBwYXJhbXM6IHN0cmluZ1tdKSB7XG4gICAgdmFyIGFyZ3M6IHN0cmluZ1tdID0gW10sXG4gICAgICByZXM7XG5cbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGFyYW1zLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmVzID0gYXdhaXQgdGhpcy5nZXRBcmcoY29tbWFuZCwgcGFyYW1zW2luZGV4XSk7XG4gICAgICBhcmdzID0gYXJncy5jb25jYXQocmVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJncztcbiAgfVxuXG4gIC8vIFBhcnNlIG9uZSBhcmd1bWVudCBmcm9tIHRoZSBjb21tYW5kXG4gIGFzeW5jIGdldEFyZyhjb21tYW5kOiBzdHJpbmcsIHBhcmFtOiBzdHJpbmcpIHtcbiAgICBpZiAocGFyYW0gPT0gT2JqZWN0LmtleXModGhpcy5za2lsbE1ldGFkYXRhWzBdKVswXSkge1xuICAgICAgcmV0dXJuIGNvbW1hbmQ7XG4gICAgfVxuXG4gICAgdmFyIHByb21wdDogc3RyaW5nID0gdGhpcy5nZXRQYXJhbVByb21wdChjb21tYW5kLCBwYXJhbSk7XG4gICAgY29uc3QgcmF3UmVzcG9uc2UgPSBhd2FpdCBmZXRjaEdlbmVyYXRlKHtcbiAgICAgIHByb21wdDogcHJvbXB0LFxuICAgICAgY29udGV4dDogW2NvbW1hbmRdLFxuICAgICAgZ2VuZXJhdGVfcGFyYWdyYXBoczogMSxcbiAgICB9KTtcblxuICAgIHZhciBjb250ZW50ID0gYXdhaXQgcmF3UmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnRlbnQgPSBjb250ZW50W1wib3V0cHV0XCJdWzBdLnRyaW0oKTtcblxuICAgIHJldHVybiBjb250ZW50O1xuICB9XG5cbiAgZ2V0UGFyYW1Qcm9tcHQoY29tbWFuZDogc3RyaW5nLCBwYXJhbTogc3RyaW5nKSB7XG4gICAgdmFyIGNvbW1hbmRQYXJhbTogc3RyaW5nO1xuICAgIHZhciBwcm9tcHQ6IHN0cmluZztcblxuICAgIC8vIFRPRE8gZG8gYWJsYXRpb25cbiAgICBwcm9tcHQgPSBcIkV4dHJhY3QgXCIgKyBwYXJhbSArIFwiIGZyb20gdGhlIGZvbGxvd2luZzpcXG5cXG5cIjtcblxuICAgIGNvbW1hbmRQYXJhbSA9IE9iamVjdC5rZXlzKHRoaXMuc2tpbGxNZXRhZGF0YVswXSlbMF07XG5cbiAgICB0aGlzLnNraWxsTWV0YWRhdGEuZm9yRWFjaCgodmFsOiBhbnksIGluZGV4OiBhbnksIGFycmF5OiBhbnkpID0+IHtcbiAgICAgIGlmIChjb21tYW5kUGFyYW0gaW4gdmFsICYmIHBhcmFtIGluIHZhbCkge1xuICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA+PSAwLjYpIHtcbiAgICAgICAgICBwcm9tcHQgKz0gdmFsW2NvbW1hbmRQYXJhbV0gKyBcIiA9PiBcIiArIHZhbFtwYXJhbV0gKyBcIlxcblxcblwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb21wdCArPSB2YWxbY29tbWFuZFBhcmFtXSArIFwiID0+ICBcIiArIHZhbFtwYXJhbV0gKyBcIlxcblxcblwiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwcm9tcHQgKz0gY29tbWFuZCArIFwiID0+IFwiO1xuICAgIHJldHVybiBwcm9tcHQ7XG4gIH1cblxuICAvLyBHZXQgdHdvIHBhcmFsbGVsIGxpc3RzIG9mIGNvbW1hbmQgZXhhbXBsZXMgYW5kIHRoZSBwYXRocyB0aGV5IG9yaWdpbmF0ZSBmcm9tXG4gIGdldENvbW1hbmRFeGFtcGxlcygpIHtcbiAgICB2YXIgY29tbWFuZEV4YW1wbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHZhciBza2lsbFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHZhciBjb21tYW5kRXhhbXBsZVBhcmFtOiBzdHJpbmc7XG4gICAgdmFyIG5ld0NvbW1hbmRFeGFtcGxlOiBzdHJpbmc7XG5cbiAgICB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgaWYgKGZpbGUucGF0aC5zdGFydHNXaXRoKFwic2tpbGxzZXRcIikpIHtcbiAgICAgICAgY29tbWFuZEV4YW1wbGVQYXJhbSA9IE9iamVjdC5rZXlzKFxuICAgICAgICAgIHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpLmZyb250bWF0dGVyWzBdXG4gICAgICAgIClbMF07XG5cbiAgICAgICAgdGhpcy5hcHAubWV0YWRhdGFDYWNoZVxuICAgICAgICAgIC5nZXRGaWxlQ2FjaGUoZmlsZSlcbiAgICAgICAgICAuZnJvbnRtYXR0ZXIuZm9yRWFjaCgodmFsOiBhbnksIGluZGV4OiBhbnksIGFycmF5OiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChjb21tYW5kRXhhbXBsZVBhcmFtIGluIHZhbCkge1xuICAgICAgICAgICAgICBuZXdDb21tYW5kRXhhbXBsZSA9IHZhbFtjb21tYW5kRXhhbXBsZVBhcmFtXTtcblxuICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyh2YWwpLmZvckVhY2goKGZpZWxkLCBmaWVsZEluZGV4LCBmaWVsZEFycmF5KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkSW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgICBuZXdDb21tYW5kRXhhbXBsZSA9IG5ld0NvbW1hbmRFeGFtcGxlLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkWzFdLFxuICAgICAgICAgICAgICAgICAgICBcIiBfX18gXCJcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICBjb21tYW5kRXhhbXBsZXMgPSBjb21tYW5kRXhhbXBsZXMuY29uY2F0KG5ld0NvbW1hbmRFeGFtcGxlKTtcbiAgICAgICAgICAgICAgc2tpbGxQYXRocyA9IHNraWxsUGF0aHMuY29uY2F0KGZpbGUucGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gW2NvbW1hbmRFeGFtcGxlcywgc2tpbGxQYXRoc107XG4gIH1cblxuICAvLyBHZXQgY29udGVudHMgb2YgYSBza2lsbCBhdCBhIHBhdGhcbiAgYXN5bmMgbG9hZFNraWxsQ29udGVudHMoc2tpbGxQYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgbWFya2Rvd25GaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcblxuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXJrZG93bkZpbGVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgaWYgKG1hcmtkb3duRmlsZXNbaW5kZXhdLnBhdGggPT0gc2tpbGxQYXRoKSB7XG4gICAgICAgIHRoaXMuc2tpbGxDb250ZW50cyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoXG4gICAgICAgICAgbWFya2Rvd25GaWxlc1tpbmRleF1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gR2V0IG1ldGFkYXRhIG9mIGEgc2tpbGwgYXQgYSBwYXRoXG4gIGxvYWRTa2lsbE1ldGFkYXRhKHNraWxsUGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIG1hcmtkb3duRmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG5cbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbWFya2Rvd25GaWxlcy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGlmIChtYXJrZG93bkZpbGVzW2luZGV4XS5wYXRoID09IHNraWxsUGF0aCkge1xuICAgICAgICB0aGlzLnNraWxsTWV0YWRhdGEgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShcbiAgICAgICAgICBtYXJrZG93bkZpbGVzW2luZGV4XVxuICAgICAgICApLmZyb250bWF0dGVyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgY2xvc2VzdCBza2lsbCB0byBhIGdpdmVuIGNvbW1hbmQgdGhyb3VnaCBleGFtcGxlc1xuICBhc3luYyBtYXRjaENvbW1hbmQoY29tbWFuZDogc3RyaW5nKSB7XG4gICAgLy8gSGlkZSBxdW90ZWQgY29udGVudCBmcm9tIGNvbW1hbmQgbWF0Y2hpbmdcbiAgICBjb21tYW5kID0gY29tbWFuZC5yZXBsYWNlKC9cIltcXHNcXFNdKlwiLywgJ1wiXCInKTtcbiAgICB2YXIgZXhhbXBsZVBhdGhQYWlycyA9IHRoaXMuZ2V0Q29tbWFuZEV4YW1wbGVzKCk7XG4gICAgdmFyIGV4YW1wbGVzID0gZXhhbXBsZVBhdGhQYWlyc1swXSxcbiAgICAgIHBhdGhzID0gZXhhbXBsZVBhdGhQYWlyc1sxXTtcblxuICAgIC8vIFRPRE86IFJlZmFjdG9yIGludG8gbmV0d29ya1xuICAgIGNvbnN0IHJhd1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2hTZWFyY2goe1xuICAgICAgcHJvbXB0OiBjb21tYW5kLFxuICAgICAgY29udGV4dDogZXhhbXBsZXMsXG4gICAgICBnZW5lcmF0ZV9wYXJhZ3JhcGhzOiAxLFxuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRlbnQgPSBhd2FpdCByYXdSZXNwb25zZS5qc29uKCk7XG4gICAgcmV0dXJuIHBhdGhzW2NvbnRlbnRbXCJvdXRwdXRcIl1bMF1dO1xuICB9XG5cbiAgLy8gU3Vic3RpdHV0ZSBwYXJhbWV0ZXJzIHdpdGggYXJndW1lbnRzIGluIGEgc2tpbGxcbiAgcmVzb2x2ZVBhcmFtcyhkb2N1bWVudDogc3RyaW5nLCBwYXJhbXM6IHN0cmluZ1tdLCBhcmdzOiBzdHJpbmdbXSkge1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYXJhbXMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgcmUgPSBSZWdFeHAoXCJcXFxcKlwiICsgcGFyYW1zW2luZGV4XSArIFwiXFxcXCpcIiwgXCJnXCIpO1xuICAgICAgZG9jdW1lbnQgPSBkb2N1bWVudC5yZXBsYWNlKHJlLCBhcmdzW2luZGV4XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG5cbiAgcmVtb3ZlRnJvbnRNYXR0ZXIoKSB7XG4gICAgdGhpcy5za2lsbENvbnRlbnRzID0gdGhpcy5za2lsbENvbnRlbnRzLnJlcGxhY2UoLy0tLVtcXHNcXFNdKi0tLS9nLCBcIlwiKTtcbiAgfVxuXG4gIGFzeW5jIGdldE5vdGVzKCkge1xuICAgIHZhciBtYXJrZG93bkZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICAgIHZhciBub3Rlczogc3RyaW5nW10gPSBbXTtcblxuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXJrZG93bkZpbGVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgaWYgKCFtYXJrZG93bkZpbGVzW2luZGV4XS5wYXRoLnN0YXJ0c1dpdGgoXCJza2lsbHNldFwiKSkge1xuICAgICAgICB2YXIgbm90ZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQobWFya2Rvd25GaWxlc1tpbmRleF0pO1xuICAgICAgICBub3RlID0gVXRpbHMucmVtb3ZlTWQobm90ZSk7XG4gICAgICAgIG5vdGVzLnB1c2gobm90ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vdGVzO1xuICB9XG59XG5cbi8qXG5hcmdtaW4gPT4gQXJnbWluXG5cbnJld2FyZCBzeXN0ZW1zID0+IG5ldXJhbCBzeXN0ZW1zIHdoaWNoIHJlZ3VsYXRlIHJld2FyZFxuXG5STk5zIGFuZCBiYWNrcHJvcGFnYXRpb24gPT4gYmFja3Byb3BhZ2F0aW9uIHRocm91Z2ggdGltZSB3aXRoIFJOTnNcblxubWV0YXBob3JzIG9mIGNvbmNlcHRzID0+IGNvbmNlcHRzIGFyZSBhc3NvY2lhdGVkIHdpdGggcm9vbXNcblxuTkNDID0+IG5ldXJhbCBjb3JyZWxhdGVzIG9mIGNvbnNjaW91c25lc3NcblxuKnRvcGljKiA9PlxuKi9cbiJdfQ==