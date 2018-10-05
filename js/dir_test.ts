import { test, testPerm, assert, assertEqual } from "./test_util.ts";
import * as deno from "deno";

test(function NotNullcwd() {
  assert(deno.cwd() != null);
});

testPerm({ write: true }, function mkdirSyncSuccess() {
  const path = deno.makeTempDirSync() + "/dir/subdir";
  deno.mkdirSync(path);
  deno.chdir(path);
  assertEqual(deno.cwd(), path);
});
