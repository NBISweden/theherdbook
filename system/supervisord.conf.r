[unix_http_server]
file=/tmp/supervisor.sock                       ; path to your socket file

[supervisord]
logfile=/dev/stdout
logfile_maxbytes=0
loglevel=error                                  ; info, debug, warn, trace
pidfile=/var/run/supervisord.pid                ; pidfile location
nodaemon=true                                  ; run supervisord as a daemon
minfds=1024                                     ; number of startup file descriptors
minprocs=200                                    ; number of process descriptors
user=root                                       ; default user
childlogdir=/tmp/

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///tmp/supervisor.sock         ; use a unix:// URL  for a unix socket

[program:rserver]
command=Rscript /usr/local/r-api/serve.R
user=www-data 
stderr_logfile = /dev/stdout
stdout_logfile = /dev/stderr
stdout_logfile_maxbytes = 0
stderr_logfile_maxbytes = 0

[program:code_reloader]
command=bash -c 'while true; do inotifywait -e modify,attrib,create,delete -r -q /code; rsync -a /code/ /usr/local/r-api/; pkill -TERM R; done'
user=www-data
directory=/code
stderr_logfile = /dev/stdout
stdout_logfile = /dev/stderr
stdout_logfile_maxbytes = 0
stderr_logfile_maxbytes = 0


