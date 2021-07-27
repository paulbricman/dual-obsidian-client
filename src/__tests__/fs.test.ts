import { pathsFromBasePath } from "../fs";

test("Generates paths on linux", () => {
  expect(pathsFromBasePath("/basepath", "linux")).toEqual({
    serverPath: "/basepath/.obsidian/plugins/Dual/server",
    binaryPath: "/basepath/.obsidian/plugins/Dual/server/dual-server-linux",
    torchZipPath: "/basepath/.obsidian/plugins/Dual/server/libtorch.zip",
    torchPath: "/basepath/.obsidian/plugins/Dual/server/libtorch",
    torchLibPath: "/basepath/.obsidian/plugins/Dual/server/libtorch/lib",
  });
});

test("Generates paths on macos", () => {
  expect(pathsFromBasePath("/basepath", "macos")).toEqual({
    serverPath: "/basepath/.obsidian/plugins/Dual/server",
    binaryPath: "/basepath/.obsidian/plugins/Dual/server/dual-server-macos",
    torchZipPath: "/basepath/.obsidian/plugins/Dual/server/libtorch.zip",
    torchPath: "/basepath/.obsidian/plugins/Dual/server/libtorch",
    torchLibPath: "/basepath/.obsidian/plugins/Dual/server/libtorch/lib",
  });
});

test("Generates paths on windows", () => {
  expect(pathsFromBasePath("/basepath", "windows")).toEqual({
    serverPath: "/basepath\\.obsidian\\plugins\\Dual\\server",
    binaryPath:
      "/basepath\\.obsidian\\plugins\\Dual\\server\\dual-server-windows.exe",
    torchZipPath: "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch.zip",
    torchPath: "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch",
    torchLibPath: "/basepath\\.obsidian\\plugins\\Dual\\server\\libtorch\\lib",
  });
});
