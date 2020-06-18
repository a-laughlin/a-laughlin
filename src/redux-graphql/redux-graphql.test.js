// /*eslint-disable no-unused-vars */
// /* globals jest:false,describe:false,it:false,expect:false */
import gql from 'graphql-tag';
import keyBy from 'lodash/fp/keyBy';
import omit from 'lodash/fp/omit';

import {
  schemaToQueryReducerMap,
  getStateDenormalizingMemoizedQuery,
} from './redux-graphql';

const schema = gql`
type User {
  id:ID
  name:String
  primaryHobby:Hobby
  hobbies:[Hobby]
}
type Hobby {
  id:ID
  name:String
  users:[User]
}

type Query{
  READ_USER(id: ID): User # returns state.Users[id]
  READ_USERS(predicate: Predicate): [User!]! # returns state.Users
}
type Mutation{
  CREATE_USERS(users:[User!]!): [User]!
  CREATE_USER(user:User!): User!
  UPDATE_USERS(users:[User!]!): [User]!
  UPDATE_USER(user:User!): User!
  DELETE_USERS(ids:[ID!]!): Boolean!
  DELETE_USER(id:ID!): Boolean!
}
`;



describe("schemaToQueryReducerMap", () => {
  it("should generate a key for each type,plus scalars",()=>{
    const schema = gql`
    type User {
      id:ID
      name:String
      primaryHobby:Hobby
      hobbies:[Hobby]
    }
    type Hobby {
      id:ID
      name:String
      users:[User]
    }
    `;
    expect(Object.keys(schemaToQueryReducerMap(schema)).sort())
    .toEqual( [ 'User', 'Hobby' ].sort());
  });
  it("should read values as default",()=>{
    const schema=gql`
      type A{id:ID,name:String}
    `
    const state={
      A:{ a:{id:'a',name:'A'}, b:{id:'b',name:'B'} },
      B:{ aa:{id:'aa',name:'AA'}, bb:{id:'bb',name:'BB'} }
    };
    const r = schemaToQueryReducerMap(schema);
    expect(r.A(state.A)).toBe(state.A);
  });
  it("should not read values not defined on the schema",()=>{
    const schema=gql(`type A{id:ID,name:String}`);
    expect(schemaToQueryReducerMap(schema).B).toBeUndefined();;
  });
  it("should enable deletions from a collection",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `
    const state={
      Person:{
        a:{id:'a',best:'b',friends:['b','c']},
        b:{id:'b',best:'a',friends:['a'],pets:[]},
        c:{id:'c',best:'a',friends:['a'],pets:[]},
      },
    };
    const reducer = schemaToQueryReducerMap(schema).Person;
    const result = reducer(state.Person,{type:'SUBTRACT_PERSON',payload:{c:{id:'c'}}});
    expect(result).not.toBe(state.Person);
    expect(result.a).toBe(state.Person.a);
    expect(result.b).toBe(state.Person.b);
    expect(result).toEqual(omit(['c'],state.Person));
  });
  it("should return the original if nothing to delete",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `;
    const state={
      Person:{
        a:{id:'a',best:'b',friends:['b','c']},
        b:{id:'b',best:'a',friends:['a'],pets:[]},
        c:{id:'c',best:'a',friends:['a'],pets:[]},
      },
    };
    const reducer = schemaToQueryReducerMap(schema).Person;
    const result = reducer(state.Person,{type:'SUBTRACT_PERSON',payload:{id:'d'}});
    expect(result).not.toBe(state.Person);
  });

  it("should enable creations|unions",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `;
    const state={Person:{
      a:{id:'a',best:'b',friends:['b','c']},
      b:{id:'b',best:'a',friends:['a'],pets:[]},
    }};
    const c={id:'c',best:'a',friends:['a'],pets:[]};
    const reducer = schemaToQueryReducerMap(schema).Person;
    const result = reducer(state.Person,{type:'UNION_PERSON',payload:{c}});
    expect(result).toEqual({...state.Person,c});
    expect(result).not.toBe(state.Person);
  });

  
  
  // it("should return ids on recursively defined objects",()=>{
  //     const schema=gql`
  //       type Person{id:ID,best:Person,friends:[Person]}
  //     `
  //     const state={
  //       Person:{
  //         a:{id:'a',best:'b',friends:['b','c']},
  //         b:{id:'b',best:'a',friends:['a'],pets:[]},
  //         c:{id:'c',best:'a',friends:['a'],pets:[]},
  //       },
  //     };
  //     // const result={...state,Person:{
  //     //   ...Object.values(state.person).reduce((o,v)=>{
  //     //     o[v.id]={
  //     //       id:v.id,
  //     //       best:state.Person[v.best],
  //     //       friends:v.friends.map(id=>state.Person[id])
  //     //     };
  //     //     return o;
  //     //   },{})
  //     // }};
  //     // state.Person.a.friends=state.Person.a.friends.map(ltr=>state.Person[ltr]);
  //   const r = schemaToQueryReducerMap(schema);
  //   expect(r.Person(state.Person,{type:'DELETE_PERSONS',payload:{}})).toBe(state.Person);
  // });
  // it("should work on many to one and many to many relationships",()=>{
  //     const schema=gql`
  //       type Person{id:ID,best:Person,friends:[Person],pets:[Pet]}
  //       type Pet{id:ID,owner:Person}
  //     `
  //     const state={
  //       Person:{
  //         a:{id:'a',best:'b',friends:['b','c'],pets:['e']},
  //         b:{id:'b',best:'a',friends:['a'],pets:[]},
  //         c:{id:'c',best:'a',friends:[],pets:[]},
  //       },
  //       Pet:{
  //         e:{id:'e',owner:'a'},
  //       }
  //     };
  //     // const result={
  //     //   ...state,
  //     //   Person:{
  //     //     ...state.Person,
  //     //     a:{
  //     //       ...state.Person.a,
  //     //       best:state.Person[state.Person.a.best],
  //     //       friends:state.Person.a.friends.map(id=>state.Person[id]),
  //     //       pets:state.Person.a.pets.map(id=>state.Pet[id])
  //     //     },
  //     //     b:{...state.Person.b,best:state.Person.a},
  //     //     c:{...state.Person.c,best:state.Person.a},
  //     //   },
  //     //   Pet:{
  //     //     e:{...state.Pet.e,owner:state.Person[state.Pet.e.owner]}
  //     //   }
  //     // }
  //     // state.Person.a.friends=state.Person.a.friends.map(ltr=>state.Person[ltr]);
  //   const r = schemaToQueryReducerMap(schema);
  //   expect(r.Person(state,state.Person,{payload:{}})).toEqual(state.Person);
  // });
});
describe("queryToDenormalizedState", () => {
  it("should work on lists, like Query{Person:[Person]}",()=>{});
  it("should query collections",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `;
    const query = gql`
      {Person{id}}
    `;
    const state={
      Person:{
        a:{id:'a',best:'b',friends:['b','c']},
        b:{id:'b',best:'a',friends:['a']},
        c:{id:'c',best:'a',friends:['a']},
      },
    };
    expect(getStateDenormalizingMemoizedQuery(schema)(state,query)).toEqual({Person:{a:{id:'a'}, b:{id:'b'}, c:{id:'c'}}});
  });
  it("should query single items",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `;
    const query = gql`
      {Person(id:$id){id}}
    `;
    const state={
      Person:{
        a:{id:'a',best:'b',friends:['b','c']},
        b:{id:'b',best:'a',friends:['a']},
        c:{id:'c',best:'a',friends:['a']},
      },
    };
    
    expect(getStateDenormalizingMemoizedQuery(schema)(state,query,{id:'a'})).toEqual({Person:{a:{id:'a'}}});
  });
  it("should denormalize collections",()=>{
    const schema=gql`
      type Person{id:ID,best:Person,friends:[Person]}
    `;
    // const query = gql`
    //   {Person(id:$id){best{id}}}
    // `;
    const query = gql`
      {Person{best{id}}}
    `;
    const state={
      Person:{
        a:{id:'a',best:'b',friends:['b','c']},
        b:{id:'b',best:'a',friends:['a']},
        c:{id:'c',best:'a',friends:['a']},
      },
    };
    
    expect(getStateDenormalizingMemoizedQuery(schema)(state,query)).toEqual({
      Person:{
        a:{best:{id:'b'}},
        b:{best:{id:'a'}},
        c:{best:{id:'a'}}
      }
    });
    // expect(getStateDenormalizingMemoizedQuery(schema)(state,query,{id:'a'})).toEqual({Person:{a:{best:{id:'b'}}}});
  });
  // it("should work on basic objects",()=>{
  //   const schema=gql`
  //     type Person{id:ID,best:Person,friends:[Person]}
  //   `;
  //   const query = gql`
  //     {Person{best{id}}}
  //   `;
  //   const state={
  //     Person:{
  //       a:{id:'a',best:'b',friends:['b','c']},
  //       b:{id:'b',best:'a',friends:['a']},
  //       c:{id:'c',best:'a',friends:['a']},
  //     },
  //   };
  //   expect(getStateDenormalizingMemoizedQuery(schema)(query,{id:'a'})).toEqual({best:{id:'b'}});
  // });
});

  // it("should work on many to one and many to many relationships",()=>{
  //     const schema=gql`
  //       type Person{id:ID,best:Person,friends:[Person],pets:[Pet]}
  //       type Pet{id:ID,owner:Person}
  //     `
  //     const state={
  //       Person:{
  //         a:{id:'a',best:'b',friends:['b','c'],pets:['e']},
  //         b:{id:'b',best:'a',friends:['a'],pets:[]},
  //         c:{id:'c',best:'a',friends:[],pets:[]},
  //       },
  //       Pet:{
  //         e:{id:'e',owner:'a'},
  //       }
  //     };
  //     // const result={
  //     //   ...state,
  //     //   Person:{
  //     //     ...state.Person,
  //     //     a:{
  //     //       ...state.Person.a,
  //     //       best:state.Person[state.Person.a.best],
  //     //       friends:state.Person.a.friends.map(id=>state.Person[id]),
  //     //       pets:state.Person.a.pets.map(id=>state.Pet[id])
  //     //     },
  //     //     b:{...state.Person.b,best:state.Person.a},
  //     //     c:{...state.Person.c,best:state.Person.a},
  //     //   },
  //     //   Pet:{
  //     //     e:{...state.Pet.e,owner:state.Person[state.Pet.e.owner]}
  //     //   }
  //     // }
  //     // state.Person.a.friends=state.Person.a.friends.map(ltr=>state.Person[ltr]);
  //   const r = schemaToReducerMap(schema);
  //   expect(r.Person(state,state.Person,{payload:{}})).toEqual(state.Person);
  // });
// describe("getQueryReducer", () => {
//   it("should return the original if unchanged",()=>{
//     const prev={a:{id:'a'},b:{id:'b'}};
//     const action={payload:prev};
//     const r = schemaToReducerMap(schema);
//     expect(r.Hobby(prev,action)).toBe(prev);
//     expect(r.RecursiveHobby(prev,action)).toBe(prev);
//   });
//
//   it("should work on recursively defined objects",()=>{
//     const prev={a:{id:'a'},b:{id:'b'}};
//     const action={payload:prev};
//     const r = schemaToReducerMap(schema);
//     expect(r.RecursiveHobby(prev,action)).toBe(prev);
//   });
// });


//
//
// describe("queryTransducer", () => {
//   it("runs combiner pre-order dfs", () => {
//     const walkOrder=[];
//     const combiner=(parent,r)=>{
//       walkOrder.push([r.nameValue,r.astNode.kind]);
//       return parent;
//     };
//     const root=makeResolverArg({
//       astNode:gql`query { humans {id,foo {bar,baz}} }`
//     });
//     const result = queryTransducer(combiner)(root.parent,root);
//     expect(walkOrder)
//     .toEqual([
//       [undefined,'Document'],
//       ['query','OperationDefinition'],
//       ['humans','Field'],
//       ['id','Field'],
//       ['foo','Field'],
//       ['bar','Field'],
//       ['baz','Field'],
//     ]);
//   })
// });
//
// describe("state", () => {
//   it("reads state", () => {
//     const initialState = {
//       users:[{id:1,name:'A'},{id:2,name:'B'}]
//     };
//     const {readState} = stateTransducersFactory(initialState);
//     const root = makeResolverArg({astNode:gql`{users{id,name}}`});
//     queryTransducer(readState(x=>x))(root.parent,root);
//     // console.log(`result`, result);
//     // expect("Failing because it's an array").toBe(true);
//     expect(root.context.state).toEqual(initialState);
//     expect(root.outputArray[0]).toEqual(initialState);
//   })
// })

// describe("data", () => {
//   it("reads data", () => {
//       // readData,
//       // writeData,
//     const data = {
//       users:[{id:1,name:'A'},{id:2,name:'B'}]
//     };
//     const root = makeResolverArg({
//       astNode:gql`{users{id,name}}`,
//       data
//     });
//     queryTransducer(readData((p,r)=>{
//       r.data=parent.data[r.nameValue]||{};
//       p.context.data||(p.context.data=p.data);
//       r.context.data=p.context.data[r.nameValue]||p.context.data;
//       if (p!==r){
//         p.children||(p.children={});
//         p.children[r.nameValue]=r;
//       }
//       return p;
//     }))(root.parent,root);
//     // console.log(root.context.children.query.context.children.users.context);
//     // console.log(`root.children.query.context.data`, root.children.query.context.data);
//     // expect("Failing because it's an array").toBe(true);
//     // expect(root.context.children.query.context.data).toEqual(data);
//   })
// })
// describe("resolveQueryFactory", () => {
//   it("resolves a query", () => {
//     const initialState = {
//       users:{
//         a:{
//           b:[{id:1,name:'A'},{id:2,name:'B'}]
//         }
//       }
//     };
//     function childrenCombiner(p,r){
//       p.children||(p.children={});
//       if (r.nameValue!==undefined){
//         p.children[r.nameValue]=r;
//       }
//       console.log(`p`, p);
//       return p;
//     }
//     // const {readState} = stateTransducersFactory(initialState);
//     const resolverMap = {
//       query:{
//         users:{
//           a:{
//             b:readData(childrenCombiner)
//           }
//         }
//       }
//     }
//     const root = makeResolverArg({
//       astNode:gql`{users{id,name}}`,
//       data:{users:{a:{b:initialState.users.a.b}}}
//     });
//     resolveQueryFactory(resolverMap)(root.parent,root);
//     console.log(`root.children`, root.children);
//     // expect("Failing because it's an array").toBe(true);
//     expect(root.children.query.children.users.children.a).toEqual(initialState.users.a.b);
//   });
// });

//
// const schema = gql`
//   enum Episode { NEW_HOPE, EMPIRE, JEDI }
//
//   interface Character {
//     id: String!
//     name: String
//     friends: [Character]
//     appearsIn: [Episode]
//   }
//   type Human implements Character {
//     id: String!
//     name: String
//     friends: [Character]
//     appearsIn: [Episode]
//     homePlanet: String
//   }
//   type Droid implements Character {
//     id: String!
//     name: String
//     friends: [Character]
//     appearsIn: [Episode]
//     primaryFunction: String
//   }
//   type Query {
//     hero(episode: Episode): Character
//     human(id: String!): Human
//     droid(id: String!): Droid
//   }
// `;
//
//
// const initialState = {
//   humans:{
//     '1000': {
//       type: 'Human',
//       id: '1000',
//       name: 'Luke Skywalker',
//       friends: ['1002', '1003', '2000', '2001'],
//       appearsIn: [4, 5, 6],
//       homePlanet: 'Tatooine',
//     },
//     '1001': {
//       type: 'Human',
//       id: '1001',
//       name: 'Darth Vader',
//       friends: ['1004'],
//       appearsIn: [4, 5, 6],
//       homePlanet: 'Tatooine',
//     },
//     '1002': {
//       type: 'Human',
//       id: '1002',
//       name: 'Han Solo',
//       friends: ['1000', '1003', '2001'],
//       appearsIn: [4, 5, 6],
//     },
//     '1003': {
//       type: 'Human',
//       id: '1003',
//       name: 'Leia Organa',
//       friends: ['1000', '1002', '2000', '2001'],
//       appearsIn: [4, 5, 6],
//       homePlanet: 'Alderaan',
//     },
//     '1004': {
//       type: 'Human',
//       id: '1004',
//       name: 'Wilhuff Tarkin',
//       friends: ['1001'],
//       appearsIn: [4],
//     },
//   },
//   droids:  {
//     '2000': {
//       type: 'Droid',
//       id: '2000',
//       name: 'C-3PO',
//       friends: ['1000', '1002', '1003', '2001'],
//       appearsIn: [4, 5, 6],
//       primaryFunction: 'Protocol',
//     },
//     '2001': {
//       type: 'Droid',
//       id: '2001',
//       name: 'R2-D2',
//       friends: ['1000', '1002', '1003'],
//       appearsIn: [4, 5, 6],
//       primaryFunction: 'Astromech',
//     },
//   }
// };
// const {readState}=stateTransducersFactory(initialState);
// describe("readResolverFactory", () => {
//   it("gets Correct resolver", () => {
//     expect(
//       queryResolverMap(gql`query { humans }`,{query:{
//         humans:{O:readState}
//       }})
//       .children.query.children.humans.writes.resolver
//     )
//     .toEqual(readState);
//   })
// });
// const queryResolverMap = (astNode,rMap)=>{
//   const reducer = queryTransducer(compose(
//     readResolverFactory(rMap),
//     readResolverOutput,
//   )(identity));
//   return reducer(
//     makeResolverArg({astNode}),
//     astNode
//   );
// }
// describe("readResolverFactory + readResolverOutput", () => {
//   it("gets Correct resolver output", () => {
//     expect(
//       queryResolverMap(gql`query { humans }`,{query:{
//         humans:{O:next=>ra=>'foo'}
//       }})
//       .children.query.children.humans.writes.resolverOutput
//     )
//     .toEqual('foo');
//   })
//   // initialState.humans
// })
// // describe("lenses", () => {
// //   it("reads state", () => {
// //     const def = gql`query { humans }`.definitions[0];
// //     const field = def.selectionSet.selections[0];
// //     // console.log('astNode',astNode);
// //     const parent = readState(identity)(makeResolverArg({astNode:def}));
// //     expect(parent.writes.state).toBe(initialState);
// //     const result = readState(identity)(makeResolverArg({astNode:field,parent}));
// //     expect(result.writes.state)
// //     .toEqual(initialState.humans);
// //   })
// // })
// // describe("transduceQuery", () => {
// //   // make a
// //   // review dad's sleep app
// //   // it("transduces a node", () => {
// //   //   const def = gql`query { humans }`.definitions[0];
// //   //   const field = def.selectionSet.selections[0];
// //   //   const parent = nodeTransducer(identity)(makeResolverArg({astNode:def}));
// //   //   expect(nodeTransducer(identity)(makeResolverArg({astNode:field,parent})).parent.data)
// //   //   .toEqual({humans:initialState.humans});
// //   // })
// //   it("transduces a query", () => {
// //     const def = gql`query { humans }`.definitions[0];
// //     expect(queryTransducer(identity)(makeResolverArg({astNode:def})).writes.data)
// //     .toEqual({humans:initialState.humans});
// //     expect(queryTransducer(identity)(makeResolverArg({astNode:def})).data)
// //     .toEqual({humans:initialState.humans});
// //   })
// //   it("transduces a nested query", () => {
// //     const def = gql`query { humans {id} }`.definitions[0];
// //     expect(queryTransducer(identity)(makeResolverArg({astNode:def})).root.data)
// //     .toEqual({humans:tdToSame(tdMap(h=>h.id))(initialState.humans)});
// //   })
// //   // it("transduceRecursiveWithArg", () => {
// //   //   const appendArrayReducer = (acc,v)=>{acc[acc.length]=v;return acc;}
// //   //   const appendObjectReducer = (acc,v,k)=>{acc[k]=v;return acc;}
// //   //   const tdToArray = transducer=>collection=>transduce([], appendArrayReducer, transducer, collection);
// //   //   const tdToObject = transducer=>collection=>transduce(({}), appendObjectReducer, transducer, collection);
// //   //   const transduceRecursiveWithArg = (transducer,acc={},collection)=>{
// //   //     return transduce(acc,
// //   //       (acc,v,k,c)=>{
// //   //         return typeof acc!=='object'
// //   //           ? acc
// //   //           : Array.isArray(acc)
// //   //             ? appendArrayReducer(acc,typeof v!=='object'
// //   //               ? v
// //   //               : Array.isArray(v)
// //   //                 ? transduceRecursiveWithArg(transducer,[],v)
// //   //                 : transduceRecursiveWithArg(transducer,{},v))
// //   //             : appendObjectReducer(acc,typeof v!=='object'
// //   //               ? v
// //   //               : Array.isArray(v)
// //   //                 ? transduceRecursiveWithArg(transducer,[],v)
// //   //                 : transduceRecursiveWithArg(transducer,{},v));
// //   //       },
// //   //       transducer,
// //   //       collection
// //   //     );
// //   //   };
// //   //   const expandArray = tdMap((v,k,c)=>Array.isArray(v) ? [1,2,3] : v);
// //   //   const bOmitter = tdFilter((v,k)=>k!=='b');
// //   //   const addEf1=tdTrans((a,v,k,c)=>{
// //   //     if (k==='a')a.e={f:1};
// //   //   });
// //   //   const mapAC = compose(bOmitter,expandArray,addEf1);
// //   //   expect(transduceRecursiveWithArg(mapAC,{},{
// //   //     a:{
// //   //       c:[]
// //   //     },
// //   //     b:{
// //   //       d:[]
// //   //     },
// //   //   })).toEqual({
// //   //     a:{
// //   //       c:[1,2,3]
// //   //     },
// //   //     e:{
// //   //       f:1
// //   //     },
// //   //   });
// //   // });
// //   it("transduceRecursive makes a recursive correctly walks a tree", () => {
// //     const expandArray = tdMap((v,k,c)=>Array.isArray(v) ? [1,2,3] : v);
// //     const bOmitter = tdFilter((v,k)=>k!=='b');
// //     const addEf1=tdTrans((a,v,k,c)=>{
// //       if (k==='a')a.e={f:1};
// //     });
// //     const mapAC = compose(bOmitter,expandArray,addEf1);
// //     expect(transduceRecursive(mapAC)({
// //       a:{
// //         c:[]
// //       },
// //       b:{
// //         d:[]
// //       },
// //     })).toEqual({
// //       a:{
// //         c:[1,2,3]
// //       },
// //       e:{
// //         f:1
// //       },
// //     });
// //   });
// // })
//
// // const queryTransducer = compose(
// //   getResolverTransducer(resolverMap),
// //   getResolverTransducer(resolverMap),
// // )
//
// // https://blog.apollographql.com/the-anatomy-of-a-graphql-query-6dffa9e9e747
// // https://astexplorer.net/
// //
// // describe("Spec Section 3: Type System", () => {
// //   // nodes are values
// //   // edges are keys
// //   // Note: Does not do validation or any type-specific behaviors by default.
// //   // However, both the schema and query documents are subtrees of rootState, so all behaviors on them are composable.
// // });
// // describe("Spec Section 4: Introspection", () => {
// //   // Note: Does not do validation or any type-specific behaviors by default.
// //   // However, both the schema and query documents are subtrees of rootState, so all behaviors on them are composable.
// //   // 4.1 agnostic to reserved names
// //   // 4.2 agnostic to documentation
// //   // 4.3 agnostic to deprecation
// //   // 4.4 agnostic to __typename
// //   // 4.5 agnostic to implicit schema and type
// //   // 4.5.x agnostic to __TypeKind
// // });
// //
// // describe("Spec Section 5: Validation", () => {
// //   // Note: Does not do validation or any type-specific behaviors by default.
// //   // However, both the schema and query documents are subtrees of rootState, so behaviors on them are composable.
// // });
// //
// // describe("Spec Section 6: Execution", () => {
// //   // Note: Does not do validation or any type-specific behaviors by default.
// //   // However, both the schema and query documents are subtrees of rootState, so behaviors on them are composable.
// //   // test schema aware
// //   // test non-schema aware
// //   describe("6.1 Executing Requests", () => {
// //     it("ignores (but enables composing) inline fragments", () => { expect(0).toBe(1) });
// //     it("ignores (but enables composing) definition fragments", () => { expect(0).toBe(1) });
// //     it("ignores (but enables composing) nullability behaviors", () => { expect(0).toBe(1) });
// //     it("ignores (but enables composing) type validation behaviors", () => { expect(0).toBe(1) });
// //     it("ignores (but enables composing) directives behaviors (e.g., skip)", () => { expect(0).toBe(1) });
// //     it("6.1 (partial spec diff for simplicity) only executes the first operation, agnostic to name", () => { });
// //     // 6.1.1 validation composable
// //     describe("6.1.2 Coercing Variable Values", () => {
// //       it("6.1.2.3.a-i provides variable values to resolvers", () => { expect(false).toBe(true); });
// //       it("6.1.2.3.a-i provides default variable values to resolvers when value is undefined", () => { expect(false).toBe(true); });
// //     });
// //   });
// //   describe("6.2 Executing Operations", () => {
// //     describe("6.2.1 Query + 6.2.2 Mutation + 6.2.3 Subscription", () => {
// //       // Much spec overlap for 6.2.1-3. Combining.
// //       // TODO distinguish spec sections from tree specific behaviors
// //       // it("6.2.1 Queries can execute in parallel", () => {}); // unsure what to do with this
// //       // it("6.2.1.4 Accepts an initial value", () => {expect(0).toBe(1)}); via initialState
// //       describe("Input Operation", () => {
// //         it("Executes only resolverMap.query.<name>.I on query.<name>", () => {
// //           const resolveNode = getResolverMapTransducer({query:{name:}})
// //           expect(0).toBe(1)
// //         });
// //         it("Executes only resolverMap.mutation.<name>.I on mutation.<name>", () => { expect(0).toBe(1) });
// //         it("Executes only resolverMap.subscription.<name>.I on subscription.<name>", () => { expect(0).toBe(1) });
// //         it("Enables transforming query subtree", () => { expect(0).toBe(1) });
// //         it("Enables transforming query subtree", () => { expect(0).toBe(1) });
// //         it("Prevents mutable query transforms", () => { expect(0).toBe(1) });
// //         it("Enables merging subtrees (e.g., state, variables) to query", () => { expect(0).toBe(1) });
// //         it("Enables merging subtrees (e.g., state, typeDefs) to variables", () => { expect(0).toBe(1) });
// //         it("Enables respondBlank", () => { expect(0).toBe(1) });
// //         it("Enables preventForward", () => { expect(0).toBe(1) });
// //         it("Enables preventForward + respondBlank (i.e., OperationResult with data==={})", () => { expect(0).toBe(1) });
// //         it("On js error in ANY of n resolvers, preventForward + respond({data:{},error:CombinedErrorShape(errors)})", () => { expect(0).toBe(1) });
// //       });
// //       describe("Output OperationResult", () => {
// //         it("Applies resolvers to the correct level of nested fields", () => {
// //           expect(0).toBe(1)
// //         });
// //         it("Applies resolvers only to the intersection of shallower queries", () => {
// //           expect(0).toBe(1)
// //         });
// //         it("On error in response, still runs resolvers (different behavior composable in resolvers)", () => { expect(0).toBe(1) });
// //         it("On js error in resolvers, adds error to result.error", () => { expect(0).toBe(1) });
// //         it("Executes only resolverMap.query.<name>.O on query.<name>", () => { expect(0).toBe(1) });
// //         it("Executes only resolverMap.mutation.<name>.O on mutation.<name>", () => { expect(0).toBe(1) });
// //         it("Executes only resolverMap.subscription.<name>.O on subscription.<name>", () => { expect(0).toBe(1) });
// //         it("Provides the correct variables for nested fields", () => { expect(0).toBe(1) });
// //         it("Enables mutable subtree transforms (e.g., state)", () => { expect(0).toBe(1) });
// //         it("Enables immutable subtree transforms (e.g., data)", () => { expect(0).toBe(1) });
// //         it("Enables mutable and immutable subtree transforms (e.g., data)", () => { expect(0).toBe(1) });
// //         it("Enables mutable and immutable subtree transforms (e.g., data)", () => { expect(0).toBe(1) });
// //         it("Enables writing to multiple subtrees (e.g., data+state)", () => { expect(0).toBe(1) });
// //         it("Enables merging different shaped subtrees (e.g., state, variables)", () => { expect(0).toBe(1) });
// //         it("Enables merging subtrees (e.g., state+data+variables) to data", () => { expect(0).toBe(1) });
// //         it("Enables merging partial subtrees without modifiying higher tree", () => { expect(0).toBe(1) });
// //         it("Agnostic to object and array collections for other UI lib interaction", () => { expect(0).toBe(1) });
// //         it("Supports composed behaviors on array and object collections", () => { expect(0).toBe(1) });
// //         it("Enables returning a stream for local subscriptions", () => { expect(0).toBe(1) });
// //         it("Enables unsubscribing from a local subscription stream", () => { expect(0).toBe(1) });
// //         it("Enables unsubscribing from a local subscription stream", () => { expect(0).toBe(1) });
// //       })
// //
// //       it("6.2.3.1 Source Stream + 6.2.3.2 Response Stream", () => { });
// //       // TODO I don't think these apply.  Re-read.
// //
// //     });
// //
// //   });
// //   describe("6.3 Executing Selection Sets", () => {
// //     it("6.2.3.1 Source Stream + 6.2.3.2 Response Stream", () => { });
// //     // TODO I don't think these apply.  Re-read.
// //   });
// //   // it
// //   describe("6.4 Executing Fields", () => {
// //     // it("successfully prevents forwarding", () => { });
// //     // it("successfully generates a response", () => { });
// //     //
// //     // it("executes transforms sequentially from left to right", () => {
// //     //   // [a,b]
// //     // });
// //     // it("executes nested transforms sequentially", () => {
// //     //
// //     // });
// //   });
// // });
// //
// // describe("Spec Section 7: Response", () => {
// //   // ignoring types, ignoring validation
// //   describe("7.1 Response Format", () => {
// //
// //   });
// //   describe("7.2 Serialization Format", () => {
// //
// //   });
// // });
//
//
//
// // key insights
// // {
// //  All that changes is subtree location, topology, contents
// //  given a tree, subtree location only requires a path.
// //   // Resolver resolution is about transformation location and precedence.
// //   state:{},
// //   op:{result:{operation:{query:'abstract syntax tree'}}}}
// // }
// // every possible data change is a transformation on this tree.
// // if you remove the consideration of how to read and write to different parts of the tree, and operation ordering, all that's left
// // to complete any operation is input path, transform function, and output path
// // This exchange's api is simple, performant.  The tradeoff is thinking differently.
// // graphql
// // stateOp object
// // conceptually, everything is a tree transform.
// // at the risk of oversimplifying,
// // 1. a triggering query: e.g., gql`query { todos { id } }`
// // 1. What parts of the tree to transform
// // 2. How to read and write those parts
// // 3. What transform to do
//
// // Input paths.Output paths, and how to transform that part of the tree
//
//
// // beforeEach(() => {
// //
// //   // Collect all forwarded operations
// //
// //   // exchangeArgs = { forward, subject: {} as Client };
// //   // exchange = localStateExchange(exchangeConfig)(exchangeArgs)(ops$);
// // });
//
// // it('forwards non-matching operations unchanged', async () => { });
// // dump state
// // set initial local state
// // set request handlers matching schema shape
// // set response handlers matching schema shape
// // forward operations where operation.operationName matches no handlers
// // custom: enable user-defined operations
// // teardown: tear down
// // query+mutation+subscription
// // map operation to handlers
// // forward operation where operation.query matches no handlers
// // (filter|omit|custom) operation.query properties
// // (get|set|filter|omit|merge|custom) local state properties
// // (get|set|filter|omit|merge|custom) operation[context|variables] properties
// // (get|set|filter|omit|merge|custom) local state properties to operation[context|variables] properties
// // (get|set|filter|omit|merge|custom) operation[context|variables] properties to local state properties
// // request forward (the default)
// // preventForward (like event.preventDefault())
// // generate blank data response (to populate in response section)
// // emit blank data response (before forward | after forward | after preventForward)
// // conditionally do any of the above
// // enable async handlers for cases like [localState(sync), cache, localState(async), fetch]
// // enable custom user-defined behaviors
// //
// //
// // Response
// //
// // return operations where operation.operationName matches no handlers
// // custom: enable user-defined operations
// // teardown: tear down
// // query+mutation+subscription
// // map operationResult to handlers
// // return operation where operation.query matches no handlers
// // (get|set|filter|omit|merge|custom) local state properties
// // (get|set|filter|omit|merge|custom) operationResult[data|context] properties
// // (get|set|filter|omit|merge|custom) local state properties to operationResult[data|context] properties
// // (get|set|filter|omit|merge|custom) operationResult[data|context] properties to local state properties
// // map response to [1-n] custom responses
// // preventResponse
// // conditionally do any of the above
// // enable async handlers for cases like [localState(sync), cache, localState(async), fetch]
// // enable custom user-defined behaviors
