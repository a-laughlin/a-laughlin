#!/usr/bin/env python

from setuptools import setup,find_packages
setup(name='a_laughlin_py_utils',
      version='0.0.1',
      description='This package has shared components.',
      author='Adam Laughlin',
      author_email='',
      url='https://github.com/a-laughlin/a-laughlin',
      # packages=find_packages(),
      py_modules=['a_laughlin_fp','a_laughlin_pandas','a_laughlin_vis','a_laughlin_jupyter'],
      license='LICENSE.txt',
    )
