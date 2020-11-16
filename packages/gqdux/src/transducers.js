import {diffBy, isArray, isFinite, isObjectLike, isString, mapToArray, not, tdFilter} from "@a-laughlin/fp-utils"

export const polymorphicArgTest = (args,meta)=>{
  // return obj=>conforms(obj);
  return function conforms(obj,k){
    // console.log(args,obj,k);
      // temporarily stringify everything to eliminate unexpected int/str differeences
    // k is necessary because we don't pass all selections to mapObject
    // a better solution is to map all properties and filter
    if (!isObjectLike(args)){
      if (!isObjectLike(obj))return `${args}`===`${obj}`;
      if (isArray(obj))return obj.includes(`${args}`);
      return `${args}`===`${obj[meta.idKey] ?? k}`;
    }
    if (isArray(args)){
      if (!isObjectLike(obj))return args.includes(`${obj}`);
      if (isArray(obj))return and(...args.map(a=>conforms(a,obj)));
      return args.includes(`${obj[meta.idKey] ?? k}`);
    }
    if (!isObjectLike(obj))return `${args[meta.idKey]}`===`${obj}`;
    if (isArray(obj))return obj.includes(`${args[meta.idKey]}`);
    for (const a in args) {
      if(a===meta.idKey){
        // console.log(a,args[a],obj[a],k);
        if(`${args[a]}`!==`${a in obj?obj[a]:k}`) return false;
      }
      else if(`${args[a]}`!==`${obj[a]}`)return false;
    }
    return true;
    //if (meta.idKey in args && args[meta.idKey] !== id) return false;
  };
}

export const intersection=(args,meta)=>nextReducer=>(a,v,k,vv)=>{
  // tdFilter(polymorphicArgTest(args,meta))
  // console.log('args',args,` a:`,a,` v:`,v,` k:`,k,` vv:`,vv,);
  if (polymorphicArgTest(args,meta)(v,k)) return nextReducer(a,v,k);
  return a;
};
export const subtract=(args={},meta)=>nextReducer=>(a,v,k,vv)=>{
  // it isn't recursing into object properties since there are no selections...
  // or... no... it doesn't need to recurse when no selections.
  //  It'll just mapVNorm on the Person collection.
  // or...? hmm.  revisit.
  // 
  // 
  // There are no selections, so use vv since v is blank.
  // console.log('args',args,` a:`,a,` v:`,v,` k:`,k,` vv:`,vv,)
  if (polymorphicArgTest(args,meta)(v,k)) return a;
  return nextReducer(a,v,k);
  // console.log('subtract',args,arr);
  // console.log(` args:`,args,` v:`,v,` arr:`,arr,` kk:`,kk,` vv:`,vv,)
  // return nextReducer(...arr);
  // tdFilter(not(polymorphicArgTest(args,meta)))
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
