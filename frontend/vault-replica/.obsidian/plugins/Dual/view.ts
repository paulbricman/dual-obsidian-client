import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from "obsidian";
import { SkillManager } from "skills";

export default class ChatView extends ItemView {
  customName = "";

  constructor(leaf: WorkspaceLeaf, customName: string) {
    super(leaf);
    this.customName = customName;
  }

  getViewType(): string {
    return "chat";
  }

  getDisplayText(): string {
    return "Dual";
  }

  getIcon(): string {
    return "info";
  }

  sendMessage(): void {
    let input = <HTMLInputElement>document.getElementById("dual-input-box");
    let replied = false;

    if (input.value != "") {
      this.drawMessage(input.value, "right");

      let typingPromise = new Promise((resolve) =>
        setTimeout(resolve, 3000)
      ).then(() => {
        if (replied == false) {
          this.setStatus("typing...");
        }
      });

      var skillManager = new SkillManager(this.app);
      skillManager.followCommand(input.value).then((response: string) => {
        response
          .toString()
          .split("\n\n")
          .forEach((res: string) => {
            if (res.trim() != "") {
              this.drawMessage(res, "left");
            }
          });

        replied = true;
        this.setStatus("online");
      });

      input.value = "";
    }
  }

  async makeRequest(query: string): Promise<JSON> {
    const response = await fetch(
      "http://127.0.0.1:5000/query/" + encodeURIComponent(query)
    );
    const responseJSON = await response.json();
    return responseJSON;
  }

  load(): void {
    super.load();
    this.draw();
  }

  private draw(): void {
    const container = this.containerEl.children[1];

    const rootEl = document.createElement("div");

    const headerDiv = rootEl.createDiv({ cls: "nav-header" });
    const footerDiv = rootEl.createDiv({ cls: "nav-header" });

    let header = headerDiv.createEl("h3");
    header.appendText(this.customName);

    let status = headerDiv.createEl("h6");
    status.id = "status";
    status.appendText("online");

    let conversationDiv = headerDiv.createDiv({ cls: "nav-header" });
    conversationDiv.id = "conversationDiv";

    let input = footerDiv.createEl("input");
    input.id = "dual-input-box";
    input.type = "text";

    let button = footerDiv.createEl("button");
    button.appendText("Send");
    button.id = "send-button";

    this.registerDomEvent(button, "click", () => this.sendMessage());
    this.registerDomEvent(input, "keydown", (event) => {
      if (event.key == "Enter") {
        this.sendMessage();
      }
    });

    container.empty();
    container.appendChild(rootEl);
  }

  private drawMessage(content: string, side: string): void {
    let conversationDiv = <HTMLDivElement>(
      document.getElementById("conversationDiv")
    );
    let p = conversationDiv.createEl("p");

    MarkdownRenderer.renderMarkdown(
      content,
      p,
      this.app.vault.getRoot().path,
      new Component()
    );

    for (let childIndex = 0; childIndex < p.children.length; childIndex++) {
      p.children[childIndex].setAttribute(
        "style",
        "margin: 5px; margin-left: 8px; margin-right: 8px"
      );
    }

    if (side == "right") {
      p.style.backgroundColor = "var(--background-primary)";
    } else {
      p.style.backgroundColor = "var(--background-secondary)";
    }

    if (side == "right") {
      p.style.float = "right";
    } else {
      p.style.float = "left";
    }

    conversationDiv.scrollBy(0, 1000);
  }

  private setStatus(content: string): void {
    let statusP = <HTMLParagraphElement>document.getElementById("status");
    statusP.setText(content);
  }
}
