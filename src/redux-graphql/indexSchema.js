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
export const isListField=fieldDefinition=>{
  const type=fieldDefinition.type;
  return (type.kind==='NonNullType'?type.type.kind:type.kind)==='ListType';
}
export default memoize(schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  // const builtInDefinitions=['ID','Int','Float','String','Boolean']
  //   .map(value=>({kind:'ScalarTypeDefinition',name:{value}}));
  const builtInDefinitions=[]
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const objectDefs=Object.values(definitionsByKind.ObjectTypeDefinition);
  return {
    ...definitionsByKind,
    definitions:allDefs,
    definitionsByName:keyBy(getDefName)(allDefs),
    objectFieldMeta:Object.values(definitionsByKind.ObjectTypeDefinition).reduce((acc,d)=>{
      const dName=getDefName(d);
      const m=acc[dName]={scalarNames:{},collectionNames:{},collectionKeysCount:0,scalarKeysCount:0,isListType:{},idKey:undefined};
      for (const f of d.fields){
        const [fName,fTypeName]=[getDefName(f),getFieldTypeName(f)];
        if (fTypeName==='ID') m.idKey=fName;
        m.isListType[fName]=isListField(f);
        if  (fTypeName in definitionsByKind.ObjectTypeDefinition) {
          m.collectionNames[fName]=fTypeName;
          ++m.collectionKeysCount;
        } else {
          ++m.scalarKeysCount;
          m.scalarNames[fName]=fTypeName;
        }
      }
      return acc;
    },{})
  }
});