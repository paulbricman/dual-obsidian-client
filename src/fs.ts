import { normalize } from "path";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import child from "child_process";
import { fetchBinary } from "./network";

export const pathsFromBasePath = (
  basePath: string,
  os: "linux" | "macos" | "windows"
) => {
  let dualServerPath: string,
    dualAbsoluteBinaryPath: string,
    dualAbsoluteTorchZipPath: string,
    dualAbsoluteTorchPath: string,
    dualAbsoluteTorchLibPath: string;
  if (os === "linux" || os === "macos") {
    dualServerPath = basePath + "/.obsidian/plugins/Dual/server";
    dualAbsoluteBinaryPath = dualServerPath + "/dual-server-" + os;
    dualAbsoluteTorchZipPath = dualServerPath + "/libtorch.zip";
    dualAbsoluteTorchPath = dualServerPath + "/libtorch";
    dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "/lib";
  } else if (os === "windows") {
    dualServerPath = basePath + "\\.obsidian\\plugins\\Dual\\server";
    dualAbsoluteBinaryPath = dualServerPath + "\\dual-server-windows.exe";
    dualAbsoluteTorchZipPath = dualServerPath + "\\libtorch.zip";
    dualAbsoluteTorchPath = dualServerPath + "\\libtorch";
    dualAbsoluteTorchLibPath = dualAbsoluteTorchPath + "\\lib";
  }
  return {
    dualServerPath,
    dualAbsoluteBinaryPath,
    dualAbsoluteTorchZipPath,
    dualAbsoluteTorchPath,
    dualAbsoluteTorchLibPath,
  };
};

export async function exists(path: string) {
  return fs.accessSync(path);
}

export async function ensurePathExists(path: string) {
  return fs.ensureDir(path);
}

export async function writeFile(path: string, data: ArrayBuffer) {
  return fs.writeFile(path, data);
}

export async function extractZip(zipPath: string, destPath: string) {
  const zip = new AdmZip(zipPath);
  return zip.extractAllToAsync(destPath, true);
}

export async function makeExecutable(path: string) {
  return child.exec("chmod +x " + path);
}

export async function fetchBinaryToDisk(url: string, path: string) {
  const res = await fetchBinary(url);
  return writeFile(path, Buffer.from(await res.arrayBuffer()));
}

export async function removeFile(path: string) {
  return fs.removeSync(path);
}
