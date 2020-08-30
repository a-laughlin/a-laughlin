import indexSchema from './indexSchema'
import {transToObject,isString,hasKey,isObjectLike,isInteger,cond,identity,isArray,stubTrue,diffBy, mapToObject, transArrayToObject,} from '@a-laughlin/fp-utils';

const defaultActions = {
  ADD:nextReducer=>(prevState,action)=>{
    // if collection/item/value
    // which has a simpler dependency graph topology?  These fns, handling different types, or or a mutation tree?
    // note: If mutation tree, these could be property functions, like "filter" and "omit" on query
    return nextReducer(({...prevState,...action.payload}),action)
  },
  SUBTRACT:nextReducer=>(prevState,action)=>{
    const diff = diffBy((v,k)=>k,[prevState,action.payload]);
    let nextState={},k;
    if (diff.aibc===0) return nextReducer(prevState,action); // no intersection to remove
    if (diff.aibc===diff.aubc) return nextReducer(nextState,action); // complete intersection. remove everything
    for (k in diff.anb)nextState[k]=prevState[k]; // copy non-intersecting collection items to new state
    return nextReducer(nextState,action);
  },
  UNION:nextReducer=>(prevState,action)=>{
    const diff = diffBy((v,k)=>k,[prevState,action.payload]);
    let nextState={},k;
    for (k in diff.aub)nextState[k]=action.payload[k]??prevState[k];
    return nextReducer(diff.changedc===0?prevState:nextState,action);
  },
  INTERSECTION:nextReducer=>(prevState,action)=>{
    const diff = diffBy((v,k)=>k,[prevState,action.payload]);
    let nextState={},k;
    for (k in diff.aib)nextState[k]=action.payload[k];
    return nextReducer(diff.changedc===0?prevState:nextState,action);
  },
  SET:nextReducer=>(prevState,action)=>nextReducer(action.payload,action),
  GET:nextReducer=>(prevState,action)=>nextReducer(prevState,action)
};

export const schemaToReducerMap = (schema) => (ops=defaultActions)=>{
  const {selectionMeta}=indexSchema(schema);
  const actionNormalizers = mapToObject(({defKind,_idKey})=>cond(
    [_=>defKind!=='object',identity],                             // leave scalars and other non-object types
    [isString,payload=>({[payload]:{[_idKey]:payload}})],         // convert number/string id to collection
    [isInteger,payload=>({[payload]:{[_idKey]:`${payload}`}})],   // convert number/string id to collection
    [isObjectLike,cond(
      [isArray,transArrayToObject((o,v)=>{                        // convert array to collection
        v=normalizePayload(v);
        o[v[_idKey]]=v;
      })],
      [hasKey(_idKey), payload=>({[payload[_idKey]]:payload})],   // convert single item to collection
      [stubTrue,identity]                                         // collection, leave as is
    )],
    [stubTrue,payload=>new Error(`unrecognized payload type\n${JSON.stringify(payload,null,2)}`)]
  ))(selectionMeta);
  
  return transToObject((acc,actionNormalizer,dName)=>{
    const opFns=transToObject((o,opFn,OP)=>o[`${dName.toUpperCase()}_${OP}`]=opFn(identity))(ops)
    acc[dName]=(prevState=null,action={})=>action.type in opFns
      ? opFns[action.type](prevState,{...action,payload:actionNormalizer(action.payload)})
      : prevState;
  })(actionNormalizers);
};