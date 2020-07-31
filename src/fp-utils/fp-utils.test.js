import {
  acceptArrayOrArgs,
  identity,
  condNoExec,
  cond,
  stubTrue,
  stubFalse,
  groupByKeys,
  groupByValues,
  tdKeyBy,
  transToArray,
  transToObject,
  pipe,
  and,
  or,
  keyBy,
  tdToArray,
  tdToObject,
  tdMap,
  tdFilter,
  compose,
  transduceDF,
  partition,
  partitionObject,
  partitionArray,
  tdOmit,
  over,
  isObjectLike,
  reduceAny,
  mapToObject
} from './fp-utils'
describe("and", () => {
  it('should ensure multiple predicates pass', () =>{
    const is5=x=>x===5;
    const not5=x=>x!==5;
    expect(and(is5,is5)(5)).toBe(true);
    expect(and(is5,not5)(5)).toBe(false);
    expect(and(not5,is5)(5)).toBe(false);
    expect(and(not5,not5)(5)).toBe(false);
  });
})
describe("and", () => {
  it('should ensure multiple predicates pass', () =>{
    const is5=x=>x===5;
    const not5=x=>x!==5;
    expect(or(is5,is5)(5)).toBe(true);
    expect(or(is5,not5)(5)).toBe(true);
    expect(or(not5,is5)(5)).toBe(true);
    expect(or(not5,not5)(5)).toBe(false);
  });
})
describe("pipe", () => {
  const add1=x=>x+1;
  it('should be equivalent to identity on 0 fns', () =>expect(pipe()(0)).toBe(0));
  it('should add multiple fns', () =>expect(pipe(add1,add1,add1)(0)).toBe(3));
  it('should be referentially transparent', () =>expect(pipe(add1,add1,add1)(0)).toBe(pipe(add1,pipe(add1,add1))(0)));
  const addFIrstARgs=(a,b)=>a+b;
  it('should pass all args to first fn', () =>expect(pipe(addFIrstARgs)(1,1)).toBe(2));
});
describe("acceptArrayOrArgs", () => {
  const testFn = acceptArrayOrArgs(identity);
  it('should convert args to an array', () =>expect(testFn(1,2,3)).toEqual([1,2,3]));
  it('should keep an array', () =>expect(testFn([1,2,3])).toEqual([1,2,3]));
});
describe('transToArray',()=>{
  it('should reduce an array or object to an array, ignoring return value', () =>{
    let coll=['a'], a, v, k, c, result=transToArray((aa,vv,kk,cc)=>{a=aa,v=vv,k=kk,c=cc;aa[aa.length]=true;})(coll);
    expect(a).toBe(result);
    expect(Array.isArray(result)).toBe(true);
    expect(v).toBe('a');
    expect(result[0]).toBe(true);
    expect(k).toBe(0);
    expect(c).toBe(coll);
    
    coll={a:{id:'a'}};
    result=transToArray((aa,vv,kk,cc)=>{a=aa,v=vv,k=kk,c=cc;aa[aa.length]=true;})(coll);
    expect(a).toBe(result);
    expect(Array.isArray(result)).toBe(true);
    expect(v).toBe(coll.a);
    expect(result[0]).toBe(true);
    expect(k).toBe('a');
    expect(c).toBe(coll);
  });
});
describe('transToObject',()=>{
  it('should reduce an array or object to an object, ignoring return value', () =>{
    let coll=['a'],a,v,k,c;
    let result=transToObject((aa,vv,kk,cc)=>{a=aa,v=vv,k=kk,c=cc;aa[kk]=true;})(coll);
    expect(a).toBe(result);
    expect(Array.isArray(result)).toBe(false);
    expect(v).toBe('a');
    expect(k).toBe(0);
    expect(c).toBe(coll);
    expect(result['0']).toBe(true);
    
    coll={a:{id:'a'}};
    result=transToObject((aa,vv,kk,cc)=>{a=aa,v=vv,k=kk,c=cc;aa[kk]=true;})(coll);
    expect(a).toBe(result);
    expect(Array.isArray(result)).toBe(false);
    expect(v).toBe(coll.a);
    expect(k).toBe('a');
    expect(c).toBe(coll);
    expect(result['a']).toBe(true);
  });
});

describe("condNoExec", () => {
  const pred = x=>x===1
  const fn1 = condNoExec([ [pred,'is_1'], [stubTrue,'not_1'] ]);
  it('returns values when passed non-function values', () =>  expect(fn1(1)).toBe('is_1'));
  const fn2 = condNoExec([ [pred,pred], [stubTrue,stubTrue] ]);
  it('does not call function values', () =>  expect(fn2(1)).toBe(pred));
  const fn3 = condNoExec([ [pred,'is_1'], [stubTrue,'not_1'] ]);
  it('stops after the first passing predicate and returns the value', () =>expect(fn3(1)).toBe('is_1'));
  const fn4 = condNoExec([ [stubFalse,1], [stubFalse,2], [stubFalse,3] ]);
  it('returns nothing when no predicates pass', () =>expect(fn4(2)).toBe(undefined));
});

describe("cond", () => {
  const pred = x=>x===1
  const fn1 = cond([ [pred,'is_1'], [stubTrue,'not_1'] ]);
  it('returns values when passed non-function values', () =>  expect(fn1(1)).toBe('is_1'));
  const fn2 = cond([ [pred,()=>'is_1'], [stubTrue,()=>'not_1'] ]);
  it('calls functions with passed args', () =>  expect(fn2(1)).toBe('is_1'));
  const fn3 = cond([ [pred,'is_1'], [stubTrue,'not_1'] ]);
  it('stops after the first passing predicate and returns the value', () =>expect(fn3(1)).toBe('is_1'));
  const fn4 = cond([ [stubFalse,1], [stubFalse,2], [stubFalse,3] ]);
  it('returns nothing when no predicates pass', () =>expect(fn4(2)).toBe(undefined));
});

describe("groupByKeys", () => {
  it('groups by array collection item keys', () =>{
    expect(groupByKeys([{a:[1,2]}, {b:[2]}, {c:[1,3]}]))
    .toEqual({a:[{a:[1,2]}],b:[{b:[2]}],c:[{c:[1,3]}]});
  });
  it('groups by object collection item keys', ()=>{
    expect(groupByKeys({a:{d:[1,2]}, b:{d:[2]}, c:{d:[1,3]}}))
    .toEqual({d:[{d:[1,2]},{d:[2]},{d:[1,3]}]});
  });
});

describe("groupByValues", () => {
  it('groups by array collection item values', () =>{
    expect(groupByValues([{a:[1,2]}, {b:[2]}, {c:[1,3]}]))
    .toEqual({1: [{a:[1,2]},{c:[1,3]}], 2: [{a:[1,2]},{b:[2]}], 3: [{c:[1,3]}]});
  });
  it('groups by object collection item values', ()=>{
    expect(groupByValues({a:{d:[1,2]}, b:{d:[2]}, c:{d:[1,3]}}))
    .toEqual({1:[{d:[1,2]},{d:[1,3]}], 2:[{d:[1,2]},{d:[2]}], 3:[{d:[1,3]}]});
  });
  it('stringifies all values as keys', ()=>{
    const a = [{a:[{},null,undefined,'a',1,/bar/]}];
    expect(groupByValues(a))
    .toEqual({'[object Object]':a,'a':a,'1':a,'null':a,'undefined':a,'/bar/':a});
  });
});

// const aColl = [{a:[1,2]}, {b:[2]}, {c:[1,3]}];
// const oColl = {a:{d:[1,2]}, b:{d:[2]}, c:{d:[1,3]}};
// groupByKeys(aColl) // {a:[{a:[1,2]}],b:[{b:[2]}],c:[{c:[1,3]}]}
// groupByKeys(oColl) // {d:[{d:[1,2]},{d:[2]},{d:[1,3]}]}
// groupByKey('a')(aColl) // {a:[{a:[1,2]}]}
// pipe(map(pick(['a','b'])),groupByValues)(aColl) // {1:[{a:[1,2]}], 2:[{a:[1,2]}, {b:[2]}]}
// groupByKey('d')(oColl) // {d:[{d:[1,2]},{d:[2]},{d:[1,3]}]}
// groupByValues(aColl) // {1: [{a:[1,2]},{c:[1,3]}], 2: [{a:[1,2]},{b:[2]}], 3: [{c:[1,3]}]}
// groupByValues(aColl) // {1:[{d:[1,2]},{d:[1,3]}], 2:[{d:[1,2]},{d:[2]}], 3:[{d:[1,3]}]}
describe("tdKeyBy", () => {
  it("should generate a key for each item",()=>{
    expect(tdToObject(tdKeyBy(x=>x.id))([{id:'a'},{id:'b'}]))
    .toEqual({a:{id:'a'},b:{id:'b'}});
  });
})
describe("keyBy", () => {
  it("should generate a key for each via Fn",()=>{
    expect(keyBy(x=>x.id)([{id:'a'},{id:'b'}]))
    .toEqual({a:{id:'a'},b:{id:'b'}});
  });
  it("should generate a key for each via string",()=>{
    expect(keyBy('id')([{id:'a'},{id:'b'}]))
    .toEqual({a:{id:'a'},b:{id:'b'}});
  });
});
describe("tdToArray", () => {
  it("tdToArray should produce expected results",()=>{
    const takeEvensAdd1=compose(tdFilter(x=>x%2===0),tdMap(x=>x+'a'));
    const arrayInputResult=tdToArray(takeEvensAdd1)([0,1,2,3,4]);
    const objectInputResult=tdToArray(takeEvensAdd1)({a:0,b:1,c:2,d:3,e:4})
    const blankArrayResult=tdToArray(takeEvensAdd1)([]);
    const blankObjectResult=tdToArray(takeEvensAdd1)({});
    expect(arrayInputResult).toEqual(['0a','2a','4a']);
    expect(objectInputResult).toEqual(['0a','2a','4a']);
    expect(blankArrayResult).toEqual([]);
    expect(blankObjectResult).toEqual([]);
  });
});
describe("tdToObject", () => {
  it("tdToObject should produce expected results",()=>{
    const takeEvensAdd1=compose(tdFilter(x=>x%2===0),tdMap(x=>x+'a'));
    const arrayInputResult=tdToObject(takeEvensAdd1)([0,1,2,3,4]);
    const objectInputResult=tdToObject(takeEvensAdd1)({a:0,b:1,c:2,d:3,e:4});
    const blankArrayResult=tdToObject(takeEvensAdd1)([]);
    const blankObjectResult=tdToObject(takeEvensAdd1)({});
    expect(arrayInputResult).toEqual({"0":'0a',"2":'2a',"4":'4a'});
    expect(objectInputResult).toEqual({a:'0a',c:'2a',e:'4a'});
    expect(blankArrayResult).toEqual({});
    expect(blankObjectResult).toEqual({});
  });
});
describe("transduceDF", () => {
  it("transduceDF should produce expected results",()=>{
    const oTree={a:{a1:{a11:true},a2:true},b:{b1:true}};
    const aTree=['a',['aa',['aaa']]];

    expect(transduceDF()({},aTree))
    .toEqual({"0":"a","1":{"0":"aa","1":{"0":"aaa"}}});
    
    expect(transduceDF(tdOmit((v,k)=>v==='aa'))({},aTree))
    .toEqual({"0":"a","1":{"1":{"0":"aaa"}}});
    expect(transduceDF(tdOmit((v,k)=>k===1))({},aTree))
    .toEqual({"0":"a"});
    
    expect(transduceDF()({},oTree))
    .toEqual({a:{a1:{a11:true},a2:true},b:{b1:true}});
    
    expect(transduceDF(tdOmit((v,k)=>k==='a1'))({},oTree))
    .toEqual({a:{a2:true},b:{b1:true}});
    
    // map to flattened tree
    expect(transduceDF(
      identity,
      dfReducer=>(a,v,k,c)=>isObjectLike(v) ? reduceAny(dfReducer,v,a) : v,
      identity,
      (acc={},v,k)=>{acc[k]=1; return acc; }
    )({},oTree))
    .toEqual({a:1,a1:1,a11:1,a2:1,b:1,b1:1});

    const blankObjectResult=transduceDF()({},{});
    expect(blankObjectResult).toEqual({});
    
    const blankArrayResult=transduceDF()({},[]);
    expect(blankArrayResult).toEqual({});
  });
});
describe("partition", () => {
  it("partition should produce expected results",()=>{
    const isEven = x=>x%2===0;
    const isOdd = x=>x%2===1;
    expect(partition(isEven,isOdd)({a:0,b:1,c:2,d:3,e:4})).toEqual([{a:0,c:2,e:4},{b:1,d:3},{}]);
    expect(partition(isEven,isOdd)([0,1,2,3,4])).toEqual([[0,2,4],[1,3],[]]);
    expect(partition(isEven)({a:0,b:1,c:2,d:3,e:4})).toEqual([{a:0,c:2,e:4},{b:1,d:3}]);
    expect(partition(isEven)([0,1,2,3,4])).toEqual([[0,2,4],[1,3]]);
  });
});
describe("over", () => {
  it("should produce expected results",()=>{
    const isEven = x=>x%2===0;
    const isOdd = x=>x%2===1;
    expect(over({x:isEven,y:isOdd})(1)).toEqual({x:false,y:true});
    expect(over([isEven,isOdd])(1)).toEqual([false,true]);
    expect(over([isEven,isOdd])({a:0,b:1})).toEqual([false,false]);
    expect(over({x:isEven,y:isOdd})([0,1])).toEqual({x:false,y:false});
  });
});
