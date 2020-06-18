import {frozenEmptyArray, ensureArray,ensurePropIsObject} from '@a-laughlin/fp-utils';
import keyBy from 'lodash/fp/keyBy';
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
export default schema=>{
  const definitions=ensureArray(schema.definitions).filter(d=>/^(Query|Mutation|Subscription)$/.test(d.name.value)===false);
  const builtInDefinitions=['ID','Int','Float','String','Boolean']
    .map(value=>({kind:'ScalarTypeDefinition',name:{value}}));
  const allDefs=builtInDefinitions.concat(definitions);
  const definitionsByKind=allDefs.reduce((acc,d)=>{ensurePropIsObject(acc,d.kind)[d.kind][d.name.value]=d;return acc},{});
  const objectDefs=Object.values(definitionsByKind.ObjectTypeDefinition);
  return {
    ...definitionsByKind,
    definitions:allDefs,
    definitionsByName:keyBy(getDefName,allDefs),
    objectFieldMeta:Object.values(definitionsByKind.ObjectTypeDefinition).reduce((acc,d)=>{
      const dName=getDefName(d);
      const m=acc[dName]={collectionTypes:{},collectionNames:{},isListType:{},idKey:undefined};
      for (const f of d.fields){
        const [fName,fTypeName]=[getDefName(f),getFieldTypeName(f)];
        if (fTypeName==='ID') m.idKey=fName;
        m.isListType[fName]=isListField(f);
        if  (fTypeName in definitionsByKind.ObjectTypeDefinition) {
          m.collectionTypes[fName]=fTypeName;
          m.collectionNames[fName]=`${fTypeName}`;
        }
      }
      return acc;
    },{})
  }
};