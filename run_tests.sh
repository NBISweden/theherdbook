#
# Simple convenience test runner for the herd book.
#

VENV="venv"

cd $(dirname "$0")

if [ ! -d "$VENV" ]
then
  echo "Warning: Could not find virtual environment '$VENV'."
  echo "Creating virtual environment '$VENV'".

  python3 -m venv "$VENV"
  [[ "$?" != "0" ]] && "Error: Couldn't create virtual environment" && exit 1
fi

source "$VENV/bin/activate"

cd app

echo "Checking virtual environment dependencies"
pip install --upgrade -r requirements.txt

echo "Running python unittests"
coverage run --omit "../$VENV/*" -m unittest tests/test*.py && coverage report
