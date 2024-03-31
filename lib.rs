use napi::{
    bindgen_prelude::*,
    threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;
use std::{
    mem,
    path::{Path, PathBuf},
};

#[napi]
pub fn cause_crash() {
    #[allow(deref_nullptr)]
    unsafe {
        *std::ptr::null_mut() = true;
    }
}

#[napi]
pub fn start_crash_reporter_server(
    socket_name: String,
    crashes_dir: String,
    stale_timeout: f64,
    #[napi(ts_arg_type = "(err: null | Error, result: ArrayBuffer) => void")] callback: JsFunction,
) -> Result<()> {
    let threadsafe_fn: ThreadsafeFunction<Vec<u8>, ErrorStrategy::CalleeHandled> = callback
        .create_threadsafe_function(0, |ctx| {
            ctx.env
                .create_buffer_with_data(ctx.value)
                .map(|v| vec![v.into_raw()])
        })
        .expect("Failed to create threadsafe function");

    let callback = move |buf: Vec<u8>, _path: &Path| {
        threadsafe_fn.call(Ok(buf), ThreadsafeFunctionCallMode::Blocking);
    };

    let message = |_: u32, __: Vec<u8>| {};

    minidumper_child::server::start(
        &socket_name,
        PathBuf::from(crashes_dir),
        stale_timeout as u64,
        Some(callback),
        Some(message),
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to start crash reporter server: {}", e),
        )
    })?;

    Ok(())
}

#[napi]
pub fn hook_crash_signals(
    socket_name: String,
    connect_timeout: f64,
    server_pid: f64,
    server_poll: f64,
) -> Result<()> {
    let handler = minidumper_child::client::start(
        &socket_name,
        connect_timeout as u64,
        server_pid as u32,
        server_poll as u64,
    )
    .map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to hook crash signals: {}", e),
        )
    })?;

    // Rather than returning a reference which might get GC'd, we forget the
    // handler so that it's never dropped.
    mem::forget(handler);

    Ok(())
}
