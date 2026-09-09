const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// A Gradle build creates and deletes CMake scratch directories under
// node_modules/*/android/.cxx, and Metro's Windows watcher throws ENOENT and
// exits when one disappears mid-crawl - so `expo start` and `expo run:android`
// could not be running at the same time. Nothing under these paths is ever
// imported, so keeping them out of the file map costs nothing.
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : [existing].filter(Boolean)),
  /[\\/]android[\\/]\.cxx[\\/].*/,
  /[\\/]android[\\/]build[\\/].*/,
];

module.exports = withNativeWind(config, { input: './global.css' });
