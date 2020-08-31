export const querySelectorToUseQuery=(querier,store,useState,useEffect,useMemo)=>{
  return (query,variables)=>{
    // probably need a useRef here so queryFn will be current in useEffect.
    const querySelector=useMemo(()=>querier(query,variables),[variables]);
    const [state,setState] = useState([store.getState(),querySelector(store.getState())]);
    useEffect(()=>store.subscribe(()=> { // returns the unsubscribe function
      setState(([prevNormed,prevDenormed])=>{
        const normed = store.getState();
        return [normed,querySelector(normed,prevNormed,prevDenormed)];
      });
    }),[]);
    return state[1];
  };
};