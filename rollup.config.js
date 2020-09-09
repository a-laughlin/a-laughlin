// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // only for xstream and react
import visualizer from 'rollup-plugin-visualizer';
// import {default as transpile} from '@rollup/plugin-sucrase';
import {terser} from 'rollup-plugin-terser';
import copy from 'rollup-plugin-cpy';
import alias from '@rollup/plugin-alias';
import analyze from 'rollup-plugin-analyzer';
// const prettier = require('rollup-plugin-prettier');
// const eslint = require('rollup-plugin-prettier');
import sourcemap from 'rollup-plugin-sourcemaps';

const snakeToStartCase = s=>s.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
import {readdirSync,writeFileSync} from 'fs';
import {join} from 'path';
// import terser from '@rollup/plugin-terser';
import injectProcessEnv from 'rollup-plugin-inject-process-env';

// how to use this for 3 loops, one for dev, one for prod, one for prod-min
// sets the process object in each environment
const processEnvPlugin = injectProcessEnv({ 
  NODE_ENV: process.env.NODE_ENV||'production'
});

const resolvePlugin = resolve({
  customResolveOptions: {
    moduleDirectory: 'node_modules'
  },
  mainFields: ['module', 'main', 'browser']
});
const commonjsPlugin = commonjs({ esmExternals:true });
const sourceMapPlugin = sourcemap();
const terserPlugin = terser();


const modules = readdirSync('packages')
.filter(dir=>dir!=='.DS_Store')
.map(dir=>({
  dir,
  outDir:join(`packages`,dir,'dist'),
  inDir:join(`packages`,dir,'src'),
  entryFileNames:join(`packages`,dir,'src',`${dir}.js`),
}))
.map(({dir,outDir,inDir,entryFileNames})=>({
  external:[
    'lodash-es',
    'react',
    'react-dom',
    'xstream',
  ],
  input:join(inDir,`${dir}.js`),
  output:['es','umd','cjs'].flatMap(format=>[
    {format, file:join(outDir,format,`${dir}.js`),compact:true, entryFileNames},
    {format, file:join(outDir,format,`${dir}.min.js`),compact:true,sourcemap:true, entryFileNames, plugins:[terserPlugin]},
  ]).map(o=>o.format!=='umd'?o:{
    ...o,
    name:snakeToStartCase(dir),
    globals:{
      react:'react',
      xstream:'xstream',
      '@a-laughlin/fp-utils':'fpUtils',
      '@a-laughlin/style-string-to-object':'styleStringToObject'
    }
  }),
  plugins:[
    alias({entries: [
      // rollup is unaware of yarn workspaces, so alias input paths when building
      { find: '@a-laughlin/fp-utils', replacement: 'packages/fp-utils/src/fp-utils.js' },
      { find: '@a-laughlin/style-string-to-object', replacement: 'packages/style-string-to-object/src/style-string-to-object.js' },
      // { find: 'react', replacement: 'https://unpkg.com/react@16/umd/react.development.js' },
    ]}),
    resolvePlugin,
    commonjsPlugin, // must go after resolve
    processEnvPlugin, // must go after commonjs
    sourceMapPlugin,
    copy([ { files: join(`packages`,dir,'{LICENSE,package.json}'), dest: outDir }]),
    analyze({
      onAnalysis:o=>writeFileSync(join(outDir,'stats.json'),JSON.stringify(o,null,2)),
      writeTo:s=>writeFileSync(join(outDir,'stats.txt'),s)
    }),
    visualizer({ template:"treemap", filename:join(outDir,'stats-treemap.html')}),
    visualizer({ template:"network", filename:join(outDir,'stats-network.html')}),
  ],
}))
export default modules;

  // const getExamplePlugin = ()=>({
  //   name: 'my-example', // this name will show up in warnings and errors
  //   // returning source avoids rollup looking for the id in other plugins or the file system
  //   resolveId:source =>source === '\0virtual-module' ? source : null,
  //   // loads the source code for virtual module, else passes on to next plugin
  //   load:id=>id === '\0virtual-module' ? 'export default "This is virtual!"' : null,
  //   // transform:()=>{}
  // });
  // { // example plugin
  //   input: '\0virtual-module',
  //   plugins: [getExamplePlugin()],
  //   output: [{
  //     file: 'dist/virtual-module.js',
  //     format: 'es'
  //   }]
  // }
