import indexSchema from './indexSchema'
import {transToObject,isString,hasKey,isObjectLike,isInteger,cond,identity,isArray,stubTrue,diffBy, mapToObject, transArrayToObject,} from '@a-laughlin/fp-utils';
import { indexBy } from '../../fp-utils/src/fp-utils';

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

// schema aware normalizers, primarily for passing id as string/number;
const schemaToActionNormalizersByDefName = schema=>mapToObject(({defKind,idKey})=>{
  const normalizePayload = cond(
    [()=>defKind!=='object',identity],                             // leave scalars and other non-object types
    [isString,payload=>({[payload]:{[idKey]:payload}})],          // convert number/string id to collection
    [isInteger,payload=>({[payload]:{[idKey]:`${payload}`}})],    // convert number/string id to collection
    [isObjectLike,cond(
      [isArray,transArrayToObject((o,v)=>{                        // convert array to collection
        v=normalizePayload(v);
        o[v[idKey]]=v;
      })],
      [hasKey(idKey), payload=>({[payload[idKey]]:payload})],     // convert single item to collection
      [stubTrue,identity],                                        // collection, leave as is
    )],
    [stubTrue,payload=>new Error(`unrecognized payload type\n${JSON.stringify(payload,null,2)}`)]
  );
  return normalizePayload;
})(indexSchema(schema).selectionMeta);

export const schemaToIndividualReducerMap = (schema,ops=defaultActions)=>{
  return transToObject((acc,actionNormalizer,dName)=>{
    for (const OP in ops){
      const fn=ops[OP](identity);
      acc[`${dName}_${OP}`]=(prevState=null,action={})=>fn(prevState,{...action,payload:actionNormalizer(action.payload)});
    }
  })(schemaToActionNormalizersByDefName(schema));
};

export const schemaToReducerMap = (schema,ops=defaultActions)=>{
  return mapToObject((actionNormalizer,dName)=>{
    const opFnsByDname=transToObject((o,opFn,OP)=>o[`${dName.toUpperCase()}_${OP}`]=opFn(identity))(ops);
    return (prevState=null,action={})=>action.type in opFnsByDname
      ? opFnsByDname[action.type](prevState,{...action,payload:actionNormalizer(action.payload)})
      : prevState;
  })(schemaToActionNormalizersByDefName(schema));
};