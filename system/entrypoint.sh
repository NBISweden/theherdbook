#!/bin/bash

# Set up self signed certificate in case none is supplied.

yes '' | openssl req -x509 -nodes -days 7304 -newkey rsa:4096 -keyout /code/key.pem -out /code/cert.pem > /dev/null 2>/dev/null
cp /code/cert.pem /code/ca.pem

for p in {cert,key,ca}; do 
  if [ -r "/config/$p.pem" ]; then
    echo "$p.pem supplied, copying"
    cp "/config/$p.pem" /code/
  fi
done

if [ -r /config/dhparam.pem ]; then
    cp /config/dhparam.pem /code/
else
    echo "Generating forward secrecy crypto parameters"
    openssl dhparam -out /code/dhparam.pem 2048 > /dev/null 2>/dev/null
fi

chown www-data:www-data /code/*.pem

if getent hosts herdbook-frontend >/dev/null; then
    # Development mode
    cp /etc/nginx/herdbook.devel /etc/nginx/herdbook
else
    # Standalone
    cp /etc/nginx/herdbook.standalone /etc/nginx/herdbook
fi

supervisord -c /etc/supervisord.conf
