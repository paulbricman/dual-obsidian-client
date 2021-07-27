import { normalize } from "path";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import child from "child_process";
import { fetchBinary } from "./network";

export const pathsFromBasePath = (
  basePath: string,
  os: "linux" | "macos" | "windows"
) => {
  let serverPath: string,
    binaryPath: string,
    torchZipPath: string,
    torchPath: string,
    torchLibPath: string;
  if (os === "linux" || os === "macos") {
    serverPath = basePath + "/.obsidian/plugins/Dual/server";
    binaryPath = serverPath + "/dual-server-" + os;
    torchZipPath = serverPath + "/libtorch.zip";
    torchPath = serverPath + "/libtorch";
    torchLibPath = torchPath + "/lib";
  } else if (os === "windows") {
    serverPath = basePath + "\\.obsidian\\plugins\\Dual\\server";
    binaryPath = serverPath + "\\dual-server-windows.exe";
    torchZipPath = serverPath + "\\libtorch.zip";
    torchPath = serverPath + "\\libtorch";
    torchLibPath = torchPath + "\\lib";
  }
  return {
    serverPath,
    binaryPath,
    torchZipPath,
    torchPath,
    torchLibPath,
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
