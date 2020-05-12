#
# This script reads the configuration file in app/config.ini to access a
# postgres database and chreate the tables for the herdbook schema.
#
# Note that this script only needs to be run if you wish to create the database
# without using the herdbook application, as the app will create the database
# on startup.
#

cd "$(dirname $0)"

if [ ! -e "app/config.ini" ]
then
    echo "Couldn't find config file 'app/config.ini'"
    echo "Create this file from 'app/config.ini.default' with the credentials"
    echo "to your database and then run this script again."
    exit 1
fi

if [ ! -d "venv" ]
then
    printf "Creating python3 virtual environment in ./venv   "
    python3 -m venv venv >/dev/null
    echo "DONE"
    printf "Installing app dependencies                      "
    pip3 install -r app/requirements.txt >/dev/null
    echo "DONE"
fi

printf "Initializing database                            "
. venv/bin/activate
cd app/
python3 -c "import utils.database as db; db.init()"
echo "DONE"
