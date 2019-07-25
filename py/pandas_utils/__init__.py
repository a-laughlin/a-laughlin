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
