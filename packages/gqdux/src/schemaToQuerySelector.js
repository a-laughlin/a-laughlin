import {transToObject,identity,indexBy, setNonEnumProp, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
const tdReduceEachWithChanged=(childTransducer,childCombiner,preTrans=identity,childKeys=(p,[,pN],k)=>Object.keys(pN))=>nextReducer=>preTrans((parent,arr,k)=>{
  const reduceChild=childTransducer(childCombiner);
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
  const mappers={};
  mappers.object            = reduce( // tdMap iters to selections
    nextReducer=>(p={},[pP={},pN={},pNP={},rN,rNP,pqi],k)=>{
      return nextReducer(p,mappers[pqi[k].meta.nodeType](p[k],[pP[k],pN[k],pNP[k],rN,rNP,pqi[k]],k),k);
    },
    objectListCombiner,
    identity,
    (p,[,,,,,pqi])=>Object.keys(pqi)
  )(chooseParent);
  mappers.objectObjectList  = reduce(mappers.object,objectListCombiner)(chooseParent);
  mappers.objectId          = nextReducer=>(p={},[pP,pN,,rN,rNP,pqi],k)=>
    nextReducer(p,mappers.object(p,[pP,rN[pqi[k].meta.defName][pN[k]],rNP[pqi[k].meta.defName][pN[k]],rN,rNP,pqi[k]],k),k);
  mappers.objectIdList      = reduce(mappers.objectId,arrayListCombiner)(chooseParent);
  mappers.objectScalar      = (p={},[,pN={},,,,pqi],k)=>objectListCombiner(p,pN[pqi.meta.fieldName],pqi.meta.fieldName);
  mappers.objectScalarList  = reduce(nextReducer=>(p={},[,pN={}],k)=>nextReducer(p,pN[k],k),arrayListCombiner)(chooseParent);
  return mappers.object;
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
  const meta=indexSchema(schema).selectionMeta._query;
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=((result={},s,meta)=>{
    setImmutableNonEnumProp(result,'meta',meta);
    setImmutableNonEnumProp(result.meta,'nodeType',getNodeType(meta));
    setImmutableNonEnumProp(result,'args',indexBy((v,k)=>k in transducers?k:'implicit')(getArgs(s.arguments)));
    for (const ss of s.selectionSet?.selections||[]) result[ss.name.value]=inner(result[ss.name.value],ss,meta[ss.name.value]);
    return result;
  });
  return transToObject((o,s)=>inner(o,s,meta[s.name.value]))(query.definitions[0].selectionSet.selections);
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