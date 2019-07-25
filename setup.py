#!/usr/bin/env python

from setuptools import setup,find_packages

setup(name='a-laughlin-utils',
      version='0.0.1',
      description='This package has shared components.',
      author='Adam Laughlin',
      author_email='',
      url='https://github.com/a-laughlin/a-laughlin.git',
      packages=['py/fp_utils','py/jupyter_utils','py/pandas_utils','py/vis_utils'],
      license='LICENSE.txt',
    )
