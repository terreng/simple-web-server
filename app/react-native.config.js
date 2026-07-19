/**
 * react-native autolinking config.
 *
 * The server-manager / bookmarks / background native code is app-local (it lives
 * inside the windows/ and macos/ app projects, not in a separate npm package),
 * so there are no extra dependency platforms to declare here. This file mainly
 * exists to pin the project entry and keep autolinking predictable.
 */
module.exports = {
  project: {
    windows: {
      sourceDir: 'windows',
      solutionFile: 'SimpleWebServer.sln',
      project: {
        projectFile: 'SimpleWebServer/SimpleWebServer.vcxproj',
      },
    },
  },
};
