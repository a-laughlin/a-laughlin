import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter, tdMapWithAcc, tdMapKey, tdTap, isObjectLike, tdLog, isArray, stubArray, stubObject, transArrayToObject, isString} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {intersection,subtract,union,polymorphicArgTest,identity as tdIdentity} from './transducers';

// returns a function that populates query arguments with passed variables
const getArgsPopulator = (vars={},transducers={})=>{
  const inner=(meta,argument,hasTransducer=false)=>{
    let {name:{value:name},value}=argument;
    // handle implicit
    if (name in transducers){
      // td:scalar
      // td:[scalar]
      // td:{scalarListProp:scalar}                     Person(intersection:{nicknames:"AA"}) | Person(nicknames:"AA")
      // td:{scalarListProp:[scalar]}                   Person(intersection:{nicknames:["AA"]})| Person(nicknames:["AA"])
      // td:{objectListProp:scalar}                     Person(intersection:{friends:"b"}) | Person(friends:"a")
      // td:{objectListProp:[scalar]}                   Person(intersection:{friends:["b"]}) | Person(friends:["a"])
      // td:{objectListProp:{scalarKey:scalarVal}}      Person(intersection:{friends:{id:"b"}})
      // td:{objectListProp:[{scalarKey:scalarVal}]}    Person(intersection:{friends:[{id:"b"}]})
      if(hasTransducer)throw new Error(`Cannot nest transducers`);
      if (value.value) return transducers[name](meta,value.value);
      if (value.kind==='NullValue')return transducers[name](meta,null);
      if (value.kind==='Variable')return transducers[name](meta,vars[value.name.value]);
      if (value.fields) return transducers[name](meta, transToObject((o,a)=>{
        name;
        // 'Person(friends:{subtract:{id:"b"}})'
        o[a.name.value]=inner(meta[a.name.value]??meta,a,true);
      })(value.fields) );
      if (value.values) return transducers[name](meta, value.values.map(a=>inner(meta[a.name.value]??meta,a,true))(value.values) );
      throw new Error(`shouldn't be hit`);
    } else {
      // scalarListProp:{td:scalar}                     Person(nicknames:{intersection:"AA"}) | Person(nicknames:"AA")
      // scalarListProp:{td:[scalar]}                   Person(nicknames:{intersection:["AA"]})| Person(nicknames:["AA"])
      // objectListProp:{td:scalar}                     Person(friends:{intersection:"b"}) | Person(friends:"a")
      // objectListProp:{td:[scalar]}                   Person(friends:{intersection:["b"]}) | Person(friends:["a"])
      // objectListProp:{td:{scalarKey:scalarVal}}      Person(friends:{intersection:{id:"b"}})
      // objectListProp:{td:[{scalarKey:scalarVal}]}    Person(friends:{intersection:[{id:"b"}]})
      if (value.value) return hasTransducer?value.value:transducers.intersection(meta,{[name]:value.value});
      if (value.kind==='NullValue') return hasTransducer?null:transducers.intersection(meta,{[name]:null})
      if (value.kind==='Variable') return hasTransducer?vars[value.name.value]:transducers.intersection(meta,{[name]:vars[value.name.value]});
      if (value.values) return hasTransducer
        ? value.values.map(a=>inner(meta,a,hasTransducer))
        : transducers.intersection(meta,{[name]:value.values.map(a=>inner(meta,a,true))})
      if (value.fields) return hasTransducer
        ? transToObject((o,a)=> {
          o[a.name.value]=inner(meta[a.name.value],a,hasTransducer);
        })(value.fields)
        : compose(...value.fields.map(a=>{
          return inner(meta,a,hasTransducer)
        }))
      throw new Error(`shouldn't be hit`);
    }
  };
  return (meta,s)=>{
    const selfTransducers=[],propsTransducers={};
    (s.arguments??[]).forEach((a)=>{
      // const result=inner(meta[a.name.value]??meta,a);
      // if (typeof result!== 'function') throw new Error('function expected from getTransducers');
      if(a.name.value in transducers){
        selfTransducers.push(inner(meta[a.name.value]??meta,a));
      }
      else {
        propsTransducers[a.name.value]=inner(meta[a.name.value]??meta,a);
      };
    });
    return [compose(...selfTransducers),propsTransducers];
  }
}

// convert the gql AST definitions to an object for simpler access
const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
// loop over lists of items,
const tdMapVnorm = (listItemTransducer,getListItemAccumulator,listItemCombiner)=>arr=>{
  let [vP=getListItemAccumulator(arr),vN={},vNP={}]=arr;
  let v = getListItemAccumulator(arr);
  const comparator = isArray(v)?(v,vP)=>v[v.length]!==vP[v.length]:(v,vP,k)=>v[k]!==vP[k];
  const childReducer=listItemTransducer(listItemCombiner);
  let kk,vv,changed=vN!==vNP;
  
  for ([kk,vv] of Object.entries(vN)) {
    const result = childReducer({},arr,kk,vv);
    
    v = childReducer(v,arr,kk,vv);
    if(changed===false) changed=comparator(v,vP,kk);
  };
  return changed?v:vP;
}

const childMappersToMapObject = (selectionMappers)=>arr=>{
  let [vP={},vN={},vNP={},rN,rNP]=arr;
  let v={},ck,changed=vN!==vNP;
  // v check is necessary since an adjacent collection may have changed
  for (ck in selectionMappers) {
    ck in vN && (v[ck]=selectionMappers[ck]([vP[ck],vN[ck],vNP[ck],rN,rNP],ck));
    if(v[ck] !== vP[ck]) changed=true;
  }
  return changed?v:vP;
};

const mapQueryFactory=(schema={},transducers={},getListItemCombiner,getListItemAccumulator)=>(query={},passedVariables={})=>{
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables),transducers);
  return inner(indexSchema(schema).selectionMeta._query,query.definitions[0]);
  function inner( meta, s, propsTransducer=identity,[selfTransducer,childPropTransducers]=getArgs(meta,s)){
    // Walk the query tree beforehand to enclose the correct meta level for each childSelectors
    // console.log(`${meta.defName} ${meta.fieldName} propsTransducer:`,propsTransducer,)
    const selections=s?.selectionSet?.selections||[];
    query;
    const selectionMappers = selections.length===0
      ? transToObject((o,m,k)=>{
        if(!(k in childPropTransducers))o[k]=arr=>arr[1];
        else o[k]=inner(m,{},childPropTransducers[k],[identity,{}])// passing childPropTransducers applies them
      })(meta)
      : transToObject((o,ss,k)=>{
        o[ss.name.value]=(meta.defName!=='_query'&&meta[ss.name.value].defKind==='object' && ss.selectionSet===undefined)
          ? ()=>new Error(`objects must have selections`)
          : inner(meta[ss.name.value],ss,childPropTransducers[ss.name.value]);// passing childPropTransducers applies them to selections
      })(selections);

    // don't need to reduce objects since selections reduces them, and no selections effectively selects all
    const mapObject=childMappersToMapObject(selectionMappers);
    const mapObjectId=selections.length===0
      ? ([vP,vN,vNP,rN,rNP],k)=>{
        return vN;
        // return mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP],vN,rN[meta.defName][vN])
      }
      : ([vP,vN,,rN,rNP],k)=>{
        // console.log(k,vN,rN[meta.defName][vN]);
        return mapObject([vP,rN[meta.defName][vN],rNP?.[meta.defName]?.[vN],rN,rNP],vN,rN[meta.defName][vN]);
      };
    
    if (meta.nodeType==='objectScalar')            return ([,vN])=>vN;
    if (meta.nodeType==='object')                  return mapObject;
    if (meta.nodeType==='objectId')                return mapObjectId;
    if (meta.nodeType==='objectScalarList')        return tdMapVnorm(compose(
      tdMap((arr,i,vNi)=>vNi),
      selfTransducer,
      propsTransducer,
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.nodeType));
    if (meta.nodeType==='objectObjectList')        return tdMapVnorm(compose(
      tdMap(([vP,vN,vNP,rN,rNP],id,vNi)=>mapObject([vP?.[id],vNi,vNP?.[id],rN,rNP])),
      selfTransducer,
      propsTransducer,
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.nodeType));
    if (meta.nodeType==='objectIdList')            return tdMapVnorm(compose(
      // map key and val
      nextReducer=>(a,[vP,vN,vNP,rN,rNP],i,vNi)=>nextReducer(
        a,
        mapObjectId([vP?.[i],vNi,vNP?.[i],rN,rNP],vNi,rN[meta.defName][vNi]),
        vNi,
        rN[meta.defName][vNi]
      ),
      selfTransducer,
      nextReducer=>propsTransducer.name==='identity'?nextReducer:(...args)=>{
        console.log(` ...args:`,...args,)
        const result = propsTransducer(nextReducer)(...args);
        console.log(` result:`,result,);
        return result;
      },
      // propsTransducer,
    ),getListItemAccumulator(meta.nodeType),getListItemCombiner(meta.nodeType));
    throw new Error(`${meta.nodeType}:${meta.defName} shouldn't be hit`);
  }
};


const combineListItemToSame=nodeType=>nodeType==='objectScalarList'?appendArrayReducer:appendObjectReducer;
const getSameList= nodeType=>nodeType==='objectScalarList'?stubArray:stubObject;
export const schemaToQuerySelector=(schema,transducers={},listItemCombiner=combineListItemToSame,getListItemAccumulator=getSameList)=>{
  const mapQuery=mapQueryFactory( schema, {...transducers,identity:tdIdentity,intersection,subtract,union},listItemCombiner,getListItemAccumulator);
  return (query,passedVariables)=>{
    const mq = mapQuery(query,passedVariables);
    // if(query?.definitions[0].selectionSet?.selections[0]?.selectionSet){
      return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>mq([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
    // }
    // return (prevState={},{type='mutation',payload:[query={},variables={}]=[]}={})=>{
    //   if (type!=='mutation')return prevState;
    //   return mq([prevState,prevState,prevState]);
    // }
  }
}
const combineListItemToNormed=nodeType=>nodeType==='objectScalarList'||nodeType==='objectIdList'?appendArrayReducer:appendObjectReducer;
const getNormedList= nodeType=>nodeType==='objectScalarList'||nodeType==='objectIdList'?stubArray:stubObject;
export const schemaToMutationReducer=(schema,transducers={},listItemCombiner=combineListItemToNormed,getListItemAccumulator=getNormedList)=>{
  const mapQuery=mapQueryFactory( schema, {identity:tdIdentity,intersection,union,subtract,...transducers},listItemCombiner,getListItemAccumulator);
  return (prevState={},{type='mutation',payload:[query={},variables={}]=[]}={})=>{
    if (type!=='mutation')return prevState;
    // console.log(query.definitions[0].selectionSet.selections[0].arguments[0].name.value)
    return mapQuery(query,variables)([
      prevState,
      prevState,
      prevState,
      prevState,// necessary for idList lookups
    ]);
  };
};