# GQdux

Simple, Redux-native GraphQL utilities optimized for developer speed.

## Philosophy

Our coding speed [depends on the number of edges]()

- Leverage existing Redux knowledge, dev tools, and middleware  
- No Graphql server necessary. Use existing REST, RPC, Web Socket, and GraphQL server middleware.
- Flexible property partitioning - send only what each server needs

Fast prototypes require speed.  We can always optimize for performance later.

## Tradeoffs

## Priorities
Priorities:
AST size of use cases for 80% of common use cases
\> api size (structural and semantic graphs)
\> execution performance

### Measurement

## Constraints

- constraints:
  - always creates a collection for objects, for a few reasons:
    - We often start with a single object, and need a list of them. Starting with a list is more flexible.
    - We can do anything with 1-length list that we can with a single object
    - Eliminating unnecessary decisions improves speed.

## Installing

## Quick Start (Redux Only)

Try it [on codepen](link)

// import {schemaToQuerySelector} from 'https://unpkg.com/gqdux@0.0.28';
// import gql from '<https://unpkg.com/graphql-tag-bundled@0.0.8/es/graphql-tag>-

// import {schemaToQuerySelector} from 'https://unpkg.com/gqdux@0.0.28';
// import gql from '<https://unpkg.com/graphql-tag-bundled@0.0.8/es/graphql-tag>-

## Quick Start (Redux + React)

## TODO

- move collections transducers or add transducer to mapSelections
- dispatch 1-n events in batch using schemaToQuerySelector w/ different transducers
- enable useQuery multiple test permutations
- decide props merging vs collection merging
- decide where domain concept components should go
- decide where derivations should go
- derivations, custom functions when walking - not recommended since you have to read the function (set operations should be sufficient for most things)
- make selectPath always return a list for lists, not condense down single objects, or always map, so no need to think about it.

## API

`select('graphql string',{...variables...})` equivalents: redux selector, graphql query 
`selectFullPath('graphql string',{...variables...})` equivalents: redux selector, graphql query 
`change('graphql string',{...variables...})` equivalents: redux selector, graphql query 
`selectorToReactHook`

## Select/Change Syntax
// Graphql isn't designed as a data query language, but an API query language.  Attempts at making it one get [complicated](https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition).
In the #pitofsuccess spirit, I provide a few standard terms
I don't know the best solution for this (it likely varies), but I do know having something simple and robust enough to cover many cases is helpful to get started.  To avoid semantic dependencies (that rely on developer past experience graphs), I'm going with standard set operations: Union, intersection, and Subtraction (Difference).

### Operations

Standard set operations for simplicity and to minimize mismatch between author and user linguistic/experiential dependency graphs

- intersect
- union
- subtract
- complement

### Operation Syntax

change syntax:
Collection                  `Person(intersect:{id:"a"})`
Prop                        `Person(friends:{intersect:{id:"b"}})`
Collection + prop selection `Person(intersect:{id:"a"},friends:{intersect:{id:"b"}})`

Selection syntax: (same syntax with desired fields appended)
e.g. `Person(intersect:{id:"a"}){id,friends}`)

### Examples


## Testing
Testing all the permutations of a component is both verbose and error prone.
Gqdux leverages the graphql schema to enable testing all permutations of boundary values automatically.

TODO get this test working
```js
// assuming jest and jest-expect-message
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import gql from 'graphql-tag-bundled';
import {schemaToRootReducer,getSelectPath,mapBoundaryValueCombinations} from 'gqdux';
import {createStore} from 'redux';
import {useState,useEffect} from 'react';

const schema=gql`
  type Person {
    id:ID         @boundaryValues:[123]
    name:String   @boundaryValues:["","foooo", "dfasdfasdfasdfasdfasdfasdfasdfasdfee fwe wej we rwer e rejrq wejr The Third"]
    pet:Pet
  }
  type Pet {
    id:ID         @boundaryValues:[123]
    name:String   @boundaryValues:["","baaaar", "really long name"]
  }
`
const store = createStore(schemaToRootReducer(schema));
const change = schemaToChangePublisher(schema,store);
const selectPath = getSelectPath(schema,gql,store);
const schemaToEachBoundaryValueCombination=(schema)=>(gqlStr,callback)=>{
  queryToBoundaryValueSelectionList(schema,query).forEach(callback);
}
const eachBoundaryValueCombination = schemaToEachBoundaryValueCombination(schema);
const GreetHuman = ()=>{
  const {name,petName}=selectPath('Person(id:"a"){name,pet{name}}');
  <div>{`Hello, ${name}, and your little dog ${petName}!`}</div>
};
const GreetPet = ({name=''})=><div>{`Hello, ${name}, and your little dog ${petName}!`}</div>;
test('it does stuff',()=>{
  // change(`{Person(id:"a",union:{name:${name},pet:${pet}}})}`)
  eachBoundaryValueCombination('Person(id:"a"){name,pet{name}}',({name,pet:petName})=>{
    const { container, getByText } = render(<GreetHuman />);
    act(()=>{change(`Person(id:"a",union:{name:${name},pet:${petName}}})}`));
    expect(getByText(`Hello, ${name}, and your little dog ${petName}!`)).toBeInTheDocument()
    if(name.length===0) expect(result)id===expect(result)
  });
})
```

## Prior Work

databases
discreet math
watching my own and others dev experience
graphql
redux
Apollo, Urql

## Escape Hatches

In the interest of pit of success
Function variables
Action creators
Writing custom operations

## Contributing

Write if there's interest

## Recipes

Existing redux patterns mostly apply.  The only difference is in parsing action names.  

## GQL Differences
// converts query variable definitions array to an object, populating any relevant variables passsed
// default per spec is returning only what's in variableDefinitions
// this version provides the option to eliminate the duplicate definitions in each query to pass a variable
// given the def is often specified in the schema already.