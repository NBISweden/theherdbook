library(plumber)
r <- plumber::plumb(here::here("R/api.R"))

bind_addr <- Sys.getenv("OPTISEL_BIND_ADDR", "localhost") 
port <- Sys.getenv("OPTISEL_PORT", "31113") 

r$run(host = get("bind_addr"), port = as.integer(get("port")))



