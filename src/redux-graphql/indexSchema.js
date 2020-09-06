import {keyBy,frozenEmptyArray, ensureArray,ensurePropIsObject,memoize, transToObject} from '@a-laughlin/fp-utils';

export const getDefName=schemaDefinition=>schemaDefinition.name.value;
export const getDefKind=schemaDefinition=>schemaDefinition.kind;
export const getDefFields=schemaDefinition=>schemaDefinition.fields??frozenEmptyArray;
export const getDefCollectionName=schemaDefinition=>`${d.name.value}s`;
export const getFieldTypeName=fieldDefinition=>{
  let type=fieldDefinition.type;
  while(type.kind!=='NamedType')type=type.type;
  return type.name.value;
}
export const getFieldMeta=f=>{
  let isList=false,isNonNullList=false,isNonNull=false;
  if(f.type.kind==='NamedType')return{isList,isNonNullList,isNonNull};
  if(f.type.kind==='NonNullType'&&f.type.f.type.kind==='NamedType') return {isList:false,isNonNullList:false,isNonNull:true};
  isList=true;
  isNonNullList=f.type.kind==='NonNullType';
  isNonNull=isNonNullList&&f.type.type.type.kind==='NonNullType';
  return {isList,isNonNull,isNonNullList};
}
const defineHiddenProp = (obj,key,value)=>Object.defineProperty(obj,key,{value,enumerable:false,writable:false,configurable:false});
const assignAllProps = (dest,...srcs)=>srcs.reduceRight((acc,src)=>{
  Object.defineProperties(acc,Object.getOwnPropertyDescriptors(src));
  return acc;
},dest);
// defName, defKind, fieldKey,fieldValueDefKind,fieldValueDefName
// but fieldValueDefKind,fieldValueDefName can be retrieved through rel
export default memoize(schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  const builtInDefinitions=['ID','Int','Float','String','Boolean']
    .map(value=>({kind:'ScalarTypeDefinition',name:{kind:'Name',value}}));
  // const builtInDefinitions=[]
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const definitionsByName=keyBy(getDefName)(allDefs);
  const result = {
    ...definitionsByKind,
    definitions:allDefs,
    definitionsByName,
    selectionMeta:transToObject((acc,d,cDefName)=>{
      const meta=acc[cDefName]={};
      // define all non-selection props as hidden so iterating over selections works;
      defineHiddenProp(meta,'defName',cDefName);
      if (cDefName in definitionsByKind.ObjectTypeDefinition){
        defineHiddenProp(meta,'defKind','object');
        defineHiddenProp(meta,'objectFields',[]);// enables checking the count of object fields to short-circuit
        for (const f of d.fields){
          const [fieldKeyName,fDefName,{isList,isNonNull,isNonNullList}]=[f.name.value,getFieldTypeName(f),getFieldMeta(f)];
          if (meta.idKey===undefined && fDefName==='ID') defineHiddenProp(meta,'idKey',fieldKeyName);
          const fMeta = meta[fieldKeyName]={};
          defineHiddenProp(fMeta,'fieldName',fieldKeyName);
          defineHiddenProp(fMeta,'isList',isList);
          defineHiddenProp(fMeta,'isNonNull',isNonNull);
          defineHiddenProp(fMeta,'isNonNullList',isNonNullList);
          fMeta.defNameTemp=fDefName; // make visible since it'll be deleted when linking with definitions
          if(fDefName in definitionsByKind.ObjectTypeDefinition){
            meta.objectFields.push(meta[fieldKeyName]);
          }
        }
      } else {
        defineHiddenProp(meta,'defKind','scalar');
      }
    })(definitionsByName)
  };

  // link defs
  for (const dName in definitionsByKind.ObjectTypeDefinition){
    for (const fName in result.selectionMeta[dName]){
      const fMeta=result.selectionMeta[dName][fName];
      assignAllProps(fMeta,result.selectionMeta[fMeta.defNameTemp]);
      delete fMeta.defNameTemp;
    }
  }
  // custom query definition, to eliminate the need to create a query Object repeating each type
  // namespaced as _query to prevent conflicts with Query should one be defined
  result.selectionMeta._query = transToObject((acc,meta,defName)=>{
    acc[defName]={
      fieldName:defName,
      isList:false,
      isNonNull:false,
      isNonNullList:false,
    }
    assignAllProps(acc[defName],meta);
  })(result.selectionMeta);
  defineHiddenProp(result.selectionMeta._query,'defName','_query');
  defineHiddenProp(result.selectionMeta._query,'defKind','object');
  // for (const d in result.selectionMeta._query){
  //   console.log('d',d,result.selectionMeta._query[d].defName);
  // }
  return result;
});