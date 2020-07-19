import './_commonjsHelpers.js-51d3728a.js';
import './react-utils/object-assign-d4d6ba91.js';
import { r as react } from './react-utils/react-a4cb4ace.js';
import './react-utils/prop-types-f783925b.js';
import { styleStringToObj } from '@a-laughlin/style-string-to-obj';

const toHookComposer = (component)=>(...hooks)=>{
  function hookComposer (...props){
    if(!isPlainObject(props[0])) return toHookComposer(component)(...hooks,...props);
    return react.createElement(component, pipe(...hooks.map(ife(isString,s=>children(s))))(...props));
  }
  hookComposer.isHookComposer=true;
  if (process.env.NODE_ENV !== 'production'){
    // add dev friendly names for debugging
    return Object.defineProperty(hookComposer,'name', {
      value: component.name || (typeof component === 'string' ? component : 'hookComposer'), writable: false
    });
  }
  return hookComposer;
};

const isHookComposer = fn=>fn.isHookComposer===true;

const [Div,Span,Ul,Ol,Dt,Dd,Dl,Article,P,H1,H2,H3,H4,H5,H6,Li,Input,A,Label,Pre,Textarea] = (
             'div,span,ul,ol,dt,dd,dl,article,p,h1,h2,h3,h4,h5,h6,li,input,a,label,pre,textarea'
             .split(',').map(toHookComposer));
const [Button,Img,Header,Svg,G,Path,Polyline,Rect,Line,Circle,Text,Table,Td,Th,Tr] = (
             'button,img,header,svg,g,path,polyline,rect,line,circle,text,table,td,th,tr'
             .split(',').map(toHookComposer));

const style = cond(
  [isString,str=>style(styleStringToObj(str))],
  [isFunction,fn=>p=>style(fn(p))(p)],
  [isPlainObject,obj=>p=>merge({},p,{style:obj})],
  [stubTrue,arg=>{throw new TypeError('styles only works with objects, strings, or functions that return those');}]
);


const eventFactory = evtName => (fn=identity)=>p=>
  ({...p,[evtName]:evt=>console.log(`p,evtName`, p,evtName)||fn(p,evt)});

const [onClick,onChange,onKeydown,onKeyup,onKeyPress,onSubmit,onInput] = (
             'onClick,onChange,onKeydown,onKeyup,onKeyPress,onSubmit,onInput'
             .split(',').map(s=>eventFactory(s)));


const useObservable = (observable, initialValue) => {
  const [value, setValue] = react.useState(initialValue);
  react.useEffect(()=>{
    const subscription = observable.subscribe(setValue);
    return subscription.unsubscribe.bind(subscription);
  }, [observable] );
  return value;
};

export { A, Article, Button, Circle, Dd, Div, Dl, Dt, G, H1, H2, H3, H4, H5, H6, Header, Img, Input, Label, Li, Line, Ol, P, Path, Polyline, Pre, Rect, Span, Svg, Table, Td, Text, Textarea, Th, Tr, Ul, eventFactory, isHookComposer, onChange, onClick, onInput, onKeyPress, onKeydown, onKeyup, onSubmit, style, toHookComposer, useObservable };
