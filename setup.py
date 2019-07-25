#!/usr/bin/env python

from setuptools import setup,find_packages

setup(name='a-laughlin-utils',
      version='0.0.1',
      description='This package has shared components.',
      author='Adam Laughlin',
      author_email='',
      url='git+ssh://git@github.com/a-laughlin/a-laughlin-utils.git'
      packages=find_packages(where="./py",exclude=['*test*']),
      license='LICENSE.txt',
    )
