from decouple import config
import dj_database_url

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "doesn't matter"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = ["orm.main"]


ROOT_URLCONF = "orm.urls"


WSGI_APPLICATION = "orm.wsgi.application"


# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

DATABASES = {
    "default": config(
        "DATABASE_URL",
        default="postgresql://localhost/sockshootout2019",
        cast=dj_database_url.parse,
    )
}


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True


GEOIP_PATH = os.path.join(BASE_DIR, "GeoLite2-City.mmdb")
assert os.path.isfile(GEOIP_PATH), GEOIP_PATH
