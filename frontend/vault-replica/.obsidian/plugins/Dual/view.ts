import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from "obsidian";
import { SkillManager } from "skills";
import { fetchQuery } from "./network";

const contentId = "dual-content";
const statusId = "dual-status";
export const inputId = "dual-input";
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
    const input = <HTMLInputElement>document.getElementById(inputId);
    let replied = false;

    if (input.value !== "") {
      this.drawMessage(input.value, "right");

      let typingPromise = new Promise((resolve) =>
        setTimeout(resolve, 3000)
      ).then(() => {
        if (replied == false) {
          this.setStatus("typing...");
        }
      });

      // TODO: Move text sanitation code out of View
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
    const response = await fetchQuery(query);

    const responseJSON = await response.json();
    return responseJSON;
  }

  load(): void {
    super.load();
    this.draw();
  }

  private draw(): void {
    const container = this.containerEl.children[1];

    // Root node
    const rootEl = document.createElement("div");
    rootEl.id = "dual-root";

    // Header
    const headerDiv = rootEl.createEl("header", {
      attr: { id: "dual-header" },
    });

    // Title and status
    headerDiv.createEl("h3", {
      cls: "dual-header-title",
      text: this.customName,
    });
    headerDiv.createEl("h6", { text: "Online", attr: { id: statusId } });

    // Conversation content
    rootEl.createDiv({ attr: { id: contentId } });

    // Footer
    const footerDiv = rootEl.createEl("footer", {
      attr: { id: "dual-footer" },
    });

    // Input element
    const input = footerDiv.createEl("input", {
      type: "text",
      attr: { id: inputId },
    });

    // Send button
    const button = footerDiv.createEl("button", {
      text: "Send",
      attr: { id: "dual-btn-send" },
    });

    this.registerDomEvent(button, "click", () => this.sendMessage());
    this.registerDomEvent(input, "keydown", (event) => {
      if (event.key === "Enter") {
        this.sendMessage();
      }
    });

    container.empty();
    container.appendChild(rootEl);
  }

  private drawMessage(content: string, side: "left" | "right"): void {
    const conversationDiv = <HTMLDivElement>document.getElementById(contentId);
    const msg = conversationDiv.createDiv({ cls: `dual-msg dual-msg-${side}` });

    MarkdownRenderer.renderMarkdown(
      content,
      msg,
      this.app.vault.getRoot().path,
      new Component()
    );

    conversationDiv.scrollBy(0, 1000);
  }

  private setStatus(content: string): void {
    let statusP = <HTMLParagraphElement>document.getElementById(statusId);
    statusP.setText(content);
  }
}
