
def fp_utils():
  pass
# # from toolz.functoolz import curry,partial,compose,flip,pipe as datapipe
# from fn import _,F
#
# from funcy import autocurry, ljuxt, rcompose as pipe, merge,lmapcat,lmap,get_in,set_in,identity,flatten,pluck;
#
#
#
# # misc utils
# identity=lambda *x:x[0]
# noop = lambda *x: None
# constant = lambda x: lambda *ignored: x
#
# #logic
# def cond(predicateFnMatrix):
#   def condInner(*args):
#     for (predicate,fn) in predicateFnMatrix:
#       if predicate(*args):
#         return fn(*args)
#   return condInner
# all = lambda *fns: lambda *args,**kwargs: reduce((lambda truth,fn:(fn(*args,**kwargs) if truth else truth)),fns,True)
# ifElse = lambda predicate,fnTrue,fnFalse: lambda *a,**kw: fnTrue(*a,**kw) if predicate(*a,**kw) else fnFalse(*a,**kw)
#
#
# # predicates
# lt = autocurry(lambda x,y: y < x)
# lte = autocurry(lambda x,y: y <= x)
# gt = autocurry(lambda x,y: y > x)
# gte = autocurry(lambda x,y: y >= x)
# eq = autocurry(lambda x,y: y == x)
# ne = autocurry(lambda x,y: y != x)
# is_ = autocurry(lambda x,y: x is y)
# is_not = autocurry(lambda x,y: x is not y)
#
# #debugging
# plog = lambda *args: print(*args) or args[0]
# def logFn(fn,name=""):
#     def fn_logger(*args,**kwargs):
#         print(name,'args:',args,'kwargs:',kwargs)
#         return fn(*args,**kwargs)
#     return fn_logger
#
#
# #math
# def len_minus1(collection): return len(collection) - 1
# add = autocurry(lambda x,y:y+x)
# sub = autocurry(lambda x,y:y-x)
# mul = autocurry(lambda x,y:y*x)
# truediv = autocurry(lambda x,y:y/x)
# floordiv = autocurry(lambda x,y:y//x)
# pow = autocurry(lambda x,y:y**x)
# mod = autocurry(lambda x,y: y % x)
# divisibleBy = lambda x: pipe(mod(x), eq(0))
#
# #function manipulation
#
# compose = lambda *fns :pipe(*reversed(fns))
# fmap = lambda fn: lambda data: (fn(d) for d in data)
# mapPipe = compose(fmap,pipe)
# spread = lambda fn : lambda iterableArg : fn(*iterableArg)
# forkjoin = lambda *fns,mergefn: lambda data:mergefn(*[fn(data) for fn in fns])
# nthArg = lambda argNum: lambda *args: args[argNum]
# negate = lambda fn: lambda *args,**kwargs:not fn(*args,**kwargs)
# over = lambda fns: lambda *args,**kwargs: [f(*args,**kwargs) for f in fns]
# def to_transformer(fn,acc):
#   def inner(acc,v,k,c):
#     fn(acc,v,k,c)
#     return acc
#   return inner
#
# from functools import reduce
# transformTo = autocurry(lambda stubFn,fn,coll:reduce(to_transformer(fn),coll,stubFn()))
# transToDict = transformTo(dict)
# @autocurry
# def reduce_to(resultclass,fn,coll):
#   result = resultclass()
#   iter = coll.items() if isinstance(coll,dict) else enumerate(coll)
#   for k,v in iter:
#     fn(result,v,k)
#   return result
# reduce_to_list= reduce_to(list)
# reduce_to_dict= reduce_to(dict)
#
#
# # stubs
# stub_0 = constant(0)
# stub_True = lambda *x: True
# stub_False = lambda *x: False
# stub_List = lambda *x: list()
#
#
# # dicts
# def assign(dest,*dicts):
#   for d in dicts:
#     for k in d.keys():
#       dest[k]=d[k]
#   return dest
#
#
#
# # graphs
# def analyze_graph(get_adjacent_vertices,collection):
#   graph = dict(
#     vertices={id:dict(id=id,data=data) for v in get_adjacent_vertices('start',collection)},
#     root_vertices={},
#     in_edges={},
#     in_paths={},
#     out_edges={},
#     in_cross={},
#     out_cross={},
#     in_back={},
#     out_back={},
#     in_forward={},
#     out_forward={}
#   )
#
#   node = None
#   queue=[v for v in graph['vertices']]
#   while(len(queue)>0):
#       node=queue.shift()
#       for (id,data) in get_adjacent_vertices(node['id'],collection):
#         if(id in graph['vertices']):
#           pass # visited
#           # tests for cross, back, forward edges
#         else:
#           graph['vertices'][id]=dict(id=id,data=data)
#           queue.append()
#
#   for (id,vertex) in graph['vertices'].items():
#     if id not in graph['in_edges']:
#       root_vertices[id]=vertex
#
#   return graph
#
#
# # files
# import json
# from urllib.request import urlopen,Request
#
# def read_json_file(filepath):
#   with open(filepath) as f: return json.load(f);
#
# @autocurry
# def write_json_file(filepath,data):
#   with open(filepath,'w') as f: f.write(json.dumps(data));
#
# def read_json_url(url):
#   return load(urlopen(Request(url)));
#
# import csv
# @autocurry
# def iterable2d_to_csv_file(filepath="output.csv",cols=[],iterable2d=[[],[]]):
#   """arr2d_to_csv_file("output.csv",iterable2d=[[],[]])"""
#   w = csv.writer(open(filepath, "w",newline=''),quoting=csv.QUOTE_MINIMAL)
#   if cols: w.writerow(cols);
#   for row in iterable2d: w.writerow(row);
#
# @autocurry
# def csv_file_to_iterable(filepath,**reader_args):
#   """csv_file_to_iterable(**reader_args,open('input.csv'))"""
#   return csv.reader(open(filepath,'r',newline=''), **reader_args);
