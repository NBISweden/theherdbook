"""
Instance specific settings for the herdbook.
"""

import os
import logging
import configparser
from shutil import copy2
from argparse import Namespace

# Read configuration file name from environment variable
CONFIG_FILE = os.environ.get('HERDBOOK_CONFIG', 'config.ini')

# Create the config file from the default file if it doesn't exist.
try:
    os.stat(CONFIG_FILE)
except FileNotFoundError:
    logging.info('Copying %s.default to %s', CONFIG_FILE, CONFIG_FILE)
    copy2('config.ini.default', CONFIG_FILE)

logging.info('Reading configuration file %s', CONFIG_FILE)

# Read config file
PARSER = configparser.ConfigParser()
PARSER.read_file(open(CONFIG_FILE))

postgres = Namespace()  # pylint: disable=C0103

postgres.name = PARSER.get('postgres', 'name')
postgres.host = PARSER.get('postgres', 'host')
postgres.port = PARSER.get('postgres', 'port')
postgres.user = PARSER.get('postgres', 'user')
postgres.password = PARSER.get('postgres', 'password')
