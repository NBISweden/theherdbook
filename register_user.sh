#
# This script inserts a new user into the database given a username and password
# combination.
#

if [[ "$#" < 2 ]]
then
    cat <<-'END_ERROR' >&2
    Please provide an email and password to insert into the user database
    USAGE: ./register_user.sh <user> <pass>
    END_ERROR
    exit 1
fi

user="$1"
pass="$2"

cd "$( dirname "$0" )" || { echo 'cd error' >&2; exit 1; }

if [ ! -e app/config.ini ]
then
    cat <<-'END_ERROR' >&2
    Couldn't find config file 'app/config.ini'
    Create this file from 'app/config.ini.default' with the credentials
    to your database and then run this script again.
    END_ERROR
    exit 1
fi

if [ ! -d venv ]
then
    printf 'Creating python3 virtual environment in ./venv   '
    python3 -m venv venv >/dev/null
    echo DONE
    printf 'Installing app dependencies                      '
    . venv/bin/activate
    pip install -r app/requirements.txt >/dev/null
    echo DONE
fi

printf 'Insert into database                             '
. venv/bin/activate
cd app/
python3 -c "from utils.database import register_user; register_user('${user}', '${pass}')"
echo DONE
