import {transToObject,identity,indexBy, appendArrayReducer, appendObjectReducer, setImmutableNonEnumProp, mapToObject, compose, tdToSame, transToSame, over, mapToArray, tdMap, mapToSame} from '@a-laughlin/fp-utils';
import indexSchema from './indexSchema';
import {filter,omit,implicit} from './transducers';

// iteration sets properties and checks changes.  After iteration choose which parent to return, so unchanged properties result in an unchanged parent.
const tdReduceEachWithChanged=(reduceChild,preTrans=identity,childKeys=(p,[,pN={}],k)=>Object.keys(pN))=>nextReducer=>preTrans((parent,arr,k)=>{
  let kk,nextParent,changed=false;
  for (kk of childKeys(parent,arr,k)){
    nextParent=reduceChild(nextParent,arr,kk);
    if (nextParent[kk]!==parent[kk]) changed=true;
  }
  return nextReducer(nextParent,arr,k,changed);
});

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
  if (defName===fieldName) return 'objectObjectList';
  return isList ? 'objectId' : 'objectIdList';
}

const indexQuery=(schema={},query={},passedVariables={},transducers={})=>{
  let meta=indexSchema(schema).selectionMeta;
  const getArgs = getArgsPopulator(variableDefinitionsToObject(query.definitions[0].variableDefinitions||[],passedVariables));
  const inner=(s,meta)=>{
    const name=s.name?.value||meta.defName; // || root _query case
    const nodeType = getNodeType(meta);
    const childSelectors = transToObject((o,ss)=>o[ss.name.value]=inner(ss,meta[ss.name.value]));
    const {explicit,implicit}=indexBy((v,k)=>k in transducers?'explicit':'implicit',(v,k)=>k)(getArgs(s.arguments));
    const implicitArgsTransducer=implicit?transducers.implicit(implicit):identity;
    const explicitArgsTransducer=explicit?compose(...Object.entries(explicit).map(([k,v])=>transducers[k](explicit[k]))):identity;
    const childrenTransducer = nextReducer=>(undefinedValue,[vP,vN,vNP,rN,rNP])=>{
      // descend then ascend the state path
      let v;
      if      (nodeType==='objectScalar') v = nextReducer(vN,[vP,vN,vNP,rN,rNP]);
      else if (nodeType==='objectScalarList') v = nextReducer(vN,[vP,vN,vNP,rN,rNP]);
      else if (nodeType==='objectObjectList') v = mapToSame((obj,id)=>{
          return mapToSame((childValueReducer,ck)=>{
            return childValueReducer([vP?.[id]?.[ck],vN?.[id]?.[ck],vP?.[id]?.[ck],rN,rNP]);
          })(childSelectors);
        })(vN);
      else {
        const relationMeta=meta[name];
        const relName=relationMeta.defName;
        const [relcN,relcNP] = [rN[relName],rNP[relName]];
        let id=vN;
        if (nodeType==='objectId') v = mapToSame((childValueReducer,ck)=>{
            return childValueReducer([vP?.[ck],relcN?.[id]?.[ck],relcNP?.[id]?.[ck],rN,rNP]);
          })(childSelectors)
        else if (nodeType==='objectIdList') v = mapToSame(id=>{
          return mapToSame((childValueReducer,ck)=>{
            return childValueReducer([vP?.[ck],relcN?.[id]?.[ck],relcNP?.[id]?.[ck],rN,rNP]);
          })(childSelectors);
        })(vN);
      }
      const changed=true;
      return nextReducer(v,[vP,vN,vNP,rN,rNP],changed);
    };
    const reducer =  compose(
      implicitArgsTransducer,
      explicitArgsTransducer,
      childrenTransducer,
      nextReducer=>(v,[vP,vN,vNP,rN,rNP],changed)=>nextReducer(vN===vNP||changed ? v:vP,[vP,vN,vNP,rN,rNP],name)
    )(appendObjectReducer);
    return ([vP,vN,vNP,rN,rNP])=>reducer(undefined,[vP,vN,vNP,rN,rNP],name);
  }
  return inner({},query.definitions[0],meta._query);
};
export const schemaToQuerySelector=(schema,transducers={})=>(query,passedVariables)=>{
  const mapQuery=indexQuery(schema,query,passedVariables,{...transducers,implicit});
  return (rootNorm={},rootNormPrev={},rootDenormPrev={})=>{
    return mapQuery([rootDenormPrev,rootNorm,rootNormPrev,rootNorm,rootNormPrev]);
  };
}
export const schemaToMutationReducer=(schema,transducers={})=>{
  const allItemsCombiner=(vDenorm,[,,vDenormPrev,vNorm,vNormPrev,,,,propsChanged])=>
    vNorm !== vNormPrev || propsChanged ? vDenorm : vDenormPrev;
  return getQuerySelector(schema,getMapSelections(allItemsCombiner,{filter,omit,...transducers}));
};