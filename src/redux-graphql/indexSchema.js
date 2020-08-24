import {keyBy,frozenEmptyArray, ensureArray,ensurePropIsObject,memoize} from '@a-laughlin/fp-utils';

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
export default memoize(schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  // const builtInDefinitions=['ID','Int','Float','String','Boolean']
  //   .map(value=>({kind:'ScalarTypeDefinition',name:{value}}));
  const builtInDefinitions=[]
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const objectDefs=Object.values(definitionsByKind.ObjectTypeDefinition);
  const result = {
    ...definitionsByKind,
    definitions:allDefs,
    definitionsByName:keyBy(getDefName)(allDefs),
    objectFieldMeta:Object.values(definitionsByKind.ObjectTypeDefinition).reduce((acc,d)=>{
      const dName=getDefName(d);
      const m=acc[dName]={};
      Object.defineProperty(m,'_collName',{value:dName,enumerable:false,writable:false,configurable:false});
      // Object.defineProperty(m,'_scalarTypes',{enumerable:false,writable:false,configurable:false});
      // Object.defineProperty(m,'_objectTypes',{enumerable:false,writable:false,configurable:false});
      for (const f of d.fields){
        const [fName,typeName,{isList,isNonNull,isNonNullList}]=[getDefName(f),getFieldTypeName(f),getFieldMeta(f)];
        if (m._idKey===undefined && typeName==='ID') Object.defineProperty(m,'_idKey',{value:fName,enumerable:false,writable:false,configurable:false});
        m[fName]={
          name:fName,
          type:typeName,
          isList,
          isNonNull,
          isNonNullList,
          isObjectType:typeName in definitionsByKind.ObjectTypeDefinition,
          isScalarType:!(typeName in definitionsByKind.ObjectTypeDefinition),
          // isScalarType:typeName in definitionsByKind.ScalarTypeDefinition, // look into why this can be true
          rel:{},
        };
      }
      return acc;
    },{})
  };
  // cross_link
  for (const dName in result.objectFieldMeta){
    const m=result.objectFieldMeta[dName];
    for (const fName in result.objectFieldMeta[dName]){
      const fMeta=m[fName];
      if(fMeta.isObjectType){
        fMeta.rel=result.objectFieldMeta[fMeta.type];
      }
    }
  }
  return result;
});