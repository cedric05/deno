// Copyright 2018 the Deno authors. All rights reserved. MIT license.
import * as fbs from "gen/msg_generated";
import { flatbuffers } from "flatbuffers";
import * as dispatch from "./dispatch";
import { assert } from "./util";
import { FileInfo, FileInfoImpl } from "./fileinfo";

/**
 * Queries the file system for information on the path provided.
 * If the given path is a symlink information about the symlink will
 * be returned.
 *
 *     import { lstat } from "deno";
 *     const fileInfo = await lstat("hello.txt");
 *     assert(fileInfo.isFile());
 */
export async function lstat(filename: string): Promise<FileInfo> {
  return res(await dispatch.sendAsync(...req(filename, true)));
}

/**
 * Queries the file system for information on the path provided synchronously.
 * If the given path is a symlink information about the symlink will
 * be returned.
 *
 *     import { lstatSync } from "deno";
 *     const fileInfo = lstatSync("hello.txt");
 *     assert(fileInfo.isFile());
 */
export function lstatSync(filename: string): FileInfo {
  return res(dispatch.sendSync(...req(filename, true)));
}

/**
 * Queries the file system for information on the path provided.
 * `stat` Will always follow symlinks.
 *
 *     import { stat } from "deno";
 *     const fileInfo = await stat("hello.txt");
 *     assert(fileInfo.isFile());
 */
export async function stat(filename: string): Promise<FileInfo> {
  return res(await dispatch.sendAsync(...req(filename, false)));
}

/**
 * Queries the file system for information on the path provided synchronously.
 * `statSync` Will always follow symlinks.
 *
 *     import { statSync } from "deno";
 *     const fileInfo = statSync("hello.txt");
 *     assert(fileInfo.isFile());
 */
export function statSync(filename: string): FileInfo {
  return res(dispatch.sendSync(...req(filename, false)));
}

function req(
  filename: string,
  lstat: boolean
): [flatbuffers.Builder, fbs.Any, flatbuffers.Offset] {
  const builder = new flatbuffers.Builder();
  const filename_ = builder.createString(filename);
  fbs.Stat.startStat(builder);
  fbs.Stat.addFilename(builder, filename_);
  fbs.Stat.addLstat(builder, lstat);
  const msg = fbs.Stat.endStat(builder);
  return [builder, fbs.Any.Stat, msg];
}

function res(baseRes: null | fbs.Base): FileInfo {
  assert(baseRes != null);
  assert(fbs.Any.StatRes === baseRes!.msgType());
  const res = new fbs.StatRes();
  assert(baseRes!.msg(res) != null);
  return new FileInfoImpl(res);
}
