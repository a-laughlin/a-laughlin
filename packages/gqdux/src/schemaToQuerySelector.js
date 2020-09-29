import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
const tdReduceEachWithChanged=(reduceChild,preTrans=identity,childKeys=(p,[,pN={}],k)=>Object.keys(pN))=>nextReducer=>preTrans((parent,arr,k)=>{
  let kk,nextParent,changed=false;
  for (kk of childKeys(parent,arr,k)){
    nextParent=reduceChild(nextParent,arr,kk);
    if (nextParent[kk]!==parent[kk]) changed=true;
  }
  return nextReducer(nextParent,arr,k,changed);
});

const getTraversalMapper = (
  chooseParent=(p,[pP,pN,pNP],k,changed)=>changed||pN!==pNP?p:pP,
  objectListCombiner=appendObjectReducer,
  arrayListCombiner=appendArrayReducer
)=>{
  // 5 descend and iterate cases, 1 leaf (scalar value)
  // take the parent arr, and use v/k to map the parentArray's sections for the next level
  const reduce=tdReduceEachWithChanged;
  const reducers={};
  reducers.object            = reduce(
    (p={},[pP={},pN={},pNP={},rN,rNP,pqi],k)=>{
      return objectListCombiner(p,
        reducers[pqi[k].meta.nodeType](p[k]??{},[pP?.[k],pN[k],pNP?.[k],rN,rNP,pqi[k]],pN[pqi[k].meta.fieldName]),
      k);
    },
    identity,
    (p,[,,,,,pqi])=>Object.keys(pqi)
  )(chooseParent);
  reducers.objectObjectList  = reduce((p={},[pP,pN={},pNP={},rN,rNP,pqi],k)=>objectListCombiner(p,reducers.object({},[pP?.[k],pN?.[k],pNP?.[k],rN,rNP,pqi],k),k))(chooseParent);
  reducers.objectId          = (p,[pP,pN,,rN,rNP,pqi],k)=>reducers.object({},[pP?.[k],rN[pqi[k].meta.defName][pN],rNP?.[pqi[k].meta.defName]?.[pN],rN,rNP,pqi[k]]);
  reducers.objectIdList      = reduce((p=[],[pP,pN,,rN,rNP,pqi],k)=>arrayListCombiner(p,
    reducers.object({},[pP?.[k],rN[pqi.meta.defName][pN[k]],rNP[pqi.meta.defName]?.[pN[k]],rN,rNP,pqi[k]],""),k)
  )(chooseParent);
  reducers.objectScalar      = (p,[,pN={}],k)=>pN;
  return reducers.object;
}

// returns a function that populates query arguments with passed variables
const getArgsPopulator = vars=>{
  const getArgs = transToObject((result,arg)=>{
    const {name:{value:name},value}=arg;
    if(value.kind==='Variable') result[name] = vars[value.name.value];
    else if (value.kind==='ObjectValue') result[name] = getArgs(value.fields);
    else result[name] = value.value;
  });
  return getArgs;
}

const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);

const getNodeType = ({isList,defKind,defName,fieldName,fieldKindName})=>{
  if (defKind==='scalar') return  (isList ? 'objectScalarList' : 'objectScalar');
  if (isList) return (defName===fieldName ? 'objectObjectList' : 'objectIdList') ;
  return (fieldKindName==='ID' ? 'objectId' : 'object');
}
const indexQuery=(schema={},query={},passedVariables={},transducers={})=>{
  let meta=indexSchema(schema).selectionMeta;
  // meta=meta._query;
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(parentNode={},s,meta)=>{
    for (const ss of s.selectionSet.selections){
      const node = parentNode[ss.name.value]={};
      setImmutableNonEnumProp(node,'meta',meta[ss.name.value]);
      setImmutableNonEnumProp(node.meta,'nodeType',getNodeType(node.meta));
      setImmutableNonEnumProp(node,'args',indexBy((v,k)=>k in transducers?k:'implicit')(getArgs(ss.arguments)));
      if (ss.selectionSet) inner(node,ss,node.meta);
    }
    return parentNode;
  }
  const result=inner({},query.definitions[0],meta._query);
  return result;
};
// [pP={},pN={},pNP={},rN,rNP,pqi]
export const schemaToQuerySelector=(schema,transducers={})=>(query,passedVariables)=>{
  const queryIndex=indexQuery(schema,query,passedVariables,transducers);
  const mapObject=getTraversalMapper();
  return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
    return mapObject({},[rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev,queryIndex]);
  };
}
export const schemaToMutationReducer=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};