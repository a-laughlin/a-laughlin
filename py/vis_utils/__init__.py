# vis utils
import seaborn as sns
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

%matplotlib inline

def enum_axes(r=1,c=1,w=5,h=5,subplots_adjust_kw=dict(left=0.125,right=0.9,bottom=0.1,top=0.9,wspace=0.1,hspace=0.1)):
  """data=[[],[]] or [], r=rows,c=cols,w=cell_width,h=cell_height"""
  fig = plt.figure()
  spec = GridSpec(ncols=c, nrows=r, figure=fig)

  fig.set_figheight(r * h)
  fig.set_figwidth(c * w)
  i=-1
  zipped = []
  for ri in range(r):
    for ci in range(c):
      i+=1
      zipped.append((fig.add_subplot(spec[ri, ci]),ri,ci,i))
  fig.tight_layout()
  fig.subplots_adjust(**subplots_adjust_kw)
  # subplots_adjust_kw
  # left  = 0.125  # the left side of the subplots of the figure
  # right = 0.9    # the right side of the subplots of the figure
  # bottom = 0.1   # the bottom of the subplots of the figure
  # top = 0.9      # the top of the subplots of the figure
  # wspace = 0.2   # the amount of width reserved for space between subplots,
  #                # expressed as a fraction of the average axis width
  # hspace = 0.2   # the amount of height reserved for space between subplots,
  #                # expressed as a fraction of the average axis height
  return zipped
