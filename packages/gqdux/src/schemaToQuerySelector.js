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

// move to indexSchema
const getNodeType = ({isList,defKind,defName,fieldName,fieldKindName})=>{
  if (defKind==='scalar') return  (isList ? 'objectScalarList' : 'objectScalar');
  if (isList) return (defName===fieldName ? 'objectObjectList' : 'objectIdList') ;
  return (defName===fieldKindName ? 'objectId' : 'object');
}

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
const tdMapVnorm = childReducer=>arr=>{
  const [vP,vN,vNP]=arr;
  let kk,vv,v,changed=vN!==vNP||vP===undefined;
  for ([kk,vv] of Object.entries(vN)) {
    v = childReducer(v,arr,kk,vv);
    // vN[kk]!==vNP?.[kk] && (changed=true);
  }
  return changed?v:vP;
}
const selectorsToMapObject = childSelectors=>([vP,vN={},vNP={},rN,rNP])=>{
  let v={},ck,changed=vN!==vNP||vP===undefined;
  if (vP===undefined) for (ck in childSelectors) v[ck]=childSelectors[ck]([undefined,vN[ck],vNP[ck],rN,rNP]);
  else if(changed) for (ck in childSelectors) v[ck]=childSelectors[ck]([vP[ck],vN[ck],vNP[ck],rN,rNP]);
  // v check is necessary since an adjacent collection may have changed
  else for (ck in childSelectors) ((v[ck]=childSelectors[ck]([vP[ck],vN[ck],vNP[ck],rN,rNP])) !== vP[ck]) && (changed=true);
  return changed?v:vP;
};

const indexQuery=(schema={},query={},passedVariables={},transducers={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(s,meta)=>{
    const nodeType = getNodeType(meta);
    // Walk the query tree beforehand closures the correct meta level for each childSelectors
    const childSelectors = transToObject((o,ss)=>o[ss.name.value]=inner(ss,meta[ss.name.value]))((s.selectionSet?.selections)??[]);
    const {explicit,implicit}=indexBy((v,k)=>k in transducers?'explicit':'implicit',(v,k)=>k)(getArgs(s.arguments));
    const implicitArgsTransducer=implicit?tdImplicit(implicit,meta):identity;
    const explicitArgsTransducer=explicit?compose(...Object.entries(explicit).map(([k,v])=>transducers[k](explicit[k],meta))):identity;
    const mapObject=selectorsToMapObject(childSelectors);
    const mapObjectId=([vP,vN,vNP,rN,rNP])=>{
      const result=mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP]);
      return result;
    };
    if (meta.defKind==='scalar')        return ([,vN])=>vN;
    if (nodeType==='object')            return mapObject;
    if (nodeType==='objectId')          return mapObjectId;
    if (nodeType==='objectObjectList')  {
      return tdMapVnorm(compose(
        // implicit?tdFilter((arr,id)=>(!(meta.idKey in implicit))||implicit[meta.idKey]===id):identity,
        tdMap(([vP,vN,vNP,rN,rNP],id)=>mapObject([vP?.[id],vN?.[id],vNP?.[id],rN,rNP])),
        // tdTap((a,v,k)=>{
        //   debugger;
        // }),
        implicitArgsTransducer,
        explicitArgsTransducer,
      )(appendObjectReducer));
    }
    if (nodeType==='objectIdList')      return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i)=>nextReducer(a,mapObjectId([vP?.[i],vN?.[i],vNP?.[i],rN,rNP]),vN[i]),
      implicitArgsTransducer,
      explicitArgsTransducer,
    )(appendObjectReducer));
    throw new Error(`${nodeType} shouldn't be hit`);
  }
  return inner(query.definitions[0],indexSchema(schema).selectionMeta._query);
};
export const schemaToQuerySelector=(schema,transducers={})=>(query,passedVariables)=>{
  const mapQuery=indexQuery(schema,query,passedVariables,{...transducers,intersection,subtract});
  return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
    return mapQuery([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  };
}
export const schemaToMutationReducer=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};