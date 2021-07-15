import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  Workspace,
  FileSystemAdapter,
} from "obsidian";
import ChatView, { inputId } from "./view";
import { Utils } from "./utils";
import * as fs from "fs-extra";
import AdmZip from "adm-zip";
import * as child from "child_process";

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

    this.addSettingTab(new SampleSettingTab(this.app, this));

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

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h3", {
      text: "Follow these instructions to set up your Dual:",
    });

    new Setting(containerEl)
      .setName("Deploy dual-server")
      .setDesc(
        "Press the button to set up dual-server, the backend component which handles the AI stuff locally."
      )
      .addButton((cb) => {
        cb.setButtonText("Install")
          .setClass("mod-cta")
          .onClick(async () => {
            let basePath: string,
              dualServerPath: string,
              dualAbsoluteBinaryPath: string,
              dualRelativeBinaryPath: string,
              dualAbsoluteTorchZipPath: string,
              dualRelativeTorchZipPath: string,
              dualAbsoluteTorchPath: string,
              dualAbsoluteTorchLibPath: string,
              torchURL: string,
              dualServerURL: string;

            if (this.app.vault.adapter instanceof FileSystemAdapter) {
              basePath = this.app.vault.adapter.getBasePath();
            }

            if (Utils.getOS() == "linux") {
              new Notice(
                "Setting up dual-server using dual-obsidian-client..."
              );
              new Notice("This might take a few minutes...");
              dualServerPath = basePath + "/.obsidian/plugins/Dual/server";
              dualAbsoluteBinaryPath = dualServerPath + "/dual-server-linux";
              dualRelativeBinaryPath =
                "/.obsidian/plugins/Dual/server/dual-server-linux";
              dualAbsoluteTorchZipPath = dualServerPath + "/libtorch.zip";
              dualRelativeTorchZipPath =
                "/.obsidian/plugins/Dual/server/libtorch.zip";
              dualAbsoluteTorchPath = dualServerPath + "/libtorch";
              dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "/lib";
              dualServerURL =
                "https://github.com/Psionica/dual-server/releases/download/master-e92239af/dual-server-linux";
              torchURL =
                "https://download.pytorch.org/libtorch/cpu/libtorch-cxx11-abi-shared-with-deps-1.9.0%2Bcpu.zip";
            }

            if (!fs.existsSync(dualServerPath)) {
              fs.mkdirSync(dualServerPath);
            }

            if (!fs.existsSync(dualAbsoluteBinaryPath)) {
              new Notice("Downloading dual-server...");
              const response = await fetch(dualServerURL);
              const blob = await response.blob();
              await this.app.vault
                .createBinary(dualRelativeBinaryPath, await blob.arrayBuffer())
                .then(() => {
                  new Notice("dual-server downloaded successfully!");
                });
            }

            if (
              !fs.existsSync(dualAbsoluteTorchPath) &&
              !fs.existsSync(dualAbsoluteTorchZipPath)
            ) {
              new Notice("Downloading libtorch...", 5000);
              const response = await Utils.fetchRetry(torchURL, 0, 200);
              const blob = await response.blob();
              await this.app.vault.createBinary(
                dualRelativeTorchZipPath,
                await blob.arrayBuffer()
              );
              new Notice("libtorch downloaded successfully!");
            }

            if (!fs.existsSync(dualAbsoluteTorchPath)) {
              new Notice("Extracting libtorch...");
              var zip = new AdmZip(dualAbsoluteTorchZipPath);
              zip.extractAllToAsync(dualServerPath, true, () => {
                new Notice("libtorch extracted successfully!");
                fs.removeSync(dualAbsoluteTorchZipPath);

                if (Utils.getOS() == "linux") {
                  var chmod_proc = child.exec(
                    "chmod +x " + dualAbsoluteBinaryPath
                  );
                }

                var child_proc = child.exec(
                  dualAbsoluteBinaryPath,
                  {
                    cwd: dualServerPath,
                    env: {
                      LIBTORCH: dualAbsoluteTorchPath,
                      LD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                    },
                  },
                  (e, out, err) => console.log(e, out, err)
                );
                new Notice("dual-server has been run!");
              });
            } else {
              var child_proc = child.exec(
                dualAbsoluteBinaryPath,
                {
                  cwd: dualServerPath,
                  env: {
                    LIBTORCH: dualAbsoluteTorchPath,
                    LD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                  },
                },
                (e, out, err) => console.log(e, out, err)
              );
              new Notice("dual-server has been run!");
            }
          });
      });

    new Setting(containerEl)
      .setName("Copy snapshot")
      .setDesc(
        "Press the button to copy the entire vault as concatenated plain text."
      )
      .addButton((cb) =>
        cb
          .setButtonText("Copy snapshot")
          .setClass("mod-cta")
          .onClick(() => {
            new Notice("Loading files...");

            let concatenated = "";

            // TODO Use Promise.all() / map / reduce

            this.app.vault.getMarkdownFiles().forEach((element) => {
              this.app.vault.cachedRead(element).then((res) => {
                res = res
                  .replace(/^---[\s\S]*---\n*/g, "")
                  .replace(/\[\[[^\|\[\]]*\|([^\|\[\]]*)\]\]/g, "$1")
                  .replace(/\[\[(.*)\]\]/g, "$1")
                  .replace(/```([^`])*```\n*/g, "")
                  .replace(/\$([^$])*\$*/g, "");

                concatenated = concatenated.concat(res, "\n\n");
              });
            });

            let copyPromise = new Promise((resolve) =>
              setTimeout(resolve, 3000)
            ).then(() => {
              concatenated = concatenated.slice(0, 5000000);
              concatenated = Utils.removeMd(concatenated);
              Utils.copyStringToClipboard(concatenated);
              new Notice("Snapshot successfully copied to clipboard!");
            });
          })
      );

    containerEl.createEl("h3", {
      text: "Congratulations on setting up your Dual!",
    });

    new Setting(containerEl)
      .setName("Custom name")
      .setDesc(
        "Customize your Dual's name using the input box. Reload Obsidian for this to take effect."
      )
      .addText((text) =>
        text
          .setPlaceholder("Dual")
          .setValue("")
          .onChange(async (value) => {
            this.plugin.settings.customName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Get involved!")
      .addButton((cb) =>
        cb
          .setButtonText("Report bugs")
          .setClass("mod-cta")
          .onClick(() => {
            window.open("https://github.com/Psionica/Dual/issues");
          })
      )
      .addButton((cb) =>
        cb
          .setButtonText("Join Psionica")
          .setClass("mod-cta")
          .onClick(() => {
            window.open("https://psionica.org/");
          })
      );
  }
}
