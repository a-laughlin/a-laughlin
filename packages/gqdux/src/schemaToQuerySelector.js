import {isObjectLike,cond,transToObject,stubTrue, mapToObject, memoize, ensureArray, and,identity,diffObjs, mapToSame, tdToSame} from '@a-laughlin/fp-utils';
import { compose } from 'redux';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';



// const subtractor = transducerFactory(
//   combiner=>(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)=>matches(vN,args.subtractAny)&&combiner(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)
// );
const getIterableMapper=(mapIterateeArgs,getIterable=(a,[,,,,vN])=>vN,isChanged=(a,[,,v,vP],vv)=>v[vv]!==vP?.[vv])=>(loopReducer,combineResult)=>{
  loopReducer = mapIterateeArgs(loopReducer);
  return (a,arr,k,kk)=>{
    let i,vv,changed=false;
    for ([i,vv] of Object.entries(getIterable(a,arr,k,kk))) {
      a=loopReducer(a,arr,vv,i);
      if(isChanged(a,arr,vv,i))changed=true;
    }
    return combineResult(a,[...arr,changed],k,kk);
  }
}
const getNodeType = (a,arr)=>{
  const {isList,defKind,defName,fieldName,fieldKindName}=arr[0];
  if (defKind==='scalar') return  (isList ? 'objectScalarList' : 'objectScalar');
  if (isList) return (defName===fieldName ? 'objectObjectList' : 'objectIdList') ;
  return (fieldKindName==='ID' ? 'objectId' : 'object');
}
const getTraversalTransducer = (transducerObj,combineResult)=>{
  const listCombiner=(a,v,listVal,listKey)=>{a[listKey]=(a[listKey],v,id);return a;};
  // iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
  const listReducer=compose(
    nextReducer=>(a,arr,v,k)=>transducerObj[getNodeType(a,arr,v,k)](nextReducer)(a,arr,v,k),
    nextReducer=>(a,arr,v,k)=>nextReducer(childIterators[getNodeType(a,arr,v,k)](a,arr,v,k),arr,v,k)
  )(listCombiner);
  
    // 5 descend and iterate cases, 1 leaf (scalar value)
  const parentToChildMappers={
    objectScalar:     identity,
    objectScalarList: loopReducer=>(a,[m,f,aP,aN,aNP,rN,rNP,g,args],vv,i)=>loopReducer(a,[m, f, aP[i], aN[i], aNP[i], rN, rNP, g, args],vv,i),
    objectId:         loopReducer=>(a,[m,f,aP,aN,aNP,rN,rNP,g,args],vv,i)=>loopReducer(a,[m, f, aP, rN[m.defName][vv],rNP[m.defName][vv],rN,rNP,g,args],vv,i),
    objectIdList:     loopReducer=>(a,[m,f,aP,aN,aNP,rN,rNP,g,args],vv,i)=>loopReducer(a,[m, f, aP, rN[m.defName]?.[vv], rNP[m.defName]?.[vv], rN, rNP, g, args],vv,i),
    objectObjectList: loopReducer=>(a,[m,f,aP,aN,aNP,rN,rNP,g,args],vv,i)=>loopReducer(a,[m, f, aP, aN[i], aNP[i], rN, rNP, g, args],vv,i),
    object:           loopReducer=>(a,[m,f,aP,aN,aNP,rN,rNP,g,args],vv,i)=>loopReducer(a,[m[s.name.value], s, aP, aN[s.name.value], aNP?.[s.name.value], rN, rNP, g, g(s)],vv,i),
  }
  const childIterators={
    objectScalar:     identity, // leaf
    objectScalarList: getIterableMapper(parentToChildMappers.objectScalarList)(identity,combineResult),
    objectId:         parentToChildMappers.objectId(listReducer),
    objectIdList:     getIterableMapper(parentToChildMappers.objectIdList)(listReducer,combineResult),
    objectObjectList: getIterableMapper(parentToChildMappers.objectObjectList)(listReducer,combineResult),
    object:           getIterableMapper( // loops over object properties - no transducer necessary since selections
                        parentToChildMappers.object,
                        (v,arr)=>arr[1].selectionSet.selections,
                        (a,[,,aP],{name:{value:k}})=>a[k]!==aP[k]
                      )(listReducer,combineResult)
  }
}



// const getSelectionsMapper = (loopReducer,postReducer)=>(acc={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs,args],id)=>{// eslint-disable-line no-unused-vars
//   let changed = false,k;
//   for(const f of Field.selectionSet.selections){
//     k = f.name.value;
//     acc=loopReducer(acc,[meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs],k);
//     if(acc[k] !== vDenormPrev[k]) changed = true;
//   }
//   return postReducer(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed]);
// };

const getCollectionMapper=(reducer,reduceResult)=>(acc={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs],k)=>{
  // on the first traverse up, break if the final collection is unchanged since its items will be too.
  // if(meta.objectFields.length===0&&vNorm===vNormPrev) return reduceResult(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,false],k);
  let changed=false;
  for(const id in vNorm){
    acc=reducer(acc,[meta,Field,vDenormPrev[id],vNorm[id],vNormPrev[id],rootNorm,rootNormPrev,getArgs],id);
    if(acc[id]!==vDenormPrev[id])changed=true;
  }
  return reduceResult(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed],k);
}

// predicates
const isScalarSelection=(acc,[meta])=>meta.defKind==='scalar';
const isObjectSelection=(acc,[meta])=>meta.defKind==='object';
const isList=(acc,[meta])=>meta.isList;
const isCollectionItem=(acc,[m,f,vDP={},id=[],,rN,rNP,g],k)=>m.fieldName!==m.defName;
const isCollection=(acc,[m],k)=>m.fieldName===m.defName;
const isPrimitiveValue=(acc,[meta, , ,vNorm])=>!isObjectLike( meta.isList?vNorm[0]:vNorm );
const isObjectValue=(acc,[meta, , ,vNorm])=>isObjectLike( meta.isList?vNorm[0]:vNorm );

const getMapSelections = (allItemsCombiner,transducers={})=>{
  const selectionCombiner=(a,v,id)=>{a[id]=selectionReducer(a[id],v,id);return a;};
  const selectionReducer=cond(
    // error, key does not exist
    [isScalarSelection,cond(
      // [isObjectValue,()=>{throw new Error('cannot request object without selecting fields')}],
      [isPrimitiveValue,(acc,[,,,vNorm])=>vNorm],
    )],
    [isObjectSelection,cond(
      [isCollectionItem, cond(
        // these convert collection item id(s) to related object(s) and continue walking
        [isList,(acc,[m,f,vDP={},id=[],,rN,rNP,g],k)=>transToObject((o,i)=>o[i]=mapSelections(o[i],[m, f, vDP, rN[m.defName][i], rNP[m.defName]?.[i], rN, rNP, g],i))(id)],
        [stubTrue,(acc,[m,f,vDP={},id='',,rN, rNP, g],k)=>mapSelections({},[m, f, vDP, rN[m.defName][id], rNP[m.defName]?.[id], rN, rNP, g],id)],
      )],
      // [isPrimitiveValue,()=>{throw new Error('cannot select field of primitive value')}],
      [isCollection, getCollectionMapper(
        getReducerFromTransducers(transducers,(a,v,id)=>{a[id]=mapSelections(a[id],v,id);return a;}),
        allItemsCombiner
      )],
    )]
  );
  const mapSelections = getSelectionsMapper(selectionCombiner,allItemsCombiner);
  return mapSelections;
};

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

const getReducerFromTransducers=(transducers,combiner)=>{
  const tds=mapToObject(t=>t(combiner))(transducers);
  return (a,v,k)=>{
    const getArgs = v[v.length-1];
    const args = getArgs(v[1].arguments);
    return (v[1].arguments.reduce((fn,{name:{value:name}})=>fn||(tds[name]?.(a,v,k,args[name])),null))||tds.filter(a,v,k,args);
  }
};

const getQuerySelector=(schema,mapSelections)=>{
  const {selectionMeta}=indexSchema(schema);
  return function mapQuery (query, passedVariables={}){
    const argsPopulator=memoize(getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions,passedVariables)));
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
export const schemaToMutationReducer=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};