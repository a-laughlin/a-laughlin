import {useState,useEffect} from 'react';
export const useObservable = (observable, initialValue) => {
  const [value, setValue] = useState(initialValue);
  useEffect(()=>{
    const subscription = observable.subscribe(setValue);
    return subscription.unsubscribe.bind(subscription);
  }, [observable] );
  return value;
};