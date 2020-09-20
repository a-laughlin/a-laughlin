import {keyBy,ensureArray,ensurePropIsObject,memoize, transToObject} from '@a-laughlin/fp-utils';

export const getDefName=schemaDefinition=>schemaDefinition.name.value;
export const getDefKind=schemaDefinition=>schemaDefinition.kind;
export const getDefFields=schemaDefinition=>schemaDefinition.fields??[];

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

export default memoize(schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  const builtInDefinitions=['ID','Int','Float','String','Boolean']
    .map(value=>({kind:'ScalarTypeDefinition',name:{kind:'Name',value}}));
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const definitionsByName=keyBy(getDefName)(allDefs);
  
  const result = {
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
          defineHiddenProp(fMeta,'fieldKindName',fDefName);
          defineHiddenProp(fMeta,'isList',isList);
          defineHiddenProp(fMeta,'isNonNull',isNonNull);
          defineHiddenProp(fMeta,'isNonNullList',isNonNullList);
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
  Object.keys(definitionsByKind.ObjectTypeDefinition).forEach(dName=>{
    Object.values(result.selectionMeta[dName]).forEach(fMeta=>{
      assignAllProps(fMeta,result.selectionMeta[fMeta.fieldKindName]);
    });
  });
  // create a custom "Query" index of all types, so defining one manually is unnecessary
  // namespaced as _query to prevent conflicts with Query should one be defined
  result.selectionMeta._query = {};
  defineHiddenProp(result.selectionMeta._query,'defName','_query');
  defineHiddenProp(result.selectionMeta._query,'defKind','object');
  // defineHiddenProp(result.selectionMeta._query,'objectFields',[]);
  // defineHiddenProp(result.selectionMeta._query,'fieldName','_query');
  // defineHiddenProp(result.selectionMeta._query,'fieldKindName','_query');
  // defineHiddenProp(result.selectionMeta._query,'idKey','_query');
  Object.entries(result.selectionMeta).forEach(([defName,meta])=>{
    const fMeta = result.selectionMeta._query[defName] = {};
    assignAllProps(fMeta,meta);
    if(meta.defKind==='object') {
      defineHiddenProp(fMeta,'isList',true);
      defineHiddenProp(fMeta,'isNonNull',true);
      defineHiddenProp(fMeta,'isNonNullList',true);
      defineHiddenProp(fMeta,'fieldName',defName);
      defineHiddenProp(fMeta,'fieldKindName','object');
      // result.selectionMeta._query.objectFields.push(fMeta);
    }
  });

  return result;
});
