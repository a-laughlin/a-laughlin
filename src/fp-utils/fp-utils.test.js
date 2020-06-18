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
  tdToObject,
  transToArray,
  transToObject,
} from './fp-utils'

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