#!/bin/bash
# sed '1d' dist/vew.js | sed '$d' |
java \
  -jar node_modules/google-closure-compiler/compiler.jar \
  --compilation_level ADVANCED \
  --output_wrapper_file dist/umd-wrapper.js \
  --assume_function_wrapper \
  --language_out ECMASCRIPT5 \
  --language_in ECMASCRIPT5 \
  --js dist/vew.js \
  > dist/vew.min.js
  # --env CUSTOM \
  # --formatting PRETTY_PRINT \
  # --externs node_modules/google-closure-compiler/contrib/externs/empty.js \