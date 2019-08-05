
# from toolz.functoolz import curry,partial,compose,flip,pipe as datapipe
from fn import _ as __,F

from funcy import curry, ljuxt, rcompose as pipe, merge,lmapcat,lmap,get_in,set_in,identity,flatten,pluck;
from toolz.curried import map as toolzmap
from toolz.curried import mapcat as flatmap

# misc utils
identity=lambda *a,**kw:a[0]
noop = lambda *a,**kw: None
constant = lambda x: lambda *a,**kw: x


# stubs
stub_0 = constant(0)
stub_True = lambda *x,**kw: True
stub_False = lambda *x,**kw: False
stub_list = lambda *x,**kw: list()
stub_dict = lambda *x,**kw: dict()
blank_class = lambda *x,**kw:x[0].__class__()

# fn utils
curry2 = lambda fn:curry(fn,2)
curry3 = lambda fn:curry(fn,3)
ensureListArg = lambda fn:lambda *args,**kw:fn(args[0],**kw) if (len(args)==1) else fn(args,**kw);

#function manipulation

compose = lambda *fns :pipe(*reversed(fns))
fmap = lambda fn: lambda data: (fn(d) for d in data)
mapPipe = compose(fmap,pipe)
spread = lambda fn : lambda iterableArg : fn(*iterableArg)

nthArg = lambda argNum: lambda *args: args[argNum]
negate = lambda fn: lambda *args,**kwargs:not fn(*args,**kwargs)
over = lambda fns: lambda *args,**kwargs: tuple(f(*args,**kwargs) for f in fns)
forkjoin = lambda *fns: lambda data:fns[-1](*[fn(data) for fn in fns[0:-2]])

get_kv_iter=lambda x:x.items() if hasattr(x,'items') else enumerate(x)

@curry3
def reduce_to(get_result,fn,coll):
  result = get_result(coll)
  for k,v in get_kv_iter(coll):
    fn(result,v,k,coll)
  return result
rl = reduce_to(stub_list)
rd = reduce_to(stub_dict)
rx = reduce_to(lambda x:x.__class__())


# map_to ... different syntax for each
mdv = curry2(lambda fn,coll:{k:fn(v,k) for k,v in get_kv_iter(coll)})
mdk = curry2(lambda fn,coll:{fn(v,k):v for k,v in get_kv_iter(coll)})
ml = curry2(lambda fn,coll:[fn(v,k) for k,v in get_kv_iter(coll)])
mg = curry2(lambda fn,coll:(fn(v,k) for k,v in get_kv_iter(coll)))
mt = curry2(lambda fn,coll:tuple(fn(v,k) for k,v in get_kv_iter(coll)))

# flatmap_to
flatml = curry2(lambda fn,coll:[v for a in (fn(xi) for xi in coll) for v in a])
flatmg = curry2(lambda fn,coll:(v for a in (fn(xi) for xi in coll) for v in a))
flatmt = curry2(lambda fn,coll:tuple(v for a in (fn(xi) for xi in coll) for v in a))

# filter_to
fd = curry2(lambda fn,coll:{k:v for k,v in get_kv_iter(coll) if fn(v,k)})
fl = curry2(lambda fn,coll:[v for k,v in get_kv_iter(coll) if fn(v,k)])
fg = curry2(lambda fn,coll:(v for k,v in get_kv_iter(coll) if fn(v,k)))
ft = curry2(lambda fn,coll:tuple(v for k,v in get_kv_iter(coll) if fn(v,k)))

# omit_to
od = curry2(lambda fn,coll:{k:v for k,v in get_kv_iter(coll) if not fn(v,k)})
ol = curry2(lambda fn,coll:[v for k,v in get_kv_iter(coll) if not fn(v,k)])
og = curry2(lambda fn,coll:(v for k,v in get_kv_iter(coll) if not fn(v,k)))
ot = curry2(lambda fn,coll:tuple(v for k,v in get_kv_iter(coll) if not fn(v,k)))

#logic
@ensureListArg
def cond(predicateFnMatrix):
  def condInner(*args,**kw):
    for (predicate,fn) in predicateFnMatrix:
      if predicate(*args,**kw):
        return fn(*args,**kw);
  return condInner
all = lambda *fns: lambda *args,**kwargs: reduce((lambda truth,fn:(fn(*args,**kwargs) if truth else truth)),fns,True)
ifElse = lambda predicate,fnTrue,fnFalse: lambda *a,**kw: fnTrue(*a,**kw) if predicate(*a,**kw) else fnFalse(*a,**kw)


# predicates
lt = curry2(lambda x,y: y < x)
lte = curry2(lambda x,y: y <= x)
gt = curry2(lambda x,y: y > x)
gte = curry2(lambda x,y: y >= x)
eq = curry2(lambda x,y: y == x)
ne = curry2(lambda x,y: y != x)
is_ = curry2(lambda x,y: y is x)
is_not = curry2(lambda x,y: y is not x)

#debugging
plog = lambda *args: print(*args) or args[0]
def logFn(fn,name=""):
    def fn_logger(*args,**kwargs):
        print(name,'args:',args,'kwargs:',kwargs)
        return fn(*args,**kwargs)
    return fn_logger


#math
def len_minus1(collection): return len(collection) - 1
add = curry2(lambda x,y:y+x)
sub = curry2(lambda x,y:y-x)
mul = curry2(lambda x,y:y*x)
truediv = curry2(lambda x,y:y/x)
floordiv = curry2(lambda x,y:y//x)
pow = curry2(lambda x,y:y**x)
mod = curry2(lambda x,y:y % x)
divisibleBy = curry2(lambda a,b:b%a==0)




# dicts
def assign(dest,*dicts):
  for d in dicts:
    for k in d.keys():
      dest[k]=d[k]
  return dest



# graphs
def analyze_graph(get_adjacent_vertices,collection):
  graph = dict(
    vertices={id:dict(id=id,data=data) for v in get_adjacent_vertices('start',collection)},
    root_vertices={},
    in_edges={},
    in_paths={},
    out_edges={},
    in_cross={},
    out_cross={},
    in_back={},
    out_back={},
    in_forward={},
    out_forward={}
  )

  node = None
  queue=[v for v in graph['vertices']]
  while(len(queue)>0):
      node=queue.shift()
      for (id,data) in get_adjacent_vertices(node['id'],collection):
        if(id in graph['vertices']):
          pass # visited
          # tests for cross, back, forward edges
        else:
          graph['vertices'][id]=dict(id=id,data=data)
          queue.append()

  for (id,vertex) in graph['vertices'].items():
    if id not in graph['in_edges']:
      root_vertices[id]=vertex

  return graph


# files
import json
from urllib.request import urlopen,Request

def read_json_file(filepath):return json.load(open(filepath,'r'));

@curry2
def write_json_file(filepath,data): return json.dump(data,open(filepath,'w'),separators=(',', ':'));

def read_json_url(url):return json.load(urlopen(Request(url)));

import csv
@curry3
def iterable2d_to_csv_file(filepath="output.csv",cols=[],iterable2d=[[],[]]):
  """arr2d_to_csv_file("output.csv",iterable2d=[[],[]])"""
  w = csv.writer(open(filepath, "w",newline=''),quoting=csv.QUOTE_MINIMAL)
  if cols: w.writerow(cols);
  for row in iterable2d: w.writerow(row);

@curry2
def csv_file_to_iterable(filepath,**reader_args):
  """csv_file_to_iterable(**reader_args,open('input.csv'))"""
  #   if filepath.startswith('http'):
  #     csv_iterable=csv.reader(urlopen(csv_path).iter_lines())
  return csv.reader(open(filepath,'r',newline=''), **reader_args);
