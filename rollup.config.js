// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // only for xstream and react
// import terser from '@rollup/plugin-terser';
// import terser from '@rollup/plugin-sourcemaps';

import {readdirSync} from 'fs';
import {join} from 'path';
// import terser from '@rollup/plugin-terser';

const modules = readdirSync('./src').map(p=>join('src',p,`${p}.js`));
const cjsTest = modulePath=>/observable|react/.test(modulePath);
const [cjsModules,esModules] = [modules.filter(cjsTest),modules.filter(p=>!cjsTest(p))];

const resolvePlugin = resolve({customResolveOptions: {moduleDirectory: 'node_modules'}});

export default [
  {
    input:esModules,
    plugins:[resolvePlugin],
    output: { dir: 'dist', format:'es', manualChunks:(id)=> {
      if (id.includes('redux-graphql'))return 'redux-graphql';
      if (id.includes('node_modules/'))return id.replace(/^.*node_modules\//,'');
      if (id.includes('src/'))return id.replace(/^.*src\//,'');
      return id;
    }},
  },
  { // observable utils requires commonjs helpers because xstream does
    input:cjsModules,
    plugins:[ commonjs(), resolvePlugin ],
    output: { dir: 'dist', format:'es', manualChunks:(id)=>{
      if (id.includes('observable-utils')) return 'observable-utils';
      if (id.includes('react-utils')) return 'react-utils';
      if (id.includes('prop-types')) return 'react-utils/prop-types';
      if (id.includes('object-assign')) return 'react-utils/object-assign';
      if (id.includes('react/')) return 'react-utils/react';
      if (/xstream|observable/.test(id))return 'xstream/xstream';
      // if (id.includes('lodash-es')) return id.replace(/^.*lodash-es\//,'lodash-es/');
      if (id.includes('node_modules'))return id.replace(/^.*node_modules\//,'');
      return id;
    }},
  }
];