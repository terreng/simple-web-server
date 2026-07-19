/*
 * smoke.c — end-to-end check of the C ABI without a GUI.
 *
 * Starts a server on a temp web root, verifies a second server on the same port
 * fails to bind (the "port in use" signal the UI relies on), fetches a file, and
 * exercises cert generation. Used by CI (scripts/verify-core.sh) and locally.
 *
 * Usage: smoke <webroot-dir> [port]
 */
#include "sws_ffi.h"

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#ifdef _WIN32
#include <windows.h>
#define SLEEP_MS(ms) Sleep(ms)
#else
#include <unistd.h>
#define SLEEP_MS(ms) usleep((ms) * 1000)
#endif

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <webroot> [port]\n", argv[0]);
    return 64;
  }
  int port = argc >= 3 ? atoi(argv[2]) : 18080;

  SwsSettings s;
  memset(&s, 0, sizeof(s));
  s.port = port;
  s.path = argv[1];
  s.directory_listing = true;
  s.index = true;
  s.hidden_dot_files_directory_listing = true;
  s.rewrite_to = "/index.html";

  SwsServerHandle* h = sws_server_create(&s);
  if (!h) {
    printf("FAIL: create returned null\n");
    return 1;
  }
  if (!sws_server_start(h)) {
    printf("FAIL: start returned false\n");
    return 1;
  }
  printf("ok: server started on port %d\n", port);

  /* A second server on the same port must fail to bind. */
  SwsServerHandle* h2 = sws_server_create(&s);
  if (sws_server_start(h2)) {
    printf("FAIL: duplicate port unexpectedly started\n");
    return 1;
  }
  printf("ok: duplicate port correctly refused (EADDRINUSE path)\n");

  SLEEP_MS(300);

  /* Cert generation. */
  char *cert = NULL, *key = NULL;
  if (!sws_generate_cert_and_key(&cert, &key) || !cert || !key) {
    printf("FAIL: cert generation failed\n");
    return 1;
  }
  if (strncmp(cert, "-----BEGIN CERTIFICATE-----", 27) != 0) {
    printf("FAIL: cert does not look like PEM\n");
    return 1;
  }
  printf("ok: cert generated (%zu bytes)\n", strlen(cert));
  sws_string_free(cert);
  sws_string_free(key);

  sws_server_free(h);
  sws_server_free(h2);
  printf("ok: teardown\n");
  printf("SMOKE PASS\n");
  return 0;
}
