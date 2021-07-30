import {
  PluginSettingTab,
  App,
  Setting,
  FileSystemAdapter,
  Notice,
} from "obsidian";
import MyPlugin from "./main";
import {
  getOS,
  removeMd,
  copyStringToClipboard,
  torchURLfromOS,
} from "./utils";
import {
  pathsFromBasePath,
  ensurePathExists,
  extractZip,
  makeExecutable,
  fetchBinaryToDisk,
  exists,
  removeFile,
} from "./fs";
import { startServer } from "./server";

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
            const os = getOS();

            // Eject when unknown OS
            if (os === "unknown")
              return new Notice("Dual: Unsupported OS!", 5000);

            const torchURL = torchURLfromOS(os);
            const dualServerURL = `https://github.com/Psionica/dual-server/releases/download/master-e92239af/dual-server-${os}`;

            // Escape when vault adapter isn't right
            if (!(this.app.vault.adapter instanceof FileSystemAdapter))
              return new Notice(
                "Dual: Vault adapter is not a FileSystemAdapter...",
                5000
              );

            const basePath = this.app.vault.adapter.getBasePath();

            const {
              serverPath,
              binaryPath,
              torchZipPath,
              torchPath,
              torchLibPath,
            } = pathsFromBasePath(basePath, os);

            if (
              !(exists(serverPath) && exists(binaryPath) && exists(torchPath))
            ) {
              // Inform it'll take a while
              new Notice(
                "Dual: Setting up Dual server. This might take a few minutes...",
                5000
              );
            }

            // Make server folder
            await ensurePathExists(serverPath);

            // Fetch server
            if (!exists(binaryPath)) {
              new Notice("Dual: Downloading server...", 5000);
              await fetchBinaryToDisk(dualServerURL, binaryPath);

              if (os === "linux" || os === "macos") {
                await makeExecutable(binaryPath);
              }

              new Notice("Dual: Server downloaded successfully!");
            }

            // Fetch Libtorch
            if (!exists(torchLibPath)) {
              new Notice("Dual: Libtorch not found...", 5000);

              if (!exists(torchZipPath)) {
                new Notice("Dual: Downloading libtorch...", 5000);
                await fetchBinaryToDisk(torchURL, torchZipPath);
                new Notice("Dual: Libtorch downloaded successfully!", 5000);
              }

              // Uncompress Libtorch zip
              if (!exists(torchPath) && exists(torchZipPath)) {
                new Notice("Dual: Extracting libtorch...", 5000);
                await extractZip(torchZipPath, serverPath);
                new Notice("Dual: libtorch extracted successfully!", 5000);
                await removeFile(torchZipPath);
              }
            }

            // Start server
            startServer(
              console.log,
              console.error,
              serverPath,
              binaryPath,
              torchPath,
              torchLibPath
            );
            console.log("Dual: Starting server!");
            new Notice("Dual: Starting server!", 5000);
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
            new Notice("Dual: Loading files...");

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
              new Notice("Dual: Snapshot successfully copied to clipboard!");
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
