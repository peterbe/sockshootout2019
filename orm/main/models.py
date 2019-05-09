import uuid

from geoip2.errors import AddressNotFoundError
from django.db import models
from django.contrib.gis.geoip2 import GeoIP2
from django.dispatch import receiver
from django.db.models.signals import pre_save
from django.contrib.postgres.fields import JSONField

geoip_looker_upper = GeoIP2()


class Submission(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4)
    modified = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField()
    ip_address = models.GenericIPAddressField()
    geo_lookup = JSONField(default=dict, null=True)

    def __str__(self):
        return f"{self.uuid} {self.created!r} ({self.ip_address})"

    def set_geo_lookup(self, raise_on_error=False):
        if not self.ip_address or self.ip_address == "127.0.0.1":
            self.geo_lookup = {}
            return
        try:
            self.geo_lookup = geoip_looker_upper.city(self.ip_address)
        except AddressNotFoundError:
            if raise_on_error:
                raise
            self.geo_lookup = {}


class Run(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE)
    test = models.CharField(max_length=100)
    iterations = models.PositiveIntegerField()
    time = models.DurationField()
    speed = models.DurationField()


@receiver(pre_save, sender=Run)
def set_speed(sender, instance, **kwargs):
    if not instance.speed:
        instance.speed = instance.time / instance.iterations
