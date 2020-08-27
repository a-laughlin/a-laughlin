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
export default memoize(schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  // const builtInDefinitions=['ID','Int','Float','String','Boolean']
  //   .map(value=>({kind:'ScalarTypeDefinition',name:{value}}));
  const builtInDefinitions=[]
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const definitionsByName=keyBy(getDefName)(allDefs);
  const result = {
    ...definitionsByKind,
    definitions:allDefs,
    definitionsByName,
    selectionMeta:transToObject((acc,d,dName)=>{
      const meta=acc[dName]={};
      Object.defineProperty(meta,'defName',{value:dName,enumerable:false,writable:false,configurable:false});
      Object.defineProperty(meta,'defKind',{
        value:dName in definitionsByKind.ObjectTypeDefinition?'object':'scalar',
        enumerable:false,
        writable:false,
        configurable:false
      });
      if (dName in definitionsByKind.ObjectTypeDefinition){
        Object.defineProperty(meta,'objectFields',{
          value:[],
          enumerable:false,
          writable:false,
          configurable:false
        });
        // Object.defineProperty(m,'_scalarTypes',{enumerable:false,writable:false,configurable:false});
        // Object.defineProperty(m,'_objectTypes',{enumerable:false,writable:false,configurable:false});
        for (const f of d.fields){
          const [fName,typeName,{isList,isNonNull,isNonNullList}]=[getDefName(f),getFieldTypeName(f),getFieldMeta(f)];
          if (meta._idKey===undefined && typeName==='ID') Object.defineProperty(meta,'_idKey',{value:fName,enumerable:false,writable:false,configurable:false});
          meta[fName]={
            name:fName,
            isList,
            isNonNull,
            isNonNullList,
            defKind:typeName in definitionsByKind.ObjectTypeDefinition?'object':'scalar',
            rel:typeName,
          };
          if(typeName in definitionsByKind.ObjectTypeDefinition){
            meta.objectFields.push(meta[fName]);
          }
        }
      }
    })(definitionsByName)
  };
  // cross_link
  for (const dName in definitionsByKind.ObjectTypeDefinition){
    const oMeta=result.selectionMeta[dName];
    for (const fName in oMeta){
      const fMeta=oMeta[fName];
      // if a definition exists with this type (if not, it's a built in scalar type)
      if (fMeta.rel in result.selectionMeta) {
        fMeta.rel=result.selectionMeta[fMeta.rel];
      }
    }
  }
  return result;
});