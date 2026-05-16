#!/usr/bin/env bash
set -o errexit
pip install -r requirements.txt   # install all packages
python manage.py collectstatic --no-input  # gather CSS/JS files
python manage.py migrate          # apply DB changes