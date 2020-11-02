import {diffBy, isObjectLike, not, tdFilter} from "@a-laughlin/fp-utils"

const polymorphicArgTest = (args,meta)=>function conforms(obj,id){
  if (meta.idKey in args && args[meta.idKey] !== id) return false;
  let arg;
  for (arg in args){
    if (isObjectLike(obj[arg]) && (obj[arg][meta[arg].idKey]!==args[arg]))return false;
    // if (isString(args[arg]) && args[arg]!==obj[arg]) return false;
    // if (isFinite(args[arg]) && args[arg]!==+obj[arg]) return false;
    // if (isFunction(args[arg]) && !args[arg](obj[arg])) return false;
    // if (isArray(args[arg]) && !and(...mapToArray(a=>conforms(obj,a))(args[arg]) ) ) return false;
    // if (isObjectLike(args[arg]) && !and(...mapToArray((v,k)=>conforms(obj[k],v))(args[arg]) )) return false;
    // if (args[arg]!==obj[arg]) return false;
  }
  return true;
};

export const intersection=(args={},meta)=>tdFilter(polymorphicArgTest(args,meta));
export const subtract=(args,meta)=>not(intersection(args,meta));

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
