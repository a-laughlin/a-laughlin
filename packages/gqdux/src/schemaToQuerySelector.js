import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter, tdMapWithAcc, tdMapKey, tdTap} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {intersection,subtract,intersection as tdImplicit} from './transducers';

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

// convert the gql AST definitions to an object for simpler access
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
// loop over lists of items,
const tdMapVnorm = childTransducer=>childCombiner=>arr=>{
  const [vP,vN,vNP]=arr;
  const childReducer=childTransducer(childCombiner);
  let kk,vv,v,changed=vN!==vNP||vP===undefined;
  // childReducer's combiner function should return the collection if undefined.
  for ([kk,vv] of Object.entries(vN)) v = childReducer(v,arr,kk,vv);
  // in the empty collection case, the childReducer's combiner doesn't run, so run it and make a blank copy.
  if (v===undefined) (v = childCombiner()) && (delete v.undefined);
  return changed ? v : vP;
}

const childMappersToMapObject = childSelectors=>arr=>{
  let [vP,vN={},vNP={},rN,rNP]=arr;
  let v={},ck,changed=vN!==vNP||vP===undefined;
  vP ??= {}; /* eslint-disable-line */ // eslint doesn't support this syntax yet
  if(changed) for (ck in childSelectors) v[ck]=childSelectors[ck]([vP[ck],vN[ck],vNP[ck],rN,rNP]);
  // v check is necessary since an adjacent collection may have changed
  else for (ck in childSelectors) ((v[ck]=childSelectors[ck]([vP[ck],vN[ck],vNP[ck],rN,rNP])) !== vP[ck]) && (changed=true);
  return changed?v:vP;
};

const mapQueryFactory=(schema={},transducers={},listCombiner)=>(query={},passedVariables={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(s,meta)=>{
    // Walk the query tree beforehand closures the correct meta level for each childSelectors
    const childSelectors = transToObject((o,ss)=>o[ss.name.value]=inner(ss,meta[ss.name.value]))((s.selectionSet?.selections)??[]);
    const nodeType = meta.nodeType;
    const {explicit,implicit}=indexBy((v,k)=>k in transducers?'explicit':'implicit',(v,k)=>k)(getArgs(s.arguments));
    const implicitArgsTransducer=implicit?tdImplicit(implicit,meta):identity;
    const explicitArgsTransducer=explicit?compose(...Object.keys(explicit).map(k=>transducers[k](explicit[k],meta))):identity;
    const mapObject=childMappersToMapObject(childSelectors);
    const mapObjectId=([vP,vN,,rN,rNP])=>mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP]);
    
    if (nodeType==='objectScalar')            return ([,vN])=>vN;
    if (nodeType==='object')                  return mapObject;
    if (nodeType==='objectId')                return mapObjectId;
    if (nodeType==='objectScalarList')        return ([,vN])=>vN;
    if (nodeType==='objectObjectList')        return tdMapVnorm(compose(
      tdMap(([vP,vN,vNP,rN,rNP],id)=>mapObject([vP?.[id],vN?.[id],vNP?.[id],rN,rNP])),
      implicitArgsTransducer,
      explicitArgsTransducer,
    ))(listCombiner);
    if (nodeType==='objectIdList')            return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i)=>nextReducer(a,mapObjectId([vP?.[i],vN?.[i],vNP?.[i],rN,rNP]),vN[i]),
      implicitArgsTransducer,
      explicitArgsTransducer,
    ))(listCombiner);
    throw new Error(`${nodeType} shouldn't be hit`);
  }
  return inner(query.definitions[0],indexSchema(schema).selectionMeta._query);
};

export const schemaToQuerySelector=(schema,transducers={},listCombiner=appendObjectReducer)=>{
  const mapQuery=mapQueryFactory( schema, {...transducers,intersection,subtract},listCombiner);
  return (query,passedVariables)=>{
    const mq = mapQuery(query,passedVariables);
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>mq([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  }
}

export const schemaToMutationReducer=(schema,transducers={},listCombiner=appendObjectReducer)=>(query,passedVariables)=>{
  const mapQuery=mapQueryFactory(schema,query,passedVariables,{...transducers,intersection,subtract},listCombiner);
  return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
    return mapQuery([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  };
};