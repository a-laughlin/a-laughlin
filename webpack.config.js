const {join} =require('path');
const {readdirSync,existsSync}=require('fs');
const merge = require('lodash-es/merge');
const webpack = require('webpack');
// const nodeExternals=require("webpack-node-externals")
// ways to import files across packages
// webpack module federation
// yarn workspaces
// publishing to npm
const srcDir=join(__dirname,'src');
const distDir=join(__dirname,'dist');
module.exports = function(env,argv){
  const mode = argv.mode||process.env.NODE_ENV||'production';
  // return readdirSync(srcDir).map(packageDirName=>{
  //   const packageRoot=join(srcDir,packageDirName);
  //   console.log(`packageRoot`,packageRoot)
  //   const subConfigLoc=join(packageRoot,'webpack.config.js');
  //   const subConfig=existsSync(subConfigLoc)?{}:require.resolve(subConfigLoc);
  //   const {name,main}=require(join(packageRoot,'package.json'));
  // });
  return readdirSync(srcDir).filter(dname=>!dname.startsWith('.')).map(dirName=>{
    const entryDir=join(srcDir,dirName);
    const outputDir=join(distDir,dirName);
    const package=require(join(entryDir,'package.json'));
    console.log(`package.name`,package.name)
    const main=join(entryDir,package.main);
    const name=package.name;
    return ({
      // mode enables various built in optimizations https://webpack.js.org/configuration/mode/#usage
      mode,
      
      // entry: where webpack looks to start bundling each entry
      // entry may be dynamic (https://webpack.js.org/configuration/entry-context/#dynamic-entry)
      entry:main,
  
      // devtool controls how source maps are generated https://webpack.js.org/configuration/devtool/
      // it applies SourceMapDevToolPlugin/EvalSourceMapDevToolPlugin internally, so don't use both
      devtool:mode==='production'?false:'source-map',
      externals:{
        lodash:'lodash',
        'lodash-es/*':'lodash-es/*',
        react:'react',
        xstream:'xstream',
        terser:'terser',
        graphql:'graphql',
        'graphql-tag':'graphql-tag',
      },
      output:{
        globalObject:'this', // so the umd output will resolve to global on node, and window in browser
        path:outputDir,
        filename:`${name}.umd.js`,
        library:`@a-laughlin`,
        libraryTarget: 'umd'
      },
      module:{
        rules:[// or mergeWith, to merge rules
          // {
          //   test:/\.css$/,
          //   exclude: ['node_modules'],
          //   // rule issuer - matches the requesting module, so different deps can be loaded for different files
          //   // use: [{loader: 'css-loader'}, {loader: 'style-loader'}]
          // },// loaders run last-to-first
          {
            test:/\.m?js$/,
            // include:[]
            exclude: /.*node_modules|\.test.js/,
            // loader: 'babel-loader'
          },
          // {
          //   test:/\.jsx$/,
          //   // loaders: [{loader: 'babel'}]
          // }
        ]
      },
      // compile to different targets like web, node, electron
      // node 12+ with modules enabled should work with web, at least for non-dynamic imports
      // also accepts a function for custom compiling with custom plugins
      target:'web',
      devServer:{hotOnly:true},
      plugins:[
        // new webpack.ProvidePlugin({
        //   App: path.resolve(path.join(__dirname, 'core-webapp','...','App.js'))
        // })
      ]
    })
  });
};