"""Caliban Flask App module"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from flask import Flask
from flask_compress import Compress

from caliban import config
from caliban.models import db
from caliban.blueprints import bp


compress = Compress()  # pylint: disable=C0103

class ReverseProxied(object):
    """Reverse proxy for serving static files over https"""
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        scheme = environ.get('HTTP_X_FORWARDED_PROTO')
        if scheme:
            environ['wsgi.url_scheme'] = scheme
        return self.app(environ, start_response)


def create_app(**config_overrides):
    """Factory to create the Flask application"""
    app = Flask(__name__)

    # Load config.
    app.config.from_object(config)
    # apply overrides
    app.config.update(config_overrides)

    app.wsgi_app = ReverseProxied(app.wsgi_app)

    app.jinja_env.auto_reload = True

    db.app = app  # setting context
    db.init_app(app)

    db.create_all()

    compress.init_app(app)

    app.register_blueprint(bp, url_prefix='/')

    # toolbar = DebugToolbarExtension(app)

    return app
