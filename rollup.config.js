// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // only for xstream and react
import html from '@rollup/plugin-html'; // only for xstream and react
import visualizer from 'rollup-plugin-visualizer';
import {default as transpile} from '@rollup/plugin-sucrase';
// import terser from '@rollup/plugin-terser';
// import terser from '@rollup/plugin-sourcemaps';

import {readdirSync} from 'fs';
import {join} from 'path';
// import terser from '@rollup/plugin-terser';

const modules = readdirSync('./src').filter(p=>p!=='.DS_Store').map(p=>join('src',p,`${p}.js`));

const resolvePlugin = resolve({customResolveOptions: {moduleDirectory: 'node_modules'}});
const commonjsPlugin = commonjs({esmExternals:true});
const visualizerPlugin = visualizer();
const htmlPlugin = html();
const transpilePlugin = transpile({transforms: ['jsx']});


const getExamplePlugin = ()=>({
  name: 'my-example', // this name will show up in warnings and errors
  // returning source avoids rollup looking for the id in other plugins or the file system
  resolveId:source =>source === '\0virtual-module' ? source : null,
  // loads the source code for virtual module, else passes on to next plugin
  load:id=>id === '\0virtual-module' ? 'export default "This is virtual!"' : null,
  // transform:()=>{}
})
const examplePlugin = getExamplePlugin();

export default [
  ...modules.map(p=>({
    external:['lodash-es'],
    input:[p],
    plugins:[resolvePlugin,commonjsPlugin],
    output:[{
      dir: 'dist/es', format:'es', compact:true,
      entryFileNames:"[name]/[name].js",
      // manualChunks:(id,{getModuleIds,getModuleInfo})=>{
      //   // if (id.includes('node_modules/'))return id.replace(/^.*node_modules\/(.*?)\//,'$1');
      //   // if (id.includes('node_modules/lodash-es/'))return id.replace(/^.*node_modules\//,p.replace(/^src\/(.*?)\/.*$/,'$1/'));
      //   if (id.includes('node_modules/'))return id.replace(/^.*node_modules\//,'');
      //   // if (id.includes('a-laughlin/src/')){
      //   //   const {dirName,fileName} = id.match(/^.*\/(?<dirName>.*?)\/(?<fileName>.*?)$/).groups;
      //   //   return `${dirName}/${fileName}`;
      //   // }
      //   return id;
      // }
    }]
  })),
  {
    input:['src/redux-graphql/example.js'],
    plugins:[transpilePlugin,resolvePlugin,commonjsPlugin,htmlPlugin],
    output: { dir: 'dist/es/redux-graphql/', format:'es'},
  },
  // { // example plugin
  //   input: '\0virtual-module',
  //   plugins: [getExamplePlugin()],
  //   output: [{
  //     file: 'dist/virtual-module.js',
  //     format: 'es'
  //   }]
  // }
];