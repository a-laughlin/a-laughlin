// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; // only for xstream for some reason

import {readdirSync} from 'fs';
import {join} from 'path';
// import terser from '@rollup/plugin-terser';

const modules = readdirSync('./src').map(p=>join('src',p,`${p}.js`));
const cjsModules = modules.filter(p=>/observable|react/.test(p))
const esModules = modules.filter(p=>!/observable|react/.test(p))
// console.log(`modules`,modules)
export default [
  {
    input:esModules,
    external:'lodash-es',
    plugins:[ resolve()],
    output: {
      dir: 'dist',
      format:'es',
      manualChunks:(id)=> {
        if (id.includes('redux-graphql'))return 'redux-graphql';
        if (id.includes('node_modules'))return id.replace(/^.*node_modules\//,'');
        if (id.includes('src/'))return id.replace(/^.*src\//,'');
        return id;
      }
    },
  },
  { // observable utils requires commonjs helpers because xstream does
    input:cjsModules,
    external:'lodash-es',
    plugins:[ commonjs(),resolve() ],
    output: {
      dir: 'dist',
      format:'es',
      manualChunks:(id)=>{
        if (id.includes('observable-utils')) return 'observable-utils';
        if (id.includes('react-utils')) return 'react-utils';
        if (id.includes('prop-types')) return 'react-utils/prop-types';
        if (id.includes('object-assign')) return 'react-utils/object-assign';
        if (id.includes('react/')) return 'react-utils/react';
        if (/xstream|observable/.test(id))return 'xstream/xstream';
        // if (id.includes('lodash-es')) return id.replace(/^.*lodash-es\//,'lodash-es/');
        if (id.includes('node_modules'))return id.replace(/^.*node_modules\//,'');
        return id;
      }
    },
  }
];