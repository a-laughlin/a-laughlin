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

### transudcers

// for filtering, a dsl is complicated and requires internal plumbing to parse it. Enable folks to create their own with transducers.
// https://hasura.io/docs/1.0/graphql/manual/queries/query-filters.html#fetch-if-the-single-nested-object-defined-via-an-object-relationship-satisfies-a-condition
// Mimic lodash filter/omit https://lodash.com/docs/4.17.15#filter for MVP, via transducers

```js
const withResolvedArgs=fn=>memoize((v,[meta,Field,...,getArgs],k)=>fn(v,[meta,Field,...,getArgs,getArgs(Field)],k),(v,[m,f])=>f);
const withIdAsItem=fn=>(v,[meta,Field,vPrev,vNorm,vNormPrev,rootNorm,rootNormPrev,getArgs,args],k)=>{
  // if(meta.isCollection) does not apply
  vnorm.map(// if(meta.isItem) does not apply
  return fn(v,[meta,Field,vPrev,rootNorm[meta.defName][vNorm],idPrev,rootNorm,rootNormPrev,getArgs,args],k);
}
const transducerFactory = transducer=>combiner=>withResolvedArgs(cond(
  [isItem,cond( // ensure item values are normedpreviously norm the object
    [isList,mapToSame(withIdAsItem(transducer(combiner)))],
    [stubTrue,withIdAsItem(transducer(combiner))],
  ),
  [stubTrue,cond(
    [isList,mapToSame(transducer(combiner))]
    [stubTrue,transducer(combiner)]
  )]
);
const subtractor = transducerFactory(
  combiner=>(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)=>matches(vN,args.subtractAny)&&combiner(v,[m,f,vP,vN,vNP,rN,rNP,ga,args],k)
);
```
