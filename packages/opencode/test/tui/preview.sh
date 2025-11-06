#! /usr/bin/env bash

h=/tmp/oc-test

cols=$1
rows=$2

stty cols $cols rows $rows
env \
  HOME=$h
  XDG_CONFIG_HOME=$h/_config \
  XDG_DATA_HOME=$h/_data \
  XDG_CACHE_HOME=$h/_cache \
  XDG_STATE_HOME=$h/_state \
  bun dev /tmp/oc-test/project

stty rows $rows cols $cols
