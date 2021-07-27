import path from "path";

export const pathsFromBasePath = (
  basePath: string,
  os: "linux" | "macos" | "windows"
) => {
  let dualServerPath: string,
    dualAbsoluteBinaryPath: string,
    dualRelativeBinaryPath: string,
    dualAbsoluteTorchZipPath: string,
    dualRelativeTorchZipPath: string,
    dualAbsoluteTorchPath: string,
    dualAbsoluteTorchLibPath: string;
  if (os === "linux" || os === "macos") {
    dualServerPath = basePath + "/.obsidian/plugins/Dual/server";
    dualAbsoluteBinaryPath = dualServerPath + "/dual-server-" + os;
    dualRelativeBinaryPath = "/.obsidian/plugins/Dual/server/dual-server-" + os;
    dualAbsoluteTorchZipPath = dualServerPath + "/libtorch.zip";
    dualRelativeTorchZipPath = "/.obsidian/plugins/Dual/server/libtorch.zip";
    dualAbsoluteTorchPath = dualServerPath + "/libtorch";
    dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "/lib";
  } else if (os === "windows") {
    dualServerPath = basePath + "\\.obsidian\\plugins\\Dual\\server";
    dualAbsoluteBinaryPath = dualServerPath + "\\dual-server-windows.exe";
    dualRelativeBinaryPath =
      "\\.obsidian\\plugins\\Dual\\server\\dual-server-windows.exe";
    dualAbsoluteTorchZipPath = dualServerPath + "\\libtorch.zip";
    dualRelativeTorchZipPath =
      "\\.obsidian\\plugins\\Dual\\server\\libtorch.zip";
    dualAbsoluteTorchPath = dualServerPath + "\\libtorch";
    dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "\\lib";
  }
  return {
    dualServerPath,
    dualAbsoluteBinaryPath,
    dualRelativeBinaryPath,
    dualAbsoluteTorchZipPath,
    dualRelativeTorchZipPath,
    dualAbsoluteTorchPath,
    dualAbsoluteTorchLibPath,
  };
};
