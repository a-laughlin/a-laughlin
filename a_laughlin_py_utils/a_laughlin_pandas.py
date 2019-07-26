# pandas utils
import numpy as np
import pandas as pd

np.set_printoptions(
  suppress=True, # print as floats instead of scientific notation
  precision=2, # Number of digits of precision for floating point output
  threshold=20, # Total number of array elements which trigger summarization rather than full repr
  floatmode="maxprec_equal", # Print at most precision fractional digits, using same # for all elements in a given array
)

pd.set_option('display.expand_frame_repr', False)
pd.set_option('display.width', 1500)
pd.set_option('display.precision', 2)
pd.set_option('display.float_format', lambda x: ('%.2f' % x).rstrip('0').rstrip('.'))
pd.set_option('display.colheader_justify','left')

def support(df,cols=['ski==1','football==1']):
#   p(a ^ b)
  return len(df.query(' and '.join(cols)))/len(df)

def confidence(df,cols=['ski==1','football==1']):
  # p(b | a)
  result=df
  resultlen=0
  for c in cols:
    resultlen = len(result)
    result = result.query(c)
  return len(result)/resultlen

def lift(df,cols=['ski==1','football==1']):
  # support+confidence+correlation (prevents misleading negative correlations)
  # p(aUb)/(p(a)*p(b))
  mult=1 # independent if 1
  dflen = len(df)
  for c in cols:
    mult*=len(df.query(c))/dflen
  return support(df,cols)/mult

def is_strong_association_rule(
    support=0,
    confidence=0,
    min_support=0.25,
    min_confidence=0.5,
):
  return support >= min_support and confidence >= min_confidence

def max_possible_itemsets(arr2d=[[],[]]):
  return 2**len(np.unique(arr2d))

def frequent_itemsets():
  pass
def closed_itemsets():
  pass
def association_rules():
  pass

# itemsets, rules = apriori(transactions, min_support=0,  min_confidence=0)

# print('is_strong_association_rule ski->football', is_strong_association_rule(
#   support(df,['ski==1','football==1']),
#   confidence(df,['ski==1','football==1'])
# ))

valueCounts=lambda lst:pd.Series(lst).value_counts() # returns series of probabilities per group

probPerUniqueValue=lambda lst:valueCounts(lst)/len(lst) # returns series of probabilities per group

Ix=lambda plist:(-plist*np.log2(plist));
# assumes a list of unique value probabilities that sum to 1
# e.g. Ix(probPerUniqueValue(df[col]))

gini = lambda lst:1-np.sum(probPerUniqueValue(lst)**2);

def gini_a(lst):
  p=probPerUniqueValue(lst)
  return np.sum((p)*(1 - (p)) + (1 - p)*(1 - (1-p)))

info = lambda lst:np.sum(Ix(probPerUniqueValue(lst)))

infoa = lambda a,base_by_a: np.sum(probPerUniqueValue(a)*base_by_a.apply(info))

gain = lambda base,a,base_by_a:info(base) - infoa(a,base_by_a);

gainRatio=lambda base,a,base_by_a:gain(base,a,base_by_a)/Ix(base_by_a.count()/len(a)).sum()

temp=pd.DataFrame(dict(
  buys=[0,0,1,1,1,0,1,0,1,1,1,1,1,0],
  age=[1,1,2,3,3,3,2,1,1,3,1,2,2,3],
  income=[3,3,3,2,1,1,1,2,1,2,2,2,3,2],
));

assert np.isclose(info(temp.buys),0.940, atol=0.001)
assert np.isclose(infoa(temp.age,temp.groupby('age').buys),0.694, atol=0.001)
assert np.isclose(gain(temp.buys,temp.age,temp.groupby('age').buys),0.246, atol=0.001)
assert np.isclose(gainRatio(temp.buys,temp.age,temp.groupby('income').buys),0.019, atol=0.001)
