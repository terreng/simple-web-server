/*
 * sws_ffi.h — C ABI for the Simple Web Server Rust core.
 *
 * Hand-maintained to match app/rust-server/ffi/src/lib.rs. If you change the
 * Rust `SwsSettings` struct or any exported function, update this header too.
 * (You can also regenerate with cbindgen; the hand-written copy is kept so the
 * native builds don't depend on a codegen step.)
 *
 * Field order and types MUST match `#[repr(C)] struct SwsSettings` exactly.
 */
#ifndef SWS_FFI_H
#define SWS_FFI_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct SwsServerHandle SwsServerHandle;

typedef struct SwsSettings {
  int32_t port;
  const char *path;
  bool local_network;
  bool spa;
  const char *rewrite_to;
  bool directory_listing;
  bool exclude_dot_html;
  bool ipv6;
  bool hidden_dot_files;
  bool cors;
  bool upload;
  bool replace;
  bool delete_files; /* not `delete` — that is a C++ keyword */
  bool hidden_dot_files_directory_listing;
  const char *custom401;
  const char *custom403;
  const char *custom404;
  const char *custom500;
  bool http_auth;
  const char *http_auth_username;
  const char *http_auth_password;
  bool index;
  bool https;
  const char *https_cert;
  const char *https_key;
} SwsSettings;

/* Create a server (not started). Returns NULL if `settings` is NULL. */
SwsServerHandle *sws_server_create(const SwsSettings *settings);

/* Start listening. false => bind failed (e.g. port in use). */
bool sws_server_start(SwsServerHandle *handle);

/* Signal the server to stop. Idempotent. */
void sws_server_terminate(SwsServerHandle *handle);

/* Terminate (if needed) and free the handle. */
void sws_server_free(SwsServerHandle *handle);

/* Generate a self-signed cert + key (PEM). Caller frees via sws_string_free. */
bool sws_generate_cert_and_key(char **out_cert, char **out_key);

/* Free a string returned by this library. */
void sws_string_free(char *s);

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* SWS_FFI_H */
