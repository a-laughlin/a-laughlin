// /* eslint-disable no-unused-vars */
// /* globals jest:false,describe:false,it:false,expect:false */
import gql from 'graphql-tag';
import { renderHook, act } from '@testing-library/react-hooks'
import { useState,useEffect } from 'react';
import {createStore,combineReducers} from 'redux';
import {
  schemaToStateOpsMapper,
  getMemoizedObjectQuerier
} from './redux-graphql';
// import configureStore from 'redux-mock-store';


const dedent = str=>str.split('\n').map(s=>s.trim()).join('\n');

describe("schemaToStateOpsMapper", () => {
  let state;
  let schema=gql(dedent(`
    type Person{id:ID,name:String,best:Person,otherbest:Person,nicknames:[String],friends:[Person],pet:Pet}
    type Pet{id:ID,name:String}
    scalar SomeScalar
  `));
  let reducerMap = schemaToStateOpsMapper(schema)();
  
  beforeEach(()=>{
    state={
      SomeScalar:1,
      SomeThingNotInSchema:1,
      Person:{
        a:{id:'a',name:'A',best:'b',otherbest:'c',nicknames:["AA","AAA"],friends:['b','c'],pet:'x'},
        b:{id:'b',name:'B',best:'a',friends:['a']},
        c:{id:'c',name:'C',best:'a',friends:['a']},
      },
      Pet:{
        x:{id:'x',name:'X'},
        y:{id:'y',name:'Y'},
      },
    };
  });
  afterAll(()=>{
    schema=state=reducerMap=null;
  });
  it("should generate keys for each type ,plus scalars",()=>{
    expect(Object.keys(reducerMap).sort())
    .toEqual(['Person','Pet','SomeScalar']);
  });
  it("should read values as default",()=>{
    expect(reducerMap.Person(state.Person))
    .toBe(state.Person);
  });
  it("should get scalar values",()=>{
    expect(reducerMap.SomeScalar(state.SomeScalar)).toBe(1);
  });
  it("should set scalar values",()=>{
    expect(reducerMap.SomeScalar(state.SomeScalar,{type:'SET_SOMESCALAR',payload:2})).toBe(2);
  });
  it("should enable deletions from a collection",()=>{
    const result = reducerMap.Person(state.Person,{type:'SUBTRACT_PERSON',payload:{c:{id:'c'}}});
    expect(result).not.toBe(state.Person);
    expect(result.a).toBe(state.Person.a);
    expect(result.b).toBe(state.Person.b);
    const expected = {...state.Person};
    delete expected.c;
    expect(result).toEqual(expected);
  });
  it("should return the original if nothing to delete",()=>{
    expect(reducerMap.Person(state.Person,{type:'SUBTRACT_PERSON',payload:{d:{id:'d'}}}))
    .toBe(state.Person);
  });

  it("should enable creations|unions",()=>{
    const c={id:'c',best:'a',friends:['a']};
    const result = reducerMap.Person(state.Person,{type:'UNION_PERSON',payload:{c}});
    expect(result).toEqual({...state.Person,c});
    expect(result).not.toBe(state.Person);
  });
});

describe("getMemoizedObjectQuerier", () => {
  let schema,state,querier;
  beforeAll(()=>{
    schema=gql`
      type Person{id:ID,name:String,best:Person,otherbest:Person,nicknames:[String],friends:[Person],pet:Pet}
      type Pet{id:ID,name:String}
      scalar SomeScalar
    `;
    querier = getMemoizedObjectQuerier(schema);
  });
  beforeEach(()=>{
    state={
      SomeScalar:1,
      Person:{
        a:{id:'a',name:'A',best:'b',otherbest:'c',nicknames:["AA","AAA"],friends:['b','c'],pet:'x'},
        b:{id:'b',name:'B',best:'a',friends:['a']},
        c:{id:'c',name:'C',best:'a',friends:['a']},
      },
      Pet:{
        x:{id:'x',name:'X'},
        y:{id:'y',name:'Y'},
      },
    };
  });
  afterAll(()=>{
    schema=state=querier=null;
  });
  it("should query collections",()=>{
    const query=gql(`{Person{id}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q));
    expect(result1).toEqual({Person:{a:{id:'a'}, b:{id:'b'}, c:{id:'c'}}});
    expect(result1).toBe(result2);
  });
  it("should denormalize item subsets with variables",()=>{
    const query = gql(`{Person(id:$id){best{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q,{id:'a'}))
    expect(result1).toEqual({Person:{a:{best:{id:'b'}}}});
    expect(result2).toBe(result1);
  });
  it("should denormalize item subsets with default variables",()=>{
    const query = gql(`query getPerson($id: ID = "a"){Person(id:$id){best{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q));
    expect(result1).toEqual({Person:{a:{best:{id:'b'}}}});
    expect(result2).toBe(result1);
  });
  it("should denormalize item subsets with constants",()=>{
    const query = gql(`{Person(id:"a"){best{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{best:{id:'b'}}}});
    expect(result2).toBe(result1);
  });

  it("should query multiple scalar props",()=>{
    const query = gql(`{Person(id:$id){id,name}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q,{id:'a'}))
    expect(result1).toEqual({Person:{a:{id:'a',name:'A'}}});
    expect(result2).toBe(result1);
  });
  it("should query a scalar and object prop",()=>{
    const query = gql(`{Person(id:$id){id,best{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q,{id:'a'}))
    expect(result1).toEqual({Person:{a:{id:'a',best:{id:'b'}}}});
    expect(result2).toBe(result1);
  });
  it("should query multiple object props",()=>{
    const query = gql(`{Person(id:"a"){best{id},otherbest{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{best:{id:'b'},otherbest:{id:'c'}}}});
    expect(result2).toBe(result1);
  });
  it("should behave the same with (filter:{...}) and (...)",()=>{
    let query = gql(`{Person(id:"a") {best{id},otherbest{id}}}`);
    let [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{best:{id:'b'},otherbest:{id:'c'}}}});
    expect(result2).toBe(result1);
    query = gql(`{Person(filter: {id:"a"} ) {best{id},otherbest{id}}}`);
    let [result3,result4]=[query,query].map(q=>querier(state,q))
    expect(result3).toEqual(result1);
    expect(result3).not.toBe(result1);
    expect(result4).toBe(result3);
  });
  it("should accept filter functions as variables",()=>{
    let query = gql(`{Person(filter:$filter) {best{id},otherbest{id}}}`);
    let [result1,result2]=[query,query].map(q=>querier(state,q,{filter:x=>x.id==="a"}))
    expect(result1).toEqual({Person:{a:{best:{id:'b'},otherbest:{id:'c'}}}});
    expect(result2).toBe(result1);
  });
  it("should accept omit functions as variables",()=>{
    let query = gql(`{Person(omit:$fn) {best{id},otherbest{id}}}`);
    let [result1,result2]=[query,query].map(q=>querier(state,q,{fn:x=>x.id!=="a"}))
    expect(result1).toEqual({Person:{a:{best:{id:'b'},otherbest:{id:'c'}}}});
    expect(result2).toBe(result1);
  });
  it("should accept variables named differently than the key",()=>{
    let query = gql(`{Person(id:$xyz) {best{id},otherbest{id}}}`);
    let [result1,result2]=[query,query].map(q=>querier(state,q,{xyz:"a"}));
    expect(result1).toEqual({Person:{a:{best:{id:'b'},otherbest:{id:'c'}}}});
    expect(result2).toBe(result1);
  });
  it("should query objects deeply",()=>{
    const query = gql(`{Person(id:"a"){best{best{best{best{best{best{best{best{best{best{id}}}}}}}}}}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{best:{best:{best:{best:{best:{best:{best:{best:{best:{best:{id:'a'}}}}}}}}}}}}});
    expect(result2).toBe(result1);
  });
  it("should query other types",()=>{
    const query = gql(`{Person(id:"a"){pet{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{pet:{id:'x'}}}});
    expect(result2).toBe(result1);
  });
  it("should query scalars",()=>{
    const query = gql(`{SomeScalar}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({SomeScalar:1});
    expect(result2).toBe(result1);
  });
  it("should query scalar lists",()=>{
    const query = gql(`{Person(id:"a"){nicknames}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{nicknames:["AA","AAA"]}}});
    expect(result2).toBe(result1);
  });
  it("should query object lists",()=>{
    const query = gql(`{Person(id:"a"){friends{id}}}`);
    const [result1,result2]=[query,query].map(q=>querier(state,q))
    expect(result1).toEqual({Person:{a:{friends:{b:{id:'b'},c:{id:'c'}}}}});
    expect(result2).toBe(result1);
  });
});

// instead of useMutation, use a built in reducer, or add one
const getUseQuery=(store,querier)=>{
  return (query,variables)=>{
    const [state,setState] = useState(querier(store.getState(),query,variables));
    useEffect(()=>store.subscribe(()=> { // returns the unsubscribe function
      const result = querier(store.getState(),query,variables);
      if (result!==state) setState({...state,...result});
    }),[]);
    return state;
  }
}

describe("getUseQuery: integration test React.useState,redux.combineReducers(schemaReducerMap),getMemoizedObjectQuerier(schema)",()=>{
  let store,useQuery,querier,reducerMap;
  
  beforeAll(()=>{
    const schema = gql`
      type Person{id:ID,name:String,best:Person,otherbest:Person,nicknames:[String],friends:[Person],pet:Pet}
      type Pet{id:ID,name:String}
      scalar SomeScalar
    `
    querier = getMemoizedObjectQuerier(schema);
    reducerMap = schemaToStateOpsMapper(schema)();
  });
  beforeEach(()=>{
    const rootReducer = combineReducers(reducerMap);
    store = createStore(rootReducer,{
      SomeScalar:1,
      Person:{
        a:{id:'a',name:'A',best:'b',otherbest:'c',nicknames:["AA","AAA"],friends:['b','c'],pet:'x'},
        b:{id:'b',name:'B',best:'a',friends:['a']},
        c:{id:'c',name:'C',best:'a',friends:['a']},
      },
      Pet:{
        x:{id:'x',name:'X'},
        y:{id:'y',name:'Y'},
      },
    });
    useQuery = getUseQuery(store,querier);
  });
  afterAll(()=>{
    reducerMap=querier=store=useQuery=null;
  });
  
  test('should work on scalars', () => {
    const query=gql(`{SomeScalar}`)
    const { result } = renderHook(() =>useQuery(query));
    expect(result.current).toEqual({SomeScalar:1});
    const result1=result.current;
    const prevState = store.getState();
    act(()=>{store.dispatch({type:'SET_SOMESCALAR',payload:1})});
    expect(store.getState()).toBe(prevState);
    expect(result.current).toBe(result1);
    act(()=>{store.dispatch({type:'SET_SOMESCALAR',payload:2})});
    expect(result.current.SomeScalar).toBe(2);
    expect(store.getState()).not.toBe(prevState);
    expect(store.getState().SomeScalar).toBe(2);
    expect(store.getState().Person).toBe(prevState.Person);
  });
  test('should work on objects', () => {
    const query=gql(`{Person{id}}`);
    const { result } = renderHook(() =>useQuery(query));
    expect(result.current).toEqual({Person:{a:{id:'a'}, b:{id:'b'}, c:{id:'c'}}});
    act(()=>{store.dispatch({type:'SUBTRACT_PERSON',payload:'a'});})
    expect(result.current).toEqual({Person:{b:{id:'b'}, c:{id:'c'}}});
  })
});

// describe("getUseQuery: integration test react+redux+useQuery+boundary values directive",()=>{
//   let store,useQuery,querier,reducerMap;
  
//   beforeAll(()=>{
//     const schema = gql`
//       type Person{
//         id:ID, @bvs([])
//         name:String, @bvs([])
//         best:Person, @bvs([])
//         otherbest:Person, @bvs([])
//         nicknames:[String], @bvs([])
//         friends:[Person], @bvs([])
//         pet:Pet @bvs([])
//       }
//       type Pet{id:ID,name:String}
//       scalar SomeScalar
//     `
//     querier = getMemoizedObjectQuerier(schema);
//     reducerMap = schemaToStateOpsMapper(schema)();
//   });
//   beforeEach(()=>{
//     const rootReducer = combineReducers(reducerMap);
//     store = createStore(rootReducer,{
//       SomeScalar:1,
//       Person:{
//         a:{id:'a',name:'A',best:'b',otherbest:'c',nicknames:["AA","AAA"],friends:['b','c'],pet:'x'},
//         b:{id:'b',name:'B',best:'a',friends:['a']},
//         c:{id:'c',name:'C',best:'a',friends:['a']},
//       },
//       Pet:{
//         x:{id:'x',name:'X'},
//         y:{id:'y',name:'Y'},
//       },
//     });
//     useQuery = getUseQuery(store,querier);
//   });
//   afterAll(()=>{
//     reducerMap=querier=store=useQuery=null;
//   });
  
//   test('should work on scalars', () => {
//     const query=gql(`{SomeScalar}`)
//     const { result } = renderHook(() =>useQuery(query));
//     expect(result.current).toEqual({SomeScalar:1});
//     const result1=result.current;
//     const prevState = store.getState();
//     act(()=>{store.dispatch({type:'SET_SOMESCALAR',payload:1})});
//     expect(store.getState()).toBe(prevState);
//     expect(result.current).toBe(result1);
//     act(()=>{store.dispatch({type:'SET_SOMESCALAR',payload:2})});
//     expect(result.current.SomeScalar).toBe(2);
//     expect(store.getState()).not.toBe(prevState);
//     expect(store.getState().SomeScalar).toBe(2);
//     expect(store.getState().Person).toBe(prevState.Person);
//   });
//   test('should work on objects', () => {
//     const query=gql(`{Person{id}}`);
//     const { result } = renderHook(() =>useQuery(query));
//     expect(result.current).toEqual({Person:{a:{id:'a'}, b:{id:'b'}, c:{id:'c'}}});
//     act(()=>{store.dispatch({type:'SUBTRACT_PERSON',payload:'a'});})
//     expect(result.current).toEqual({Person:{b:{id:'b'}, c:{id:'c'}}});
//   })
// });

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
