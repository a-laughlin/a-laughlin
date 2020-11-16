import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter, tdMapWithAcc, tdMapKey, tdTap} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {intersection,subtract,union,polymorphicArgTest} from './transducers';

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
  const [vP,vN={},vNP]=arr;
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
const getTransducer = (transducers,args,meta,selections)=>{
  let {explicit,implicit}=indexBy((v,k)=>k in transducers?'explicit':'implicit',(v,k)=>k)(args);
  // when selecting, implicit filters then applies explicit
  // when mutating, implicit applies explicit, leaving the rest untouched
  const implicitTest=polymorphicArgTest(implicit,meta);
  const getExplicitTransducers=()=>Object.keys(explicit).map(k=>transducers[k](explicit[k],meta));
  return selections
    ? explicit
      ? implicit
        ? compose(tdFilter((v,k,vNi)=>implicitTest(vNi,k)),...getExplicitTransducers())
        : compose(...getExplicitTransducers())
      : implicit
        ? tdFilter((v,k,vNi)=>implicitTest(vNi,k))
        : identity
    : explicit // when no selections, we're mutating
      ? implicit
        ? compose(tdFilter((v,k,vNi)=>implicitTest(vNi,k)),...getExplicitTransducers())
        : compose(...getExplicitTransducers())
      : implicit
        ? tdFilter((v,k,vNi)=>implicitTest(vNi,k))
        : identity;
}
const mapQueryFactory=(schema={},transducers={},listItemCombiner)=>(query={},passedVariables={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(s,meta)=>{
    // Walk the query tree beforehand closures the correct meta level for each childSelectors
    const selectionKeys=transToObject((o,ss)=>o[ss.name.value]=ss)(s.selectionSet?.selections);
    const childMappers = s.selectionSet?.selections
      ? mapToObject((ss,k)=>inner(ss,meta[k]))(selectionKeys)
      : mapToObject((ss,k)=>selectionKeys[k]?inner(ss,meta[k]):(arr,vN,vNi)=>vNi)(meta);
    const nodeType = meta.nodeType;
    const transducer=getTransducer(transducers,getArgs(s.arguments),meta,s.selectionSet);
    const mapObject=childMappersToMapObject(childMappers);
    const mapObjectId=([vP,vN,,rN,rNP])=>mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP]);
    
    if (meta.nodeType==='objectScalar')            return ([,vN])=>vN;
    if (meta.nodeType==='object')                  return mapObject;
    if (meta.nodeType==='objectId')                return mapObjectId;
    if (meta.nodeType==='objectScalarList')        return tdMapVnorm(compose(
      tdMap((arr,i,vNi)=>vNi),
      transducer,
    ))(appendArrayReducer);
    if (meta.nodeType==='objectObjectList')        return tdMapVnorm(compose(
      tdMap(([vP,vN,vNP,rN,rNP],id,vNi)=>mapObject([vP?.[id],vNi,vNP?.[id],rN,rNP])),
      transducer,
    ))(listItemCombiner);
    if (meta.nodeType==='objectIdList')            return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i,vNi)=>nextReducer(a,mapObjectId([vP?.[i],vN?.[i],vNP?.[i],rN,rNP]),vN[i]),
      transducer,// this will be a bug, when filtering on non-selected properties
    ))(listItemCombiner);
    throw new Error(`${meta.nodeType} shouldn't be hit`);
  }
  return inner(query.definitions[0],indexSchema(schema).selectionMeta._query);
};

export const schemaToQuerySelector=(schema,transducers={},listItemCombiner=appendObjectReducer)=>{
  const mapQuery=mapQueryFactory( schema, {...transducers,intersection,subtract,union},listItemCombiner);
  return (query,passedVariables)=>{
    const mq = mapQuery(query,passedVariables);
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>mq([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  }
}

const combineListItemToSame=(a,v,k)=>(isArray(a)?appendArrayReducer:appendObjectReducer)(a,v,k);
const getSameList= arr=>(isArray(arr[1])?[]:{});
export const schemaToMutationReducer=(schema,transducers={},listItemCombiner=combineListItemToSame,getListItemAccumulator=getSameList)=>{
  const mapQuery=mapQueryFactory( schema, {intersection,union,subtract,...transducers},listItemCombiner,getListItemAccumulator);
  return (rootNorm={},{type='mutation',payload:[query='',variables={}]=[]}={})=>{
    if (type!=='mutation')return rootNorm;
    return mapQuery(query,variables)([,rootNorm,,rootNorm,]);
  };
};