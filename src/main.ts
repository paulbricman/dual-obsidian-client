import { Plugin, Workspace } from "obsidian";
import ChatView, { inputId } from "./view";
import { SettingTab } from "./settings";

interface MyPluginSettings {
  customName: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  customName: "Dual",
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.registerView("chat", (leaf) => {
      return new ChatView(leaf, this.settings.customName);
    });

    this.app.workspace.layoutReady && this.initLeaf(this.app.workspace);
    this.registerEvent(
      this.app.workspace.on("layout-ready", () =>
        this.initLeaf(this.app.workspace)
      )
    );

    this.addSettingTab(new SettingTab(this.app, this));

    this.addCommand({
      id: "focus-dual-input",
      name: "Focus Dual input box",
      callback: () => document.getElementById(inputId).focus(),
    });
  }

  initLeaf(workspace: Workspace): void {
    if (workspace.getLeavesOfType("chat").length == 0) {
      workspace.getRightLeaf(false).setViewState({
        type: "chat",
      });
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}