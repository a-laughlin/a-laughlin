const lerna_json = require('./lerna.json')
module.exports = function (api) {
  api.cache(true);

  const presets = [
    ["@babel/preset-env",{
      "targets": {
        "esmodules": true,
        "chrome": "58",
        "node":"10.15.3"
      }
    }]
  ];
  const plugins = [
    "@babel/plugin-transform-modules-commonjs"
  ];

  return {
    presets,
    plugins,
    babelrcRoots: lerna_json.packages,
  };
}
