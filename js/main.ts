// Copyright 2018 the Deno authors. All rights reserved. MIT license.
import { flatbuffers } from "flatbuffers";
import * as msg from "gen/msg_generated";
import { assert, log, setLogDebug } from "./util";
import * as os from "./os";
import { DenoCompiler } from "./compiler";
import { libdeno } from "./libdeno";
import { args } from "./deno";
import { sendSync, handleAsyncMsgFromRust } from "./dispatch";

function sendStart(): msg.StartRes {
  const builder = new flatbuffers.Builder();
  msg.Start.startStart(builder);
  const startOffset = msg.Start.endStart(builder);
  const baseRes = sendSync(builder, msg.Any.Start, startOffset);
  assert(baseRes != null);
  assert(msg.Any.StartRes === baseRes!.innerType());
  const startRes = new msg.StartRes();
  assert(baseRes!.inner(startRes) != null);
  return startRes;
}

function onGlobalError(
  message: string,
  source: string,
  lineno: number,
  colno: number,
  error: any // tslint:disable-line:no-any
) {
  if (error instanceof Error) {
    console.log(error.stack);
  } else {
    console.log(`Thrown: ${String(error)}`);
  }
  // FIXME this is a hack, and anyway doesn't work for `throw "error"`
  // which (for some reason) has source == undefined
  if (source !== 'deno repl') {
    console.log(`Source: ${source}`);
    os.exit(1);
  }
}

/* tslint:disable-next-line:no-default-export */
export default function denoMain() {
  libdeno.recv(handleAsyncMsgFromRust);
  libdeno.setGlobalErrorHandler(onGlobalError);
  const compiler = DenoCompiler.instance();

  // First we send an empty "Start" message to let the privileged side know we
  // are ready. The response should be a "StartRes" message containing the CLI
  // args and other info.
  const startResMsg = sendStart();

  setLogDebug(startResMsg.debugFlag());

  const cwd = startResMsg.cwd();
  log("cwd", cwd);

  // TODO handle shebang.
  for (let i = 1; i < startResMsg.argvLength(); i++) {
    args.push(startResMsg.argv(i));
  }
  log("args", args);
  Object.freeze(args);
  const inputFn = args[0];
  if (!inputFn) {
    // console.log("not exiting")
    // console.log("No input script specified.");
    // os.exit(1);
  }
 else {
  const printDeps = startResMsg.depsFlag();
  if (printDeps) {
    for (const dep of compiler.getModuleDependencies(inputFn, `${cwd}/`)) {
      console.log(dep);
    }
    os.exit(0);
  }

  compiler.recompile = startResMsg.recompileFlag();
  compiler.run(inputFn, `${cwd}/`);
}
}
