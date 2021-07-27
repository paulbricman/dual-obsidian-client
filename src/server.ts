/**
 * Functions relating to the Dual server binary
 */

import child from "child_process";

export function startServer(
  onData: (...args: any) => void,
  onError: (...args: any) => void,
  dualServerPath: string,
  dualAbsoluteBinaryPath: string,
  dualAbsoluteTorchPath: string,
  dualAbsoluteTorchLibPath: string
) {
  const childProc = child.spawn(dualAbsoluteBinaryPath, [], {
    cwd: dualServerPath,
    detached: false,
    env: {
      LIBTORCH: dualAbsoluteTorchPath,
      LD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
      DYLD_LIBRARY_PATH: dualAbsoluteTorchLibPath,
      Path: dualAbsoluteTorchLibPath,
      RUST_BACKTRACE: "1",
    },
  });

  childProc.stdout.on("data", (data) => onData(`Dual Server: ${data}`));

  childProc.stderr.on("data", (data) =>
    onError(`Dual Server [Error]: ${data}`)
  );
}
