import {join} from 'path';
import {readdirSync,existsSync} from 'fs';
import merge from 'lodash/merge';
import webpack from 'webpack';

// ways to import files across packages
// webpack module federation
// yarn workspaces
// publishing to npm

export default (env/* ,argv */)=>readdirSync(path.join(__dirname,'js')).map((packageDirName=>{
  const {production}=env;
  const packageRoot=join(__dirname,packageDirName);
  const {name,main}=require(join(packageRoot,'package.json'));
  const subConfigLoc=join(packageRoot,'webpack.config.js');
  const subConfig=existsSync(subConfigLoc)?{}:require.resolve(subConfigLoc);
  return merge({
    // mode enables various built in optimizations https://webpack.js.org/configuration/mode/#usage
    mode: production ? 'production' : 'development',
    
    // entry: where webpack looks to start bundling each entry
    // entry may be dynamic (https://webpack.js.org/configuration/entry-context/#dynamic-entry)
    entry:{[name]:main},

    // devtool controls how source maps are generated https://webpack.js.org/configuration/devtool/
    // it applies SourceMapDevToolPlugin/EvalSourceMapDevToolPlugin internally, so don't use both
    devtool:production?false:'source-map',
    
    output:{
      globalObject:'this', // so the umd output will resolve to global on node, and window in browser
      path:join(packageRoot,'dist'),
      filename:`${name}.umd.js`,
      library:name,
      libraryTarget: 'umd'
    },
    rules:[// or mergeWith, to merge rules
      {
        test:/\.css$/,
        exclude: ['node_modules'],
        // rule issuer - matches the requesting module, so different deps can be loaded for different files
        // use: [{loader: 'css-loader'}, {loader: 'style-loader'}]
      },// loaders run last-to-first
      {
        test:/\.js$/,
        exclude: ['node_modules'],
        // loaders: [{loader: 'babel'}]
      },
      {
        test:/\.jsx$/,
        // loaders: [{loader: 'babel'}]
      }
    ],
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
  },subConfig);
}));