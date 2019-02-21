import uuid

from django.db import models
from django.dispatch import receiver
from django.db.models.signals import pre_save


class Submission(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4)
    modified = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField()
    ip_address = models.GenericIPAddressField()


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
