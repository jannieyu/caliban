"""Test for Caliban Blueprints"""

import pytest

# from flask_sqlalchemy import SQLAlchemy

from caliban import models


def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json.get('message') == 'success'


def test_create(client):
    pass
