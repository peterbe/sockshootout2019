from django.core.management.base import BaseCommand
from django.db.models import Q
from orm.main.models import Submission


class Command(BaseCommand):
    help = "Geo lookup submissions with ip addresses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--all", action="store_true", help="Reattempt those that might have failed"
        )

    def handle(self, *args, **options):
        verbose = options["verbosity"] > 1

        qs = Submission.objects.exclude(
            Q(ip_address="127.0.0.1") | Q(ip_address__isnull=True)
        )
        if not options["all"]:
            qs = qs.filter(geo_lookup={})

        for submission in qs:
            print(submission.ip_address)
            submission.set_geo_lookup(raise_on_error=verbose)
            submission.save()
            print(submission.geo_lookup)
