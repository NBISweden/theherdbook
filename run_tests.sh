#
# Simple convenience test runner for the herd book.
#

VENV="venv"

if [ ! -d "$VENV" ]
then
  echo "Error: Could not find virtual environment '$VENV'."
  echo "Create the environment with:\n\n    python -m venv $VENV.\n"
  exit 1
fi

source "$VENV/bin/activate"

cd app

echo "Running python unittests"
coverage run --omit "../$VENV/*" -m unittest test_api.py && coverage report
