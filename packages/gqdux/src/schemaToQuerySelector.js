import {isObjectLike,cond,transToObject,stubTrue, mapToObject, memoize, ensureArray, and,identity,diffObjs} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit} from './transducers';

const getSelectionsMapper = (combiner,reduceResult)=>(acc={},[meta,Field,vDenormPrev={},vNorm={},vNormPrev={},rootNorm,rootNormPrev,getArgs,args],id)=>{// eslint-disable-line no-unused-vars
  let changed = false,k;
  for(const f of Field.selectionSet.selections){
    k = f.name.value;
    acc=combiner(acc,[meta[k],f,vDenormPrev[k],vNorm[k],vNormPrev[k],rootNorm,rootNormPrev,getArgs],k);
    if(acc[k] !== vDenormPrev[k]) changed = true;
  }
  return reduceResult(acc,[meta,Field,vDenormPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,changed]);
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
const isListSelection=(acc,[meta])=>meta.isList;
const isCollectionItemSelection=(acc,[meta])=>'fieldName' in meta;
const isCollectionSelection=(acc,[meta])=>!('fieldName' in meta);
const isPrimitiveValue=(acc,[meta, , ,vNorm])=>!isObjectLike( meta.isList?vNorm[0]:vNorm );
const isObjectValue=(acc,[meta, , ,vNorm])=>isObjectLike( meta.isList?vNorm[0]:vNorm );

const getMapSelections = (allItemsCombiner,transducers={})=>{
  const selectionCombiner=(a,v,id)=>{a[id]=selectionReducer(a[id],v,id);return a;};
  const selectionReducer=cond(
    // error, key does not exist
    [isScalarSelection,cond(
      [isObjectValue,()=>{throw new Error('cannot request object without selecting fields')}],
      [isPrimitiveValue,(acc,[,,,vNorm])=>vNorm],
    )],
    [isObjectSelection,cond(
      [isCollectionItemSelection, cond(
        // these convert collection item id(s) to related object(s) and continue walking
        [isListSelection,(acc,[m,f,vDP={},id=[],,rN,rNP,g],k)=>transToObject((o,i)=>o[i]=mapSelections(o[i],[m, f, vDP, rN[m.defName][i], rNP[m.defName]?.[i], rN, rNP, g],i))(id)],
        [stubTrue,(acc,[m,f,vDP={},id='',,rN, rNP, g],k)=>mapSelections({},[m, f, vDP, rN[m.defName][id], rNP[m.defName]?.[id], rN, rNP, g],id)],
      )],
      [isPrimitiveValue,()=>{throw new Error('cannot select field of primitive value')}],
      [isCollectionSelection, getCollectionMapper(
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

// root>coll
// root>[scalar]
// root>coll>item>[scalar]
// root>coll>item>[id]
// root>coll>item>[id]>otherColl[...id]
// root>coll>item (remove from list) erase friend list: Person(id:'a',subtract:{friends:["b"]})
// root>coll>item (remove from coll) erase friends      Person(id:'a',subtractById:{friends:["b"]})

export const schemaToMutationReducer = (schema,transducers={})=>{
  const td = (nextRoot,v,k)=>{
    // it's going to be a lot faster to populate args on an initial run, then run the collection with existing transducers
    const [meta,Field,vNorm,vNormRoot,getArgs]=v;
    if (meta.defKind==='scalar'){
      if(meta.fieldKindName){
        nextRoot[meta.defName][k]=vNorm;
      }
      // handles 2 cases:
      // parent is item, k is field key, vNorm is value
      // parent is root i.e. _query, k is defName, vNorm is value
      return parent;
    } else {
      if(meta.fieldKindName){ // parent is collection, k is id, vNorm is rel id
        // if is list, vNorm is collection subset
        const ids=ensureArray(vNorm);
        for (const id of ids){
          let possibleItem = {},changed;
          const nextMeta=meta[s.name.value];
          td(parent,[nextMeta,s,actualItem,vNormRoot,getArgs],s.name.value);
          const actualItem=vNormRoot[nextMeta.defName][id];
          for (const s of Field.selectionSet.selections){
            if(possibleItem[s.name.value]!==actualItem[s.name.value])changed=true;
          }
          parent[k]=changed?possibleItem:actualItem;
        }
        return parent;
      } else { // parent is root i.e. _query, k coll name, vNorm is collection
        let newColl={},changed;
        for (const id in vNorm){
          newColl=td(newColl,[meta[meta.idKey],Field,vNorm[id],vNormRoot,getArgs],id);
          if(newColl[id]!==vNorm[id])changed=true;
        }
        parent[k]=changed?newColl:vNorm;
      }
    }
    return parent;
  };
  // getReducerFromTransducers(transducers,acc);
  const {selectionMeta}=indexSchema(schema);
  return (prevState,action)=>{
    if(action.type!=='mutation')return prevState;
    const [query,passedVariables={}]=action.payload;
    const argsPopulator=getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions,passedVariables));
    return td({},[selectionMeta._query,query.definitions[0],prevState,prevState,argsPopulator],'_query');
  }
};