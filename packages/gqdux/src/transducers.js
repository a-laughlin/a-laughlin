import {and, diffBy, isArray,isFinite, isObjectLike, isString, mapToArray, not, tdFilter, tdOmit} from "@a-laughlin/fp-utils"
import { isObject } from 'lodash-es';

const idnty=x=>x;
export const identity=()=>idnty;

export const intersection=(meta,args)=>tdFilter(polymorphicListItemTest(meta,args));

export const subtract=(meta,args)=>tdOmit(polymorphicListItemTest(meta,args));

export const union=(args={},meta)=>nextReducer=>nextReducer;

export const complement=(args={},meta)=>nextReducer=>nextReducer;


export const polymorphicListItemTest = (meta,args)=>{
  if(meta.nodeType==='objectScalarList'){
    if(!isObjectLike(args)) return (v,k)=>v===args;
    if(isArray(args)) return (new Set(args)).has;
    throw new Error(`can't compare scalar list values with object argument ${JSON.stringify(args)}`);
  } else if (meta.nodeType==='objectObjectList'){
    if(!isObjectLike(args)) return (obj,k)=>k===args;
    if (isArray(args)) {
      const has=(new Set(args)).has;
      return (v,k)=>has(k);
    }
    return (obj,k,origObj)=>{
      for (const arg in args) if (origObj[arg]!==args[arg]) return false;
      return true;
    }
  } else if (meta.nodeType==='objectIdList') { // never hit..., though working without it.  TBD why.
    if(!isObjectLike(args)) return (obj,k)=>console.log(` obj:`,obj,)||k===args;
    if(isArray(args)) if (isArray(args)) {
      const has=(new Set(args)).has;
      return (obj,k,origId)=>console.log(` args:`,args,` obj:`,obj,` origId:`,origId,)||has(origVal);
    }
    if(isObjectLike(args)) {
      return (obj,k,origId)=>{
        console.log(` args:`,args,` obj:`,obj,` origId:`,origId,)
        for (const arg in args) if (obj[arg]!==args[arg]) return false;
        return true;
      }
    }
  }
  throw new Error(`shouldn't be hit since there are only 3 collection types (and objectIdList is skipped)`);
}

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
