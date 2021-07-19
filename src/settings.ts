import {
  PluginSettingTab,
  App,
  Setting,
  FileSystemAdapter,
  Notice,
} from "obsidian";
import * as fs from "fs-extra";
import * as child from "child_process";
import AdmZip from "adm-zip";
import MyPlugin from "./main";
import {
  getOS,
  fetchRetry,
  removeMd,
  copyStringToClipboard,
  torchURLfromOS,
} from "./utils";

export class SettingTab extends PluginSettingTab {
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
              dualAbsoluteTorchLibPath: string;
            const os = getOS();
            const torchURL = torchURLfromOS(os);
            const dualServerURL = `https://github.com/Psionica/dual-server/releases/download/master-e92239af/dual-server-${os}`;

            if (this.app.vault.adapter instanceof FileSystemAdapter) {
              basePath = this.app.vault.adapter.getBasePath();
            }

            new Notice(
              "Setting up dual-server using dual-obsidian-client. This might take a few minutes...",
              5000
            );

            if (os === "linux" || os === "macos") {
              dualServerPath = basePath + "/.obsidian/plugins/Dual/server";
              dualAbsoluteBinaryPath = dualServerPath + "/dual-server-" + os;
              dualRelativeBinaryPath =
                "/.obsidian/plugins/Dual/server/dual-server-" + os;
              dualAbsoluteTorchZipPath = dualServerPath + "/libtorch.zip";
              dualRelativeTorchZipPath =
                "/.obsidian/plugins/Dual/server/libtorch.zip";
              dualAbsoluteTorchPath = dualServerPath + "/libtorch";
              dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "/lib";
            } else if (os === "windows") {
              dualServerPath = basePath + "\\.obsidian\\plugins\\Dual\\server";
              dualAbsoluteBinaryPath = dualServerPath + "\\dual-server-windows";
              dualRelativeBinaryPath =
                "\\.obsidian\\plugins\\Dual\\server\\dual-server-windows";
              dualAbsoluteTorchZipPath = dualServerPath + "\\libtorch.zip";
              dualRelativeTorchZipPath =
                "\\.obsidian\\plugins\\Dual\\server\\libtorch.zip";
              dualAbsoluteTorchPath = dualServerPath + "\\libtorch";
              dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "\\lib";
            } else {
              new Notice("Unsupported OS!");
              return;
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
              const response = await fetchRetry(torchURL, 0, 200);
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

                if (os == "linux" || os == "macos") {
                  child.exec("chmod +x " + dualAbsoluteBinaryPath);
                }

                const childProc = child.spawn(dualAbsoluteBinaryPath, [], {
                  cwd: dualServerPath,
                  detached: false,
                  env: {
                    LIBTORCH: dualAbsoluteTorchPath,
                    LD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                    DYLD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                    Path: dualAbsoluteTorchLibPath,
                  },
                });

                childProc.stdout.on("data", (data) => {
                  console.log(`stdout: ${data}`);
                });

                childProc.stderr.on("data", (data) => {
                  console.error(`stderr: ${data}`);
                });
                new Notice("dual-server has been run!");
              });
            } else {
              const childProc = child.spawn(dualAbsoluteBinaryPath, [], {
                cwd: dualServerPath,
                detached: false,
                env: {
                  LIBTORCH: dualAbsoluteTorchPath,
                  LD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                  DYLD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
                  Path: dualAbsoluteTorchLibPath,
                },
              });

              childProc.stdout.on("data", (data) => {
                console.log(`stdout: ${data}`);
              });

              childProc.stderr.on("data", (data) => {
                console.error(`stderr: ${data}`);
              });
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
              concatenated = removeMd(concatenated);
              copyStringToClipboard(concatenated);
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
