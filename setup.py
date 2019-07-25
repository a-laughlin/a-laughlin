#!/usr/bin/env python

from setuptools import setup,find_packages
setup(name='a_laughlin_utils',
      version='0.0.2',
      description='This package has shared components.',
      author='Adam Laughlin',
      author_email='',
      url='https://github.com/a-laughlin/a-laughlin.git',
      packages=find_packages(where="py"),#,exclude=['*test.py']
      license='LICENSE.txt',
    )
