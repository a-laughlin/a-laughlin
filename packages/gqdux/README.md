# GQdux

Simple, Redux-first GraphQL utilities optimized for developer speed.

## Philosophy

Our coding speed depends on the number of AST edges

- Leverage existing Redux knowledge, dev tools, and middleware  
- No Graphql server necessary. Use existing REST, RPC, Web Socket, and GraphQL server middleware.
- Flexible property partitioning - send only what each server needs

## Constraints

- constraints:
  - always creates a collection for objects, for a few reasons:
    - We often start with a single object, and need a list of them. Starting with a list is more flexible.
    - We can do anything with 1-length list that we can with a single object
    - Eliminating unnecessary decisions improves speed.

Minimize Edges (including semantic)
Minimize Semantic Edges (reducing differing developer backgrounds)
No Query, Mutation, Subscription Objects, the schema describes the state tree 1:1
No caches.

## Installing

## Quick Start

// import {schemaToQuerySelector} from 'https://unpkg.com/gqdux@0.0.28';
// import gql from '<https://unpkg.com/graphql-tag-bundled@0.0.8/es/graphql-tag>-

// import {schemaToQuerySelector} from 'https://unpkg.com/gqdux@0.0.28';
// import gql from '<https://unpkg.com/graphql-tag-bundled@0.0.8/es/graphql-tag>-

## TODO

- move collections transducers or add transducer to mapSelections
- dispatch 1-n events in batch using schemaToQuerySelector w/ different transducers
- enable useQuery multiple test permutations
- decide props merging vs collection merging
- decide where domain concept components should go
- decide where derivations should go
// for filtering, a dsl is complicated and requires internal plumbing to parse it. Enable folks to create their own with transducers.
// https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// Mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter for MVP, via transducers

make selectPath and selectFullPath the default fns
make use useSelectPath and useSelectFullPath the default hooks
getSelectFullPath = (schema,gql,store)=>
  (str,vars)=>schemaToQuerySelector(schema)(gql(str),vars)(store.getState())
getUseSelectFullPath = (selectFullPath,useState,useEffect,useMemo)=>{...}
getSelectPath=selectFullPath=>(str,vars)=>{...minimize results...}

### selectors
