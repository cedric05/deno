// Copyright 2018 the Deno authors. All rights reserved. MIT license.
extern crate flatbuffers;
#[macro_use]
extern crate futures;
// extern crate rustyline;
extern crate hyper;
extern crate libc;
extern crate msg_rs as msg;
extern crate rustyline;
extern crate rand;
extern crate tempfile;
extern crate tokio;
extern crate tokio_executor;
extern crate tokio_fs;
extern crate tokio_io;
extern crate tokio_threadpool;
extern crate url;
#[macro_use]
extern crate lazy_static;
#[macro_use]
extern crate log;
extern crate dirs;
extern crate hyper_rustls;
extern crate remove_dir_all;
extern crate ring;


use rustyline::error::ReadlineError;
use rustyline::Editor;

mod deno_dir;
mod errors;
mod flags;
mod fs;
mod http_util;
mod isolate;
mod libdeno;
pub mod ops;
mod resources;
mod tokio_util;
mod version;

use std::env;

static LOGGER: Logger = Logger;

struct Logger;

impl log::Log for Logger {
  fn enabled(&self, metadata: &log::Metadata) -> bool {
    metadata.level() <= log::max_level()
  }

  fn log(&self, record: &log::Record) {
    if self.enabled(record.metadata()) {
      println!("{} RS - {}", record.level(), record.args());
    }
  }
  fn flush(&self) {}
}

fn main() {
  // Rust does not die on panic by default. And -Cpanic=abort is broken.
  // https://github.com/rust-lang/cargo/issues/2738
  // Therefore this hack.
  std::panic::set_hook(Box::new(|panic_info| {
    if let Some(location) = panic_info.location() {
      println!("PANIC file '{}' line {}", location.file(), location.line());
    } else {
      println!("PANIC occurred but can't get location information...");
    }
    std::process::abort();
  }));

  log::set_logger(&LOGGER).unwrap();
  let args = env::args().collect();
  let args2: Vec<String> = env::args().collect();
  let mut isolate = isolate::Isolate::new(args, ops::dispatch);
  flags::process(&isolate.state.flags);
  tokio_util::init(|| {
    isolate
      .execute("deno_main.js", "denoMain();")
      .unwrap_or_else(|err| {
        error!("{}", err);
        std::process::exit(1);
      });
    isolate.event_loop();
    if args2.len() == 1{
      repl_loop(isolate)
    }
  });
}

#[allow(dead_code)]
fn repl_loop(isolate:Box<isolate::Isolate>) {
    // `()` can be used when no completer is required
    let mut rl = Editor::<()>::new();
    if rl.load_history("history.txt").is_err() {
        println!("No previous history.");
    }
    loop {
        let readline = rl.readline(">> ");
        match readline {
            Ok(line) => {
                rl.add_history_entry(line.as_ref());
                isolate.execute("deno_main.js", &line)
                .unwrap_or_else(|_err| {
                  // error!("{}", err);
                  println!("{}","error happened" )
                 });
                // println!("Line: {}", line);
            },
            Err(ReadlineError::Interrupted) => {
                println!("CTRL-C");
                break
            },
            Err(ReadlineError::Eof) => {
                println!("CTRL-D");
                break
            },
            Err(err) => {
                println!("Error: {:?}", err);
                break
            }
        }
    }
    rl.save_history("history.txt").unwrap();
}