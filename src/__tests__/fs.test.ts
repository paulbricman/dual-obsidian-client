import { pathsFromBasePath } from "../fs";

test("Generates paths on linux", () => {
  expect(pathsFromBasePath("/basepath", "linux")).toEqual({
    dualServerPath: "/basepath/.obsidian/plugins/Dual/server",
    dualAbsoluteBinaryPath:
      "/basepath/.obsidian/plugins/Dual/server/dual-server-linux",
    dualRelativeBinaryPath: "/.obsidian/plugins/Dual/server/dual-server-linux",
    dualAbsoluteTorchZipPath:
      "/basepath/.obsidian/plugins/Dual/server/libtorch.zip",
    dualRelativeTorchZipPath: "/.obsidian/plugins/Dual/server/libtorch.zip",
    dualAbsoluteTorchPath: "/basepath/.obsidian/plugins/Dual/server/libtorch",
    dualAbsoluteTorchLibPath:
      "/basepath/.obsidian/plugins/Dual/server/libtorch/lib",
  });
});

test("Generates paths on macos", () => {
  expect(pathsFromBasePath("/basepath", "macos")).toEqual({
    dualServerPath: "/basepath/.obsidian/plugins/Dual/server",
    dualAbsoluteBinaryPath:
      "/basepath/.obsidian/plugins/Dual/server/dual-server-macos",
    dualRelativeBinaryPath: "/.obsidian/plugins/Dual/server/dual-server-macos",
    dualAbsoluteTorchZipPath:
      "/basepath/.obsidian/plugins/Dual/server/libtorch.zip",
    dualRelativeTorchZipPath: "/.obsidian/plugins/Dual/server/libtorch.zip",
    dualAbsoluteTorchPath: "/basepath/.obsidian/plugins/Dual/server/libtorch",
    dualAbsoluteTorchLibPath:
      "/basepath/.obsidian/plugins/Dual/server/libtorch/lib",
  });
});

test("Generates paths on windows", () => {
  expect(pathsFromBasePath("/basepath", "windows")).toEqual({
    dualServerPath: "/basepath\\.obsidian\\plugins\\Dual\\server",
    dualAbsoluteBinaryPath:
      "/basepath\\.obsidian\\plugins\\Dual\\server\\dual-server-windows.exe",
    dualRelativeBinaryPath:
      "\\.obsidian\\plugins\\Dual\\server\\dual-server-windows.exe",
    dualAbsoluteTorchZipPath:
      "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch.zip",
    dualRelativeTorchZipPath:
      "\\.obsidian\\plugins\\Dual\\server\\libtorch.zip",
    dualAbsoluteTorchPath:
      "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch",
    dualAbsoluteTorchLibPath:
      "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch\\lib",
  });
});
