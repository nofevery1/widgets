from django.db import models
from django.utils import timezone
from votes.constants import *
# TODO: break these out into separate files if we need more classes, this file could get big quickly

class DigitalObject(models.Model):
    # Fields
    doi = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
      is_create_operation = self.pk is None

      # Call the superclass save() method to allow django to handle persisting to the DB first
      super(DigitalObject, self).save(*args, **kwargs)

      # If we're creating a new DigitalObject, generate 7 upvotes and 7 downvotes for each of the valid vote types
      if is_create_operation:
        for valid_vote_type in VALID_VOTE_TYPES:
          for i in range(0, 7):
            Vote.objects.create(vote_type=valid_vote_type, is_upvote=True, ip_address=None, doi=self)
            Vote.objects.create(vote_type=valid_vote_type, is_upvote=False, ip_address=None, doi=self)

class Vote(models.Model):
    # Fields
    ip_address = models.CharField(null=True, blank=True, max_length=50)
    vote_type = models.CharField(max_length=50)
    is_upvote = models.BooleanField(default=False)
    created_on = models.DateTimeField(auto_now_add=True)

    # Foreign keys
    doi = models.ForeignKey(to=DigitalObject, related_name='votes')

# a new instance of this class is generated when a user views the chart
class View(models.Model):
    # Fields
    ip_address = models.CharField(null=True, blank=True, max_length=50)
    date = models.DateTimeField(auto_now_add=True)

    # Foreign keys
    doi = models.ForeignKey(to=DigitalObject, related_name='views')
