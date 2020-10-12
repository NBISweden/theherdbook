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
js_hash="main.$(md5sum main.js | head -c 10).js"
mv main.js "$js_hash"
css_hash="main.$(md5sum main.css | head -c 10).css"
mv main.css "$css_hash"
cat ../public/index.html |
    sed 's,.*main.js.*,<script src="'"$js_hash"'"></script>,' |
    sed 's,<head>,&<link href="'"$css_hash"'" rel="stylesheet">,' |
    cat > index.html

