const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure proper file extensions are supported
config.resolver.sourceExts.push("cjs");

module.exports = config;
