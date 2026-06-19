const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, "../../node_modules")];

config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules[/\\].*[/\\].*_tmp_[0-9]+[/\\].*/,
  /.*\.pnpm[/\\]@firebase\+database.*/,
];

module.exports = config;
