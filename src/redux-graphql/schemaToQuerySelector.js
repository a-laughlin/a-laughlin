import {not,isObjectLike,cond,and,toPredicate, pick,ensureArray, transArrayToObject,transObjectToArray, or, stubTrue} from '@a-laughlin/fp-utils';
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
const isListField=([meta])=>meta.isList;
const isPrimitiveValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>!isObjectLike(vNorm);
const isObjectValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm);
const isItemValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm)&&meta.idKey in vNorm;
const isCollectionValue=([meta,Field,vDenorm,vDenormPrev,vNorm])=>isObjectLike(vNorm) && !(meta.idKey in vNorm);


// for filtering, a dsl is complicated
// https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// Mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter for MVP
export const schemaToQuerySelector=( schema, queryMatchers={ filter:toPredicate, omit:x=>not(toPredicate(x))} )=>{
  
  // Denormalizes a single collection item
  // Somewhat redundant with mapSelection, though loops over individual fields. Could use the same error checking though. Might be able to merge them.
  const mapItem=([meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs])=>{
    let changed = vNorm !== vNormPrev,vDenorm={};
    const {selectionSet:{selections=[]}={}}=Field;
    for (const f of selections){
      const k = f.name.value;
      // console.log(...Object.entries(meta[k]));
      // if(meta[k].fieldName===undefined)console.log('fieldName undefined',meta[k].defName,k);
      // if(meta[k].defName===undefined)console.log('defName undefined',meta[k].fieldName,k);
      if (meta[k].defKind==='scalar') (vDenorm[k] = mapSelection([meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs]));
      else if (meta[k].isList) (vDenorm[k] = mapSelection([ meta[k], f, vDenormPrev[k], pick(vNorm[k])(rootNorm[meta[k].defName]), pick(vNormPrev[k])(rootNormPrev[meta[k].defName]), rootNorm,rootNormPrev, getArgs]));
      else (vDenorm[k]=mapSelection([ meta[k], f, vDenormPrev[k], rootNorm[meta[k].defName][vNorm[k]], rootNormPrev[meta[k].defName][vNorm[k]], rootNorm,rootNormPrev,getArgs ]));
      if(vDenorm[k] !== vDenormPrev[k]) changed = true;
    }
    return changed ? vDenorm : vDenormPrev;
  };

  const mapCollection=([meta,Field,vDenormPrev={},vNorm,vNormPrev={},rootNorm,rootNormPrev,getArgs])=>{
    // on the first traverse up, break if the final collection is unchanged since its items will be too.
    if(meta.objectFields.length===0&&vNorm===vNormPrev) return vDenormPrev;
    const args = getArgs(Field.arguments);
    const argIds = ensureArray(args[meta.idKey]);
    if(argIds.length) vNorm=transArrayToObject((o,i)=>o[i]=vNorm[i])(argIds);
    const queryMatcherFns=transObjectToArray((a,arg,k)=>k in queryMatchers && (a[a.length]=queryMatchers[k](arg)))(args);
    const matchesFn = queryMatcherFns.length === 0 ? queryMatchers.filter(args) : and(...queryMatcherFns);
    let vDenorm={},changed=vNorm!==vNormPrev;
    for(const id in vNorm){
      matchesFn(vNorm[id])&&(vDenorm[id]=mapItem([meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],rootNorm,rootNormPrev,getArgs]));
      if(vDenorm[id]!==vDenormPrev[id])changed=true;
    }
    return changed?vDenorm:vDenormPrev;
  }

  const mapSelection=cond(
    [isScalarField,cond(
      [isListField,([meta,Field,vDenormPrev,vNorm])=>vNorm],
      [isPrimitiveValue,([meta,Field,vDenormPrev,vNorm])=>vNorm],
      [isObjectValue,()=>new Error('cannot request object without selecting fields')],
    )],
    [isObjectField,cond(
      [isPrimitiveValue,([{defName},Field,vDenormPrev,vNorm])=>new Error(`cannot request fields of a primitive ${JSON.stringify({value:vNorm,defName},null,2)}`)],
      [isCollectionValue,mapCollection],
      [isItemValue,mapItem],// item (worth noting that root state is also an item with no key, given its heterogenous values);
    )],
  );

  const {selectionMeta}=indexSchema(schema);
  const mapQuery= (query,passedVariables={})=>{
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
    const selections=query.definitions[0].selectionSet.selections;
    return (rootNorm={},rootNormPrev=rootNorm,rootDenormPrev={})=>{
      // return mapItem([selectionMeta._query,query.definitions[0],rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev,argsPopulator])._query;
      let denormRoot={},changed=rootNorm!==rootNormPrev;
      for (const s of selections){
        const k=s.name.value;
        denormRoot[k]=mapSelection([selectionMeta[k],s,rootDenormPrev[k],rootNorm[k],rootNormPrev[k],rootNorm,rootNormPrev,argsPopulator])
        if(denormRoot[k]!==rootDenormPrev[k])changed=true;
      }
      return changed?denormRoot:rootDenormPrev;
    };
  };
  return mapQuery;
};