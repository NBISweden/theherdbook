#!/usr/bin/env python3
"""
Things for logging updates to rabbit per year and genebank
"""
# pylint: disable=too-many-lines
import logging
import os
from logging.handlers import TimedRotatingFileHandler

from flask import has_request_context, request


class RequestFormatter(logging.Formatter):
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.remote_addr
        else:
            record.url = None
            record.remote_addr = None

        return super().format(record)


class MyTimedRotatingFileHandler(TimedRotatingFileHandler):
    def __init__(self, logfile, when):
        super(MyTimedRotatingFileHandler, self).__init__(logfile, when)
        self._header = ""
        self._log = None

    def write_header(self):
        if self._log is not None and self._header != "":
            self._log.info(self._header)

    def doRollover(self):
        super(MyTimedRotatingFileHandler, self).doRollover()
        self.write_header()

    def configureHeaderWriter(self, header, log):
        self._header = header
        self._log = log
        self.write_header()  # WRITE HEADER TO FIRST FILE


def create_genebank_logs(first_path, first_log_name):
    for log_type in "update", "create":
        log_name = f"{first_log_name}_{log_type}"
        path = f"{first_path}{log_name}.csv"
        logger = logging.getLogger(log_name)
        formatter = logging.Formatter(
            "%(asctime)s,%(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )
        logger.setLevel(logging.INFO)
        fileExists = True
        if not os.path.isfile(path):
            fileExists = False

        handler = MyTimedRotatingFileHandler(path, when="W6")
        logger.addHandler(handler)
        # only add header if file did not exist before.
        if not fileExists:
            if log_type == "update":
                handler.configureHeaderWriter(
                    "datum,användare,individ.number,fält,gammalt,nytt,sälj/rapport-datum",
                    logger,
                )
            if log_type == "create":
                handler.configureHeaderWriter(
                    "datum,användare,individ.number,individ.namn,besättning,sälj-datum",
                    logger,
                )
        handler.setFormatter(formatter)
