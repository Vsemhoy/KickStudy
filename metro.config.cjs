const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const root = __dirname.split(path.sep).map(escapeRegex).join('[\\\\/]');

// Local Android tools and build output are not application sources. Exclude them
// from both project-relative crawling and absolute-path file watching.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList]).filter(Boolean),
  new RegExp(`^(?:${root}[\\\\/])?(?:\\.cache|\\.gradle|build)(?:[\\\\/]|$)`),
];

module.exports = config;
