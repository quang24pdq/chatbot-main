"""
sanic-motor
--------------
Simple Motor wrapper for sanic
"""
from setuptools import setup

setup(
    name='evans',
    version='0.2.8',
    author='lyltv',
    author_email='lethivanly96@gmail.com',
    description='Chatbot support for busineses',
    long_description=__doc__,
    packages=['evans'],
    zip_safe=False,
    platforms='any',
    install_requires=['motor>=1.0', 'sanic>=0.4.0'],
    classifiers=[
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
    ]
)
