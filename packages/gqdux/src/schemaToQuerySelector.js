import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter, tdMapWithAcc, tdMapKey, tdTap, isObjectLike, tdLog} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {intersection,subtract,union,polymorphicArgTest,identity as tdIdentity} from './transducers';

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
  if (v===undefined) (v = childCombiner()) && (
    // hacky, but prevents passing additional fns for now.
    Array.isArray(v)?(v.length=0):(delete v.undefined)
  );
  return changed ? v : vP;
}

const childMappersToMapObject = (meta,childReducer)=>arr=>{
  let [vP,vN={},vNP={},rN,rNP]=arr;
  let v={},ck,changed=vN!==vNP||vP===undefined;
  vP ??= {}; /* eslint-disable-line */ // eslint doesn't support this syntax yet
  // v check is necessary since an adjacent collection may have changed
  for (ck in meta) {
    v=childReducer(v,[vP[ck],vN[ck],vNP[ck],rN,rNP],ck);
    if(v[ck] !== vP[ck]) changed=true;
  }
  return changed?v:vP;
};

const getArgTransducers=(transducers,queryArgs,meta={})=>{
  const selfTransducers={},propsTransducers={},selfTransducerList=[];
  // Collection                  g`Person(intersect:{id:"a"})`
  // Prop                        g`Person(friends:{intersect:{id:"b"}})`
  // Collection + Prop           g`Person(intersect:{id:"a"},friends:{intersect:{id:"b"}})`

  Object.entries(queryArgs).forEach(([k,v])=>{
    const isSelf=k in transducers,isProp=!isSelf;
    if (isSelf){
      selfTransducerList.push(transducers[k]((v,meta)));
      Object.entries(v).forEach(([kk,vv])=>{
        console.log(`isSelf v:`,v,` k:`,k,` vv:`,vv,` kk:`,kk,)
        selfTransducers[kk]=transducers[k]((vv,meta[kk]))
      });
    } else if (isProp){
      Object.entries(v).forEach(([kk,vv])=>{
        // console.log(`isProp v:`,v,` k:`,k,` vv:`,vv,` kk:`,kk,)
        if(! kk in transducers) throw new Error(`No implicit handling yet.  No transducer defined for ${kk} in ${JSON.stringify(v)}`);
        propsTransducers[k]=transducers[kk](vv,meta[k]);
      });
    } else {
      throw new Error(`No implicit handling yet.  No transducer defined for ${k} in ${JSON.stringify(queryArgs)}`);
    }
  });
  return {propsTransducers,selfTransducers,selfTransducer:compose(...selfTransducerList)};
};
const mapQueryFactory=(schema={},transducers={},listItemCombiner)=>(query={},passedVariables={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const identity=x=>x;
  return inner(indexSchema(schema).selectionMeta._query,query.definitions[0]);
  function inner( meta, s ){
    // Collection                  g`Person(intersect:{id:"a"})`
    // Prop                        g`Person(friends:{intersect:{id:"b"}})`
    // Collection + Prop           g`Person(intersect:{id:"a"},friends:{intersect:{id:"b"}})`
    // Walk the query tree beforehand closures the correct meta level for each childSelectors
    const args=getArgs(s?.arguments);
    let {propsTransducers,selfTransducers,selfTransducer}=getArgTransducers(transducers,args,meta);

    const selections=s?.selectionSet?.selections||[];
    const selectionKeys=transToObject((o,ss)=>o[ss.name.value]=ss)(selections);
    const selectionMappers = transToObject((o,m,k)=>{
      if(!selections.length){
        if (!selfTransducers[k]&&!propsTransducers[k]){
          o[k] = (arr,ck,vNi)=>arr[1];
        }else {
          o[k] = inner(m,selectionKeys[k],selfTransducers[k],propsTransducers[k]);
        }
      } else {
        if (!selectionKeys[k]&&!selfTransducers[k]&&!propsTransducers[k]){
          return;
        } else {
          o[k] = inner(m,selectionKeys[k],selfTransducers[k],propsTransducers[k]);
        }
      }
    })(meta);
    
    // console.log(` meta.defName:`,meta.defName,` meta.nodeType:`,meta.nodeType,`selfTransducers:`,selfTransducers,`selfTransducer`,selfTransducer)
    
    const mapObject=childMappersToMapObject(selectionMappers,compose(
      tdMap((arr,ck,vNi)=>selectionMappers[ck](arr,ck,vNi)),
      tdFilter((v,ck)=>v!==undefined&&(selections.length===0||ck in selectionKeys)),
    )(appendObjectReducer));
    const mapObjectId=([vP,vN,,rN,rNP])=>mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP]);
    
    if (meta.nodeType==='objectScalar')            return ([,vN])=>vN;
    if (meta.nodeType==='object')                  return mapObject;
    if (meta.nodeType==='objectId')                return mapObjectId;
    if (meta.nodeType==='objectScalarList')        return tdMapVnorm(compose(
      tdMap((arr,i,vNi)=>vNi),
      selfTransducer
    ))(appendArrayReducer);
    if (meta.nodeType==='objectObjectList')        return tdMapVnorm(compose(
      tdMap(([vP,vN,vNP,rN,rNP],id,vNi)=>mapObject([vP?.[id],vNi,vNP?.[id],rN,rNP])),
      selfTransducer
    ))(listItemCombiner);
    if (meta.nodeType==='objectIdList')            return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i,vNi)=>nextReducer(a,mapObjectId([vP?.[i],vN?.[i],vNP?.[i],rN,rNP]),vN[i]),
      selfTransducer// this will be a bug, when filtering on non-selected properties
    ))(listItemCombiner);
    throw new Error(`${meta.nodeType}:${meta.defName} shouldn't be hit`);
  }
};

export const schemaToQuerySelector=(schema,transducers={},listItemCombiner=appendObjectReducer)=>{
  const mapQuery=mapQueryFactory( schema, {...transducers,identity:tdIdentity,intersection,subtract,union},listItemCombiner);
  return (query,passedVariables)=>{
    const mq = mapQuery(query,passedVariables);
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>mq([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  }
}

const combineListItemToSame=(a,v,k)=>(isArray(a)?appendArrayReducer:appendObjectReducer)(a,v,k);
const getSameList= arr=>(isArray(arr[1])?[]:{});
export const schemaToMutationReducer=(schema,transducers={},listItemCombiner=combineListItemToSame,getListItemAccumulator=getSameList)=>{
  const mapQuery=mapQueryFactory( schema, {identity:tdIdentity,intersection,union,subtract,...transducers},listItemCombiner,getListItemAccumulator);
  return (rootNorm={},{type='mutation',payload:[query='',variables={}]=[]}={})=>{
    if (type!=='mutation')return rootNorm;
    return mapQuery(query,variables)([,rootNorm,,rootNorm,]);
  };
};