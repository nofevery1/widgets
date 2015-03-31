from votes.models import *
from votes.constants import *
from django.db.models import Count
# Service methods go here.

def calculate_doi_upvote_downvote_ratios(doi_name):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  downvotes_grouping = Vote.objects.filter(doi__doi=doi_name, is_upvote=False).values('vote_type').annotate(count=Count('vote_type'))
  upvotes_grouping = Vote.objects.filter(doi__doi=doi_name, is_upvote=True).values('vote_type').annotate(count=Count('vote_type'))
  n_score = calculate_n_score(doi_name)

  upvotes_arr = [
    upvotes_grouping.get(vote_type=VALID_VOTE_TYPES[0])["count"], 
    upvotes_grouping.get(vote_type=VALID_VOTE_TYPES[1])["count"], 
    upvotes_grouping.get(vote_type=VALID_VOTE_TYPES[2])["count"]
  ]

  downvotes_arr = [
    downvotes_grouping.get(vote_type=VALID_VOTE_TYPES[0])["count"], 
    downvotes_grouping.get(vote_type=VALID_VOTE_TYPES[1])["count"], 
    downvotes_grouping.get(vote_type=VALID_VOTE_TYPES[2])["count"]
  ]
  
  return {
    "doi_name": doi_name,
    "upvotes": upvotes_arr,
    "downvotes": downvotes_arr,
    "category_scores": [
      "scores",
      upvotes_arr[0]/downvotes_arr[0],
      upvotes_arr[1]/downvotes_arr[1],
      upvotes_arr[2]/downvotes_arr[2]
    ],
    "n_score": n_score
  }

def calculate_n_score(doi_name):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  # Find all votes where the DOI name matches a given name, get unique ip addresses, and subtract 1 to ignore initial seed votes
  return Vote.objects.filter(doi__doi=doi_name).values('ip_address').distinct().count() # count() ignores null IP addresses (initial seed will have null ip by design)

def calculate_doi_voting_permissions(doi_name, user_ip):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  if user_ip is None or user_ip.isspace():
    raise ValueError("user_ip cannot be empty")

  permissions = [True, True, True]

  for i in range(0, len(VALID_VOTE_TYPES)):
    valid_vote_type = VALID_VOTE_TYPES[i]
    has_permission = not Vote.objects.filter(doi__doi=doi_name, vote_type=valid_vote_type, ip_address=user_ip).exists()
    permissions[i] = has_permission

  return permissions