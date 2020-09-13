import {isObjectLike,cond,transToObject,stubTrue, mapToObject} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';
// returns a function that populates query arguments with passed variables
const getArgsPopulator = vars=>{
  const getArgs = transToObject((result,{name:{value:name},value})=>{
    if(value.kind==='Variable') result[name] = vars[value.name.value];
    else if (value.kind==='ObjectValue') result[name] = getArgs(value.fields);
    else result[name] = value.value;
  });
  return getArgs;
}

// converts query variable definitions array to an object, populating any relevant variables passsed
// default per spec is returning only what's in variableDefinitions
// this version provides the option to eliminate the duplicate definitions in each query to pass a variable
// given the def is often specified in the schema already.
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);


const getSelectionsMapper = (mapSelection,allItemsCombiner)=>(vDenorm={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs,args],id)=>{
  let propsChanged = false,k;
  for(const f of Field.selectionSet.selections){
    k = f.name.value;
    vDenorm[k]=mapSelection(vDenorm[k],[meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs],k);
    if(vDenorm[k] !== vDenormPrev[k]) propsChanged = true;
  }
  return allItemsCombiner(vDenorm,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,propsChanged]);
};

const getCollectionMapper=(collectionReducers,reduceResult)=>(acc={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs],k)=>{
  // on the first traverse up, break if the final collection is unchanged since its items will be too.
  // if(meta.objectFields.length===0&&vNorm===vNormPrev) return reduceResult(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,false],k);
  const a=Field.arguments;
  const args = getArgs(a);
  const reducer=(a.reduce((f,{name:{value:v}})=>f||(collectionReducers[v]?.(args[v])),null))||collectionReducers.filter(args);
  let changed=false;
  for(const id in vNorm){
    // acc[id]={};
    acc=reducer(acc,[meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],rootNorm,rootNormPrev,getArgs],id);
    if(acc[id]!==vDenormPrev[id])changed=true;
  }
  return reduceResult(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed],k);
}

const getMapSelections = (allItemsCombiner,transducers={})=>{
  // predicates
  const isScalarSelection=(acc,[meta])=>meta.defKind==='scalar';
  const isObjectSelection=(acc,[meta])=>meta.defKind==='object';
  const isListSelection=(acc,[meta])=>meta.isList;
  const isCollectionItemSelection=(acc,[meta])=>'fieldName' in meta;
  const isCollectionSelection=(acc,[meta])=>!('fieldName' in meta);
  const isPrimitiveValue=(acc,[meta, , ,vNorm])=>!isObjectLike( meta.isList?vNorm[0]:vNorm );
  const isObjectValue=(acc,[meta, , ,vNorm])=>isObjectLike( meta.isList?vNorm[0]:vNorm );
  const mapSelections = getSelectionsMapper(cond(
    // error, key does not exist
    [isScalarSelection,cond(
      [isObjectValue,()=>{throw new Error('cannot request object without selecting fields')}],
      [isPrimitiveValue,(acc,[,,,vNorm])=>vNorm],
    )],
    [isObjectSelection,cond(
      [isCollectionItemSelection, cond(
        // these convert collection item id(s) to related object(s) and continue walking
        [isListSelection,(acc,[m,f,vDP={},id=[],,rN,rNP,g],k)=>{
          const result = transToObject((o,i)=>o[i]=mapSelections(o[i],[m, f, vDP, rN[m.defName][i], rNP[m.defName]?.[i], rN, rNP, g],i))(id);
          return result;
        }],
        [stubTrue,(acc,[m,f,vDP={},id='',,rN, rNP, g],k)=>{
          const result = mapSelections({},[m, f, vDP, rN[m.defName][id], rNP[m.defName]?.[id], rN, rNP, g],id);
          return result;
        }],
      )],
      [isPrimitiveValue,()=>{throw new Error('cannot select field of primitive value')}],
      [isCollectionSelection, getCollectionMapper(
        mapToObject(t=>t((a,v,id)=>{a[id]=mapSelections(a[id],v,id);return a;}))(transducers),
        allItemsCombiner
      )],
    )]
  ),allItemsCombiner);
  return mapSelections;
};
const getQuerySelector=(schema,mapSelections)=>{
  const {selectionMeta}=indexSchema(schema);
  return function mapQuery (query, passedVariables={}){
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions,passedVariables));
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
      return mapSelections({},[selectionMeta._query,query.definitions[0],rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev,argsPopulator]);
    };
  };
};

export const schemaToQuerySelector=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};

export const schemaToMutationReducer = (schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  const querySelector = getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
  return (prevState,action)=>{
    if (action.type!=='mutation')return prevState;
    return querySelector(...action.payload)(prevState); 
  }
};