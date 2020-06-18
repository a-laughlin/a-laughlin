export const useQuery=()=>{};
export const getUseQuery=(store,queryReducer)=>{
  return (query,vars)=>{
    const [state,setState]=useState(queryReducer(store.getState(),query,vars));
    useEffect(()=>{
      lastResult;
      return store.subscribe(()=>{
        const result=query.definitions[0].selectionSet.selections.reduce(queryReducer,store.getState())
        if (result!==lastResult){
          lastResult=result;
          setState(result);
        }
      }).bind(store);
    },[vars]);
  }
}