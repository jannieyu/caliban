"""Tests for the Caliban Flask App."""

import os

import pytest

from caliban import create_app
from caliban.models import db as _db

# flask-sqlalchemy fixtures from http://alexmic.net/flask-sqlalchemy-pytest/


TESTDB_PATH = '/tmp/test_project.db'
TEST_DATABASE_URI = 'sqlite:///{}'.format(TESTDB_PATH)


@pytest.fixture
def app():
    """Session-wide test `Flask` application."""

    if os.path.exists(TESTDB_PATH):
        os.unlink(TESTDB_PATH)

    yield create_app(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=TEST_DATABASE_URI,
    )

    _db.drop_all()
    os.unlink(TESTDB_PATH)
