import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter, tdMapWithAcc, tdMapKey, tdTap, isObjectLike, tdLog, isArray, stubArray, stubObject, transArrayToObject, isString} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {intersection,subtract,union,polymorphicArgTest,identity as tdIdentity} from './transducers';

// returns a function that populates query arguments with passed variables
const getArgsPopulator = (vars,transducers)=>{
  // const getSubMeta=(meta,name)=>(name in meta && meta[name].defKind==='object')?meta[name]
  const nonTransducerObjToArgs=(meta,argument)=>{
    let {name:{value:name},value}=argument;
    if (value.kind==='ObjectValue')
      return transToObject((o,v)=>Object.assign(o,nonTransducerObjToArgs(meta,v)))(value.fields);
    if (value.kind==='ListValue')
      return value.values.map(v=>nonTransducerObjToArgs(meta,v));
    if(value.kind==='Variable') {
      const result = vars[value.name.value];
      return meta.defKind==='scalar'
        ? isObjectLike(result)
          ? isArray(result)
            ? result.map(r=>typeof r==='string'?r:new Error(`cannot pass objectlike property to select scalars. Pass strings instead`))
            : new Error(`cannot pass object property to select scalars`)
          : result
        : isObjectLike(result)
          ? isArray(result)
            ? result.map(r=>typeof r==='string'?{[meta.idKey]:r}:r)
            : result
          : {[argument.name.value]:result};
    }
    if ('value' in value) {
      if (!('idKey' in meta))throw new Error(`shouldn't hit scalar value without an idKey: ${JSON.stringify(value,null,2)}`);
      return {[name]:value.value};
    }
    throw new Error(`non-value argument shouldn't be hit: ${JSON.stringify(value,null,2)}`);
  };
  const getArgs = (m,argument)=>{
    const {name:{value:name}}=argument;
    if (name in transducers){
      return transducers[name](m,nonTransducerObjToArgs(m,argument));
    }
    throw new Error('props transducers not implemented yet');
  };
  return (meta,s)=>compose(...(s.arguments??[]).map(a=>getArgs(meta,a)));
}

// convert the gql AST definitions to an object for simpler access
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
// loop over lists of items,
const tdMapVnorm = (childTransducer,getListItemAccumulator,listCombiner)=>arr=>{
  const [vP,vN={},vNP]=arr;
  let v = getListItemAccumulator(arr);
  const childReducer=childTransducer(listCombiner);
  let kk,vv,changed=vN!==vNP||vP===undefined;
  // childReducer's combiner function should return the collection if undefined.
  for ([kk,vv] of Object.entries(vN)) v = childReducer(v,arr,kk,vv);
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

// const getArgTransducers=(transducers,queryArgs,meta={})=>{
//   const selfTransducers={},propsTransducers={},selfTransducerList=[];
//   // Selecting Collection                  g`Person(intersect:{id:"a"}){id}`
//   // Selecting Prop                        g`Person(friends:{intersect:{id:"b"}}){friends{id}}`
//   // Changing  Collection                  g`Person(intersect:{id:"a"})`
//   // Changing  Prop                        g`Person(friends:{intersect:{id:"b"}})`
//   function getTrans(m,args){
//     Object.entries(args).forEach(([kk,vv])=>{
//       // console.log(`isSelf v:`,v,` k:`,k,` vv:`,vv,` kk:`,kk,` meta[kk]:`,meta[kk],)
//       selfTransducers[kk]=transducers[k]((vv,meta[kk]))
//     });
//   }
//   Object.entries(queryArgs).forEach(([k,v])=>{
//     const isSelf=k in transducers,isProp=!isSelf && k in meta;

//     if (isSelf){
//       console.log(`isSelf v:`,v,` k:`,k,'Object.keys(meta)',Object.keys(meta),'meta.id.nodeType',meta.id.nodeType);
//       selfTransducerList.push(transducers[k]((v,meta)));
//       Object.entries(v).forEach(([kk,vv])=>{
//         // console.log(`isSelf v:`,v,` k:`,k,` vv:`,vv,` kk:`,kk,` meta[kk]:`,meta[kk],)
//         selfTransducers[kk]=transducers[k]((vv,meta[kk]))
//       });
//     } else if (isProp){
//       Object.entries(v).forEach(([kk,vv])=>{
//         console.log(`isProp v:`,v,` k:`,k,` vv:`,vv,` kk:`,kk,)
//         if(! kk in transducers) throw new Error(`No implicit handling yet.  No transducer defined for ${kk} in ${JSON.stringify(v)}`);
//         propsTransducers[k]=transducers[kk](vv,meta[k]);
//       });
//     } else {
//       throw new Error(`No implicit handling yet.  No transducer defined for ${k} in ${JSON.stringify(queryArgs)}`);
//     }
//   });
//   return {propsTransducers,selfTransducers,selfTransducer:compose(...selfTransducerList)};
// };
const mapQueryFactory=(schema={},transducers={},getListItemCombiner,getListItemAccumulator)=>(query={},passedVariables={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables),transducers);
  return inner(indexSchema(schema).selectionMeta._query,query.definitions[0]);
  function inner( meta, s, transducer=getArgs(meta,s)){
    // Collection                  g`Person(intersect:{id:"a"})`
    // Prop                        g`Person(friends:{intersect:{id:"b"}})`
    // Collection + Prop           g`Person(intersect:{id:"a"},friends:{intersect:{id:"b"}})`
    // Walk the query tree beforehand closures the correct meta level for each childSelectors
    // const transducer = let {propsTransducers,selfTransducers,selfTransducer}=getArgTransducers(transducers,args,meta);

    const selections=s?.selectionSet?.selections||[];
    const selectionMappers = selections.length===0
      ? transToObject((o,m,k)=>o[k]=(arr,ck,vNi)=>arr[1])(meta)
      : transToObject((o,ss,k)=>o[ss.name.value]=inner(meta[ss.name.value],ss))(selections);

    const mapObject=childMappersToMapObject(selectionMappers,compose(
      tdMap((arr,ck,vNi)=>selectionMappers[ck](arr,ck,vNi)),
      // tdFilter((v,ck)=>v!==undefined&&(selections.length===0||ck in selectionKeys)),
    )(appendObjectReducer));
    const mapObjectId=([vP,vN,,rN,rNP])=>mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP]);
    
    if (meta.nodeType==='objectScalar')            return ([,vN])=>vN;
    if (meta.nodeType==='object')                  return mapObject;
    if (meta.nodeType==='objectId')                return mapObjectId;
    if (meta.nodeType==='objectScalarList')        return tdMapVnorm(compose(
      tdMap((arr,i,vNi)=>vNi),
      // transducer
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.NodeType));
    if (meta.nodeType==='objectObjectList')        return tdMapVnorm(compose(
      tdMap(([vP,vN,vNP,rN,rNP],id,vNi)=>mapObject([vP?.[id],vNi,vNP?.[id],rN,rNP])),
      transducer
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.NodeType));
    if (meta.nodeType==='objectIdList')            return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i,vNi)=>nextReducer(a,mapObjectId([vP?.[i],vN?.[i],vNP?.[i],rN,rNP]),vN[i]),
      transducer// this will be a bug, when filtering on non-selected properties
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.NodeType));
    throw new Error(`${meta.nodeType}:${meta.defName} shouldn't be hit`);
  }
};

const combineListItemToSame=nodeType=>nodeType==='objectScalarList'?appendArrayReducer:appendObjectReducer;
const getSameList= nodeType=>nodeType==='objectScalarList'?stubArray:stubObject;
export const schemaToQuerySelector=(schema,transducers={},listItemCombiner=combineListItemToSame,getListItemAccumulator=getSameList)=>{
  const mapQuery=mapQueryFactory( schema, {...transducers,identity:tdIdentity,intersection,subtract,union},listItemCombiner,getListItemAccumulator);
  return (query,passedVariables)=>{
    const mq = mapQuery(query,passedVariables);
    return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>mq([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  }
}

export const schemaToMutationReducer=(schema,transducers={},listItemCombiner=combineListItemToSame,getListItemAccumulator=getSameList)=>{
  const mapQuery=mapQueryFactory( schema, {identity:tdIdentity,intersection,union,subtract,...transducers},listItemCombiner,getListItemAccumulator);
  return (rootNorm={},{type='mutation',payload:[query='',variables={}]=[]}={})=>{
    if (type!=='mutation')return rootNorm;
    return mapQuery(query,variables)([,rootNorm,,rootNorm,]);
  };
};