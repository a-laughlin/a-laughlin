import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame, tdFilter} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit,implicit} from './transducers';



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

const variableDefinitionsToObject = (variableDefinitions=[],passedVariables={})=>
  variableDefinitions.length === 0 ? passedVariables : transToObject((vars,{variable:{name:{value:name}},defaultValue})=>{
    vars[name]=passedVariables[name]??((defaultValue??{}).value);
  })(variableDefinitions);

const getNodeType = ({isList,defKind,defName,fieldName,fieldKindName})=>{
  if (defKind==='scalar') return  (isList ? 'objectScalarList' : 'objectScalar');
  // if (defName===fieldName) return 'objectObjectList';
  // return isList ? 'objectIdList' : 'objectId';
  if (isList) return (defName===fieldName ? 'objectObjectList' : 'objectIdList') ;
  return (defName===fieldKindName ? 'objectId' : 'object');
}
// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
const tdReduceEachWithChanged=(reduceChild,childKeys=(undef,arr)=>{})=>nextReducer=>(v,arr,k)=>{
  let kk,changed=false;
  for (kk of childKeys(arr)){
    v=reduceChild(v,arr,kk);
    if (arr[0]?.[kk]!==arr[1][kk]) changed=true;
  }
  return nextReducer(v,arr,k,changed);
};
const indexQuery=(schema={},query={},passedVariables={},transducers={})=>{
  transducers={...transducers,implicit};
  let queryMeta=indexSchema(schema).selectionMeta._query;
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(s,meta)=>{
    const name=s.name?.value||'_query'; // || root _query case
    const nodeType = getNodeType(meta);
    const childSelectors = transToObject((o,ss)=>o[ss.name.value]=inner(ss,meta[ss.name.value]))((s.selectionSet?.selections)??[]);
    const {explicit,implicit}=indexBy((v,k)=>k in transducers?'explicit':'implicit',(v,k)=>k)(getArgs(s.arguments));
    const implicitArgsTransducer=implicit?transducers.implicit(implicit):identity;
    const explicitArgsTransducer=explicit?compose(...Object.entries(explicit).map(([k,v])=>transducers[k](explicit[k]))):identity;
    if(meta.defKind==='scalar') return (o,[vP,vN,vNP,rN,rNP],k)=>vN;
    if(nodeType==='objectId'){
      return (undef,[vP,vN,vNP,rN,rNP])=>{
        const mapObjectId=(fn,id,ck)=>{
          // const relMeta = meta[ck];
          // console.log(`ck:`,ck,`  meta.defName:`,meta.defName, `  relMeta.defName:`,meta[ck].defName,'  fieldKindName:',meta.fieldKindName, `  relMeta.nodeType:`,getNodeType(meta[ck]), `  id:`,id,'  relMeta.fieldKindName:',relMeta.fieldKindName,'  vN:',vN)
          // if (relMeta.defKind==='scalar')return rN[meta[ck].defName][id][ck];
          const [relcN,relcNP] = [rN[meta.defName],rNP?.[meta.defName]];
          return fn(undefined,[vP?.[ck],relcN?.[id]?.[ck],relcNP?.[id]?.[ck],rN,rNP],id);
        }
        return mapToObject((childValueReducer,ck)=>{
          return mapObjectId(childValueReducer,vN,ck)
        })(childSelectors)
      };
    }
    const childrenTransducer = tdMap((arr,name2)=>{
      const [vP,vN,vNP,rN,rNP]=arr;
      // console.log('nodeType:',nodeType,'  name:',name,'  name2:',name2,'  defName:',meta.defName,'  fieldName:',meta.fieldName,'  fieldKindName:',meta.fieldKindName,'  vN:',vN);
      if (nodeType==='objectObjectList') {

        return transToObject((coll,obj,id)=>{
          if(implicit && implicit[meta.idKey] && implicit[meta.idKey]!==id) return coll;
          coll[id]=mapToSame((childValueReducer,ck)=>{
            return childValueReducer(undefined,[vP?.[id]?.[ck],vN?.[id]?.[ck],vP?.[id]?.[ck],rN,rNP],ck);
          })(childSelectors);
        })(vN);
      }
      
      if (nodeType==='objectIdList') {
        return tdToSame(compose(
          // nextReducer=>(obj,id)=>{
          //   console.log(`id`,id)
          //   const [relcN,relcNP] = [rN[meta[ck].defName],rNP[meta[ck].defName]];
          //   return nextReducer(undefined,[vP?.[id],relcN?.[id],relcNP?.[id],rN,rNP],id)
          // },
          // implicitArgsTransducer,
          // tdMap(arr=>arr[[vP?.[id],relcN?.[id],relcNP?.[id],rN,rNP]),
          tdMap(id=>{
            return mapToObject((childValueReducer,ck)=>mapObjectId(childValueReducer,id,ck))(childSelectors);
          })
        ))(vN);
      }
      if (nodeType==='object'){// includes 
        return transToObject((o,fn,k)=>fn(o,[vP?.[k],vN?.[k],vNP?.[k],rN,rNP],k))(childSelectors);
      }
      throw new Error("shouldn't be hit");
    });
    const reducer =  compose(
      // implicitArgsTransducer,
      // explicitArgsTransducer,
      childrenTransducer,
      // nextReducer=>(v,[vP,vN,vNP,rN,rNP],changed)=>nextReducer(vN!==vNP||changed ? v:vP,[vP,vN,vNP,rN,rNP],name)
    )(appendObjectReducer);
    return (v,[vP,vN,vNP,rN,rNP])=>reducer(v,[vP,vN,vNP,rN,rNP],name);
  }
  return inner(query.definitions[0],queryMeta);
};
export const schemaToQuerySelector=(schema,transducers={})=>(query,passedVariables)=>{
  const mapQuery=indexQuery(schema,query,passedVariables,{...transducers,implicit});
  return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
    return mapQuery(undefined,[rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev],'_query')._query;
  };
}
export const schemaToMutationReducer=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};