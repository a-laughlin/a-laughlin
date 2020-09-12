import {not,isObjectLike,cond,and,toPredicate, pick,ensureArray, transArrayToObject,transObjectToArray, or, stubTrue, plog, transToObject, diffBy, appendObjectReducer, tdFilter, tdFilterWithAcc, mapToObject} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import { compose } from '../../fp-utils/src/fp-utils';
// returns a function that populates query arguments with passed variables
const getArgsPopulator = vars=>{
  const getArgs = transArrayToObject((result,{name:{value:name},value})=>{
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
  variableDefinitions.length === 0 ? passedVariables : transArrayToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);


// predicates for schemaToQuerySelector
const isScalarSelection=([meta])=>meta.defKind==='scalar';
const isObjectSelection=([meta])=>meta.defKind==='object';
const isListSelection=([meta])=>meta.isList;
const isCollectionItemSelection=([meta])=>'fieldName' in meta;
const isCollectionSelection=([meta])=>!('fieldName' in meta);
const isPrimitiveValue=([meta,Field,vDenormPrev,vNorm])=>!isObjectLike( meta.isList?vNorm[0]:vNorm );
const isObjectValue=([meta,Field,vDenormPrev,vNorm])=>isObjectLike( meta.isList?vNorm[0]:vNorm );

// for filtering, a dsl is complicated
// https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// Mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter for MVP, via transducers
export const withVnorm=fn=>(acc,arr,id)=>fn(arr[3],id);

const getSelectionsMapper = (itemMapper,resultMapper)=>([meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs])=>{
  let propsChanged = false,vDenorm={},k;
  for(const f of Field.selectionSet.selections){
    k = f.name.value;
    vDenorm[k]=itemMapper([meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs],k);
    if(vDenorm[k] !== vDenormPrev[k]) propsChanged = true;
  };
  return resultMapper(vDenorm,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,propsChanged]);
};

const getCollectionMapper=(collectionReducers,resultMapper)=>([meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs])=>{
  // on the first traverse up, break if the final collection is unchanged since its items will be too.
  if(meta.objectFields.length===0&&vNorm===vNormPrev) return resultMapper(vDenorm,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,false]);
  const a=Field.arguments;
  const args = getArgs(a);
  const reducer=(a.reduce((f,{name:{value:v}})=>f||(collectionReducers[v]?.(args[v])),null))||collectionReducers.filter(args);
  let vDenorm={},changed=false;
  for(const id in vNorm){
    vDenorm=reducer(vDenorm,[meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],rootNorm,rootNormPrev,getArgs],id);
    if(vDenorm[id]!==vDenormPrev[id])changed=true;
  }
  return resultMapper(vDenorm,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed]);
}
const allItemsCombiner=(vDenorm,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,propsChanged])=>
  vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;

const filter=mapSelection=>x=>{const p=withVnorm(toPredicate(x));return(...args)=>p(...args)?mapSelection(...args):args[0]};
const omit=mapSelection=>x=>{const p=withVnorm(toPredicate(x));return(...args)=>!p(...args)?mapSelection(...args):args[0]};

export const schemaToQuerySelector=( schema, transducers={})=>{
  const mapSelections = getSelectionsMapper(cond(
    // error, key does not exist
    [isScalarSelection,cond(
      [isObjectValue,()=>{throw new Error('cannot request object without selecting fields')}],
      [isPrimitiveValue,([meta,Field,vDenormPrev,vNorm])=>vNorm],
    )],
    [isObjectSelection,cond(
      [isCollectionItemSelection, cond(
        // taking the collection item id(s), these looking up the related object and continue executing on it
        [isListSelection,([m,f,vDP={},id=[],idP,rN,rNP,g])=>transArrayToObject((o,i)=>o[i]=mapSelections([m, f, vDP, rN[m.defName][i], rNP[m.defName]?.[i], rN, rNP, g]))(id)],
        [stubTrue,([m,f,vDP={},id='',idP,rN, rNP, g])=>mapSelections([m, f, vDP, rN[m.defName][id], rNP[m.defName]?.[id], rN, rNP, g])],
      )],
      [isPrimitiveValue,()=>{throw new Error('cannot select field of primitive value')}],
      [isCollectionSelection, getCollectionMapper(
        Object.entries({filter,omit,...transducers}).reduce((o,[k,t])=>{o[k]=t((a,v,id)=>{a[id]=mapSelections(v);return a;});return o},{}),
        allItemsCombiner
        // x=>x,
      )],
    )]
  ),allItemsCombiner);

  const {selectionMeta}=indexSchema(schema);
  return function mapQuery (query, passedVariables={}){
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions,passedVariables));
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
      return mapSelections([selectionMeta._query,query.definitions[0],rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev,argsPopulator]);
    };
  };
};
