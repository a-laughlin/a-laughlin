import {diffBy, tdFilter, toPredicate} from "@a-laughlin/fp-utils"

export const filter=combiner=>(p,[pP,pN,pNP,rN,rNP,pqi],k)=>toPredicate(pqi.args)(pN,k)?combiner(p,[pP,pN,pNP,rN,rNP,pqi],k):p;
// export const intersect=combiner=>(p,[pP,pN,pNP,rN,rNP,pqi],k)=>{
//   if (pqi.nodeType==='objectScalar'){}
//   if (pqi.nodeType==='objectScalarList'){}
//   if (pqi.nodeType==='objectId'){}
//   if (pqi.nodeType==='objectIdList'){}
//   if (pqi.nodeType==='objectObjectList'){}
//   if (pqi.nodeType==='object'){}
// };
// export const toPredicate = x=>([v,vP,vN,vNP,rN,rNP,pqi],k)=>{
//   if(isFunction(x)) return x(vN,k);
//   if(isArray(x)) return matchesProperty(x);
//   if(isObjectLike(x)) return matches(x);
//   if(isString(x)) return hasKey(x)
//   if(stubTrue(x)) return stubFalse;
// };
export const implicit=args=>tdFilter((v,[vP,vN],k)=>{
  // we'll need to sub variables and objects before hitting this
  if (!(k in args)) return true;
  return args[k]===vN[k];
});
export const omit=combiner=>(acc,arr,id,arg)=>!(toPredicate(arg)(arr[3],id))?combiner(acc,arr,id):acc;
export const identity=mapSelection=>mapSelection;
export const subtract=omit;
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
