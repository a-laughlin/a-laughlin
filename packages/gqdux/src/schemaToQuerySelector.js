import {isObjectLike,cond,transToObject,stubTrue, mapToObject, memoize, ensureArray, and,identity,diffObjs, mapToSame, tdToSame} from '@a-laughlin/fp-utils';
import { compose } from 'redux';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';


// const getListReducer=(loopReducer,preTransducer=identity,postReducer,getIterable,isChanged=(v,arr,i)=>v[i]!==arr[2][i])=>preTransducer((v,arr,k)=>{
//   let i,vv,changed=false;
//   const iterable=getIterable(v,arr,k);
//   for ([i,vv] of Object.entries(iterable)) {
//     v=loopReducer(v,arr,vv,i);
//     if(isChanged(v,arr,i))changed=true;
//   };
//   return postReducer(v,[...arr,changed],k);
// });
// const asScalarFieldReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],i)=>loopReducer(v,[m, f, vP, rN[m.defName][vN], rNP[m.defName]?.[vN], rN, rNP, g, args],i);
// const asScalarListFieldReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],i)=>loopReducer(v,[m, f, vP, vN[i], vNP[i], rN, rNP, g, args],i);
// const asIdFieldReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],i)=>loopReducer(v,[m, f, vP, rN[m.defName][vN], rNP[m.defName]?.[vN], rN, rNP, g, args],i);
// const asIdListFieldReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],i)=>loopReducer(v,[m, f, vP, rN[m.defName]?.[vN[i]], rNP[m.defName]?.[vN[i]], rN, rNP, g, args],i);
// const asItemListFieldReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],i)=>loopReducer(v,[m, f, vP, vN[i], vNP[i], rN, rNP, g, args],i);
// const asItemReducer=loopReducer=>(v,[m,f,vP,vN,vNP,rN,rNP,g,args],s,i)=>loopReducer(v,[m[s.name.value], s, vP, vN[s.name.value], vNP?.[s.name.value], rN, rNP, g, g(s)],i);
// // note, these don't need to recurse, they're just operating at 1 level.
// const transducerFactory = transducer=>combiner=>withResolvedArgs(cond(
//   [isScalarSelection,cond( // ensure item values are normedpreviously norm the object
//     [isList,getListReducer(asScalarListFieldReducer(transducer(combiner))],
//     [stubTrue,asScalarValueReducertransducer(combiner)],
//   )],
//   [isCollectionItem,cond( // ensure item values are normedpreviously norm the object
//     [isList,getSelectionsMapper(withIdAsItem(transducer(combiner)),withIdAsItem(combiner))],
//     [stubTrue,withIdAsItem(transducer(combiner))],
//   )],
//   [isCollection,getSelectionsMapper(transducer(combiner),combiner)]
// ));
// const subtractor = transducerFactory(
//   combiner=>(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)=>matches(vN,args.subtractAny)&&combiner(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)
// );


const getSelectionsMapper = (loopReducer,postReducer)=>(acc={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs,args],id)=>{// eslint-disable-line no-unused-vars
  let changed = false,k;
  for(const f of Field.selectionSet.selections){
    k = f.name.value;
    acc=loopReducer(acc,[meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs],k);
    if(acc[k] !== vDenormPrev[k]) changed = true;
  }
  return postReducer(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed]);
};

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