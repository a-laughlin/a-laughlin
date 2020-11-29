import {diffBy, isArray,isFinite, isObjectLike, isString, mapToArray, not, tdFilter} from "@a-laughlin/fp-utils"
import { isObject } from 'lodash-es';

const idnty=x=>x;
export const identity=()=>idnty;

export const intersection=(meta,args)=>{
  return nextReducer=>(a,v,k,vNi)=>{
    // console.log(` intersection:`,`args:`,args,` a:`,a,` v:`,v,` k:`,k,` polymorphicArgTest:`,polymorphicArgTest(meta,args)(v,k,vNi));
    if (polymorphicArgTest(meta,args)(v,k,vNi)) return nextReducer(a,v,k,vNi);
    return a;
  };
}

export const subtract=(args={},meta)=>nextReducer=>(a,v,k)=>{
  // it isn't recursing into object properties since there are no selections...
  // need to go deeper on args, which means passing args in addition to meta
  if (polymorphicArgTest(meta,args)(v,k)) return a;
  return nextReducer(a,v,k);
}

export const union=(args={},meta)=>nextReducer=>nextReducer;

export const complement=(args={},meta)=>nextReducer=>nextReducer;


export const polymorphicArgTest = (meta,args)=>{
  if(meta.nodeType==='objectScalarList'){
    if(!isObjectLike(args)) return (v,k)=>v===args;
    throw new Error(`cannot pass object args on a scalar list`)
  } else if (meta.nodeType==='objectObjectList'){
    if(isObjectLike(args)) {
      return (obj,k,vNObj)=>{
        let arg;
        for (arg in args) if (vNObj[arg]!==args[arg]) return false;
        return true;
      }
    } else {
      return (obj,k)=>obj[meta.idKey]===v===args;
    }
  } else if (meta.nodeType==='objectIdList') { // never hit..., though working without it.  TBD why.
    if(isObjectLike(args)) {
      return (obj,k,vNi)=>{
        let arg;
        for (arg in args) if (obj[arg]!==args[arg]) return false;
        return true;
      }
    } else {
      return (obj,k)=>obj[meta.idKey]===v===args;
    }
  }
  throw new Error(`shouldn't be hit since there are only 3 collection types`);
}
//   return function conforms(obj,k){
//     // Collection                  g`Person(intersect:{id:"a"})`
//     // Prop                        g`Person(friends:{intersect:{id:"b"}})`
//     // Collection + Prop           g`Person(intersect:{id:"a"},friends:{intersect:{id:"b"}})`

//     // console.log(args,obj,k);
//       // temporarily stringify everything to eliminate unexpected int/str differeences
//     // k is necessary because we don't pass all selections to mapObject
//     // a better solution is to map all properties and filter
//     if (!isObjectLike(args)){
//       if (!isObjectLike(obj))return `${args}`===`${obj}`;
//       if (isArray(obj))return obj.includes(`${args}`);
//       return `${args}`===`${obj[meta.idKey] ?? k}`;
//     }
//     if (isArray(args)){
//       if (!isObjectLike(obj))return args.includes(`${obj}`);
//       if (isArray(obj))return and(...args.map(a=>conforms(a,obj)));
//       return args.includes(`${obj[meta.idKey] ?? k}`);
//     }
//     if (!isObjectLike(obj))return `${args[meta.idKey]}`===`${obj}`;
//     if (isArray(obj))return obj.includes(`${args[meta.idKey]}`);
//     for (const a in args) {
//       if(a===meta.idKey){
//         // console.log(a,args[a],obj[a],k);
//         if(`${args[a]}`!==`${a in obj?obj[a]:k}`) return false;
//       }
//       else if(`${args[a]}`!==`${obj[a]}`)return false;
//     }
//     return true;
//     //if (meta.idKey in args && args[meta.idKey] !== id) return false;
//   };
// }


export const ADD = nextReducer=>(prevState,action)=>{
  // if collection/item/value
  // which has a simpler dependency graph topology?  These fns, handling different types, or or a mutation tree?
  // note: If mutation tree, these could be property functions, like "filter" and "omit" on query
  return nextReducer(({...prevState,...action.payload}),action)
}
export const SUBTRACT = nextReducer=>(prevState,action)=>{
  const diff = diffBy((v,k)=>k,[prevState,action.payload]);
  let nextState={},k;
  if (diff.aibc===0) return nextReducer(prevState,action); // no intersection to remove
  if (diff.aibc===diff.aubc) return nextReducer(nextState,action); // complete intersection. remove everything
  for (k in diff.anb)nextState[k]=prevState[k]; // copy non-intersecting collection items to new state
  return nextReducer(nextState,action);
}
export const UNION = nextReducer=>(prevState,action)=>{
  const diff = diffBy((v,k)=>k,[prevState,action.payload]);
  let nextState={},k;
  for (k in diff.aub)nextState[k]=action.payload[k]??prevState[k];
  return nextReducer(diff.changedc===0?prevState:nextState,action);
}
export const INTERSECTION = nextReducer=>(prevState,action)=>{
  const diff = diffBy((v,k)=>k,[prevState,action.payload]);
  let nextState={},k;
  for (k in diff.aib)nextState[k]=action.payload[k];
  return nextReducer(diff.changedc===0?prevState:nextState,action);
}
export const SET = nextReducer=>(prevState,action)=>nextReducer(action.payload,action);
export const GET = nextReducer=>(prevState,action)=>nextReducer(prevState,action)
