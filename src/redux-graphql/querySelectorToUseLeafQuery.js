import { querySelectorToUseQuery } from "./querySelectorToUseQuery";
import { isObjectLike, mapToObject } from "@a-laughlin/fp-utils";


// version of useQuery that minimizes the returned object tree
export const querySelectorToUseLeafQuery=(querier,store,useState,useEffect,useMemo)=>{
  const useQuery=querySelectorToUseQuery(querier,store,useState,useEffect,useMemo);
  return (query,variables)=>{
    let selections=query.definitions[0].selectionSet.selections;
    let result = useQuery(query,variables);
    while(selections.length===1 && isObjectLike(result)){
      if(selections[0].name.value in result){
        result = result[selections[0].name.value];
      } else {
        let count=0,id;
        result=mapToObject((v,i)=>{
          ++count;
          id=i;
          return v[selections[0].name.value]
        })(result);
        
        if (count===1) result = result[id];
      }
      selections = selections[0].selectionSet ? selections[0].selectionSet.selections : [];
    }
    return result;
  };
};