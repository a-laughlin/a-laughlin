// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // only for xstream and react
import html from '@rollup/plugin-html'; // only for xstream and react
import visualizer from 'rollup-plugin-visualizer';
import {default as transpile} from '@rollup/plugin-sucrase';
import {terser} from 'rollup-plugin-terser';
import copy from 'rollup-plugin-cpy';
import alias from '@rollup/plugin-alias';
import analyze from 'rollup-plugin-analyzer';
// const prettier = require('rollup-plugin-prettier');
// const eslint = require('rollup-plugin-prettier');
// import sourcemap from '@rollup/plugin-sourcemaps';

const snakeToStartCase = s=>s.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
import {readdirSync,writeFileSync} from 'fs';
import {join} from 'path';
// import terser from '@rollup/plugin-terser';




const resolvePlugin = resolve({customResolveOptions: {moduleDirectory: 'node_modules'}});
const commonjsPlugin = commonjs({esmExternals:true});
const analyzePlugin = analyze({
  summaryOnly:true,
});
const aliasPlugin = alias({entries: [
  { find: '@a-laughlin/fp-utils', replacement: '../fp-utils/fp-utils.js' },
  { find: 'react', replacement: 'https://unpkg.com/react@16/umd/react.development.js' },
]});
const modules = readdirSync('./src')
.filter(dir=>dir!=='.DS_Store')
.map(dir=>({dir,file:`${dir}.js`}))
.map(({dir,file})=>({
  dir,
  file,
  dirFile:join(dir,file),
  inDir:join('src',dir),
  outDir:join('dist/es',dir)
}))
// ...flatmap (other bundling types)
.map(({dir,file,dirFile,inDir,outDir})=>({
  external:[ 'lodash-es', 'react', 'react-dom', 'xstream' ],
  input:join(inDir,file),
  plugins:[
    aliasPlugin,
    ...(dir!=='gqdux'?[]:[copy([ { files: join(inDir,'*.html'), dest: outDir }])]),
    copy([ { files: join(inDir,'package.json'), dest: outDir }]),
    resolvePlugin,
    commonjsPlugin,
    analyze({
      onAnalysis:o=>writeFileSync(join(outDir,'stats.json'),JSON.stringify(o,null,2)),
      writeTo:s=>writeFileSync(join(outDir,'stats.txt'),s)
    }),
    visualizer({ template:"treemap", filename:join(outDir,'stats-treemap.html')}),
    visualizer({ template:"network", filename:join(outDir,'stats-network.html')}),
  ],
  output:[
    {format:'es', file:join(outDir,file.replace('.js','.min.js')),compact:true, entryFileNames:dirFile, plugins:[terser()]},
    {format:'es', file:join(outDir,file),compact:true, entryFileNames:dirFile},
    {format:'umd', file:join(outDir,file.replace('.js','.umd.min.js')),compact:true, entryFileNames:dirFile, plugins:[terser()],name:snakeToStartCase(dir)},
    {format:'umd', file:join(outDir,file.replace('.js','.umd.js')),compact:true, entryFileNames:dirFile,name:snakeToStartCase(dir)},
  ]
}));

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
