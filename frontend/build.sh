#!/bin/sh
rm -rf dist
esbuild                                          \
    --bundle src/main.tsx                        \
    --outdir=dist                                \
    --target=es6                                 \
    --minify                                     \
    "--define:process.env.NODE_ENV='production'" \
    --pure:console.log
cd dist
main_hash="main.$(md5sum main.js | head -c 10).js"
mv main.js "$main_hash"
sed 's,.*main.js.*,<script src="'"$main_hash"'"></script>,' < ../public/index.html > index.html

