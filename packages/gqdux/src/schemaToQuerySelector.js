import {not,isObjectLike,cond,and,toPredicate, pick,ensureArray, transArrayToObject,transObjectToArray, or, stubTrue, plog, transToObject, diffBy, appendObjectReducer, tdFilter, tdFilterWithAcc, mapToObject} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
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
const isScalarField=([meta])=>meta.defKind==='scalar';
const isObjectField=([meta])=>meta.defKind==='object';
// const isListField=([meta])=>meta.isList;
const isCollectionItemField=([meta])=>'fieldName' in meta;
const isCollectionField=([meta])=>!('fieldName' in meta);
const isPrimitiveValue=([meta,Field,vDenormPrev,vNorm])=>!isObjectLike( meta.isList?vNorm[0]:vNorm );
const isObjectValue=([meta,Field,vDenormPrev,vNorm])=>isObjectLike( meta.isList?vNorm[0]:vNorm );

// for filtering, a dsl is complicated
// https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// Mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter for MVP, via transducers
export const withVnorm=fn=>(acc,arr,id)=>fn(arr[3],id);
export const schemaToQuerySelector=( schema, transducers={} )=>{
  transducers=Object.assign({
    filter:nextFn=>x=>{const p=withVnorm(toPredicate(x));return(...args)=>p(...args)?nextFn(...args):args[0]},
    omit:nextFn=>x=>{const p=withVnorm(toPredicate(x));return(...args)=>!p(...args)?nextFn(...args):args[0]},
  },transducers);
  
  const mapSelection=cond(
    [isScalarField,cond(
      [isObjectValue,()=>{throw new Error('cannot request object without selecting fields')}],
      [isPrimitiveValue,([meta,Field,vDenormPrev,vNorm])=>vNorm],
    )],
    [isObjectField,cond(
      [isCollectionItemField, withDenormalizedItemIds(mapSelections)],
      [isPrimitiveValue,()=>{throw new Error('cannot select field of primitive value')}],
      [isCollectionField,mapCollection],
    )]
  );
  
  function mapSelections([meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs]){
    let changed = vNorm !== vNormPrev,vDenorm={};
    Field.selectionSet.selections.forEach(f=>{
      const k = f.name.value;
      vDenorm[k]=mapSelection([meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs]);
      if(vDenorm[k] !== vDenormPrev[k]) changed = true;
    });
    return changed ? vDenorm : vDenormPrev;
  };

  function withDenormalizedItemIds(fn){
    return ([m,f,vDP={},id='',idPrev='',rN,rNP,g])=>(
      m.isList
        ? transArrayToObject((o,i)=>o[i]=fn([m, f, vDP, rN[m.defName][i], rNP[m.defName]?.[i], rN,rNP, g]))(id)
        : fn([m, f, vDP, rN[m.defName][id], rNP[m.defName]?.[id], rN , rNP, g]));
  }

  const collectionCombiner = (a,v,id)=>{a[id]=mapSelections(v);return a;};
  const collectionReducers = Object.entries(transducers).reduce((o,[k,t])=>{o[k]=t(collectionCombiner);return o},{});
  function mapCollection([meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs]){
    // on the first traverse up, break if the final collection is unchanged since its items will be too.
    if(meta.objectFields.length===0&&vNorm===vNormPrev) return vDenormPrev;
    const a=Field.arguments;
    const args = getArgs(a);
    const reducer=(a.reduce((f,{name:{value:v}})=>f||(collectionReducers[v]?.(args[v])),null))||collectionReducers.filter(args);
    let vDenorm={},changed=vNorm!==vNormPrev;
    for(const id in vNorm){
      vDenorm=reducer(vDenorm,[meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],rootNorm,rootNormPrev,getArgs],id);
      if(vDenorm[id]!==vDenormPrev[id])changed=true;
    }
    return changed?vDenorm:vDenormPrev;
  }

  const {selectionMeta}=indexSchema(schema);
  return function mapQuery (query, passedVariables={}){
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
      return mapSelections([selectionMeta._query,query.definitions[0],rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev,argsPopulator]);
    };
  };
};
