from votes.models import *
from votes.constants import *
from django.db.models import Count
# Service methods go here.

"""
method: calculate_doi_upvote_downvote_ratios
params: doi_name (string)

returns: dictionary containing the doi_name, total number of upvotes, total 
number of downvotes, and an array to be used to plot the category scores on 
the client side
"""
def calculate_doi_upvote_downvote_ratios(doi_name):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  # Find the number of votes, grouped by category, for each vote type for the given doi
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
      "scores", # TODO: the service layer shouldn't care about this, just handle this on the JavaScript side somewhere: scores is the name of the plot is required to be the first item in the list by c3.js (JS charting library) 
      upvotes_arr[0]/downvotes_arr[0],
      upvotes_arr[1]/downvotes_arr[1],
      upvotes_arr[2]/downvotes_arr[2]
    ],
    "n_score": n_score
  }

"""
method: calculate_n_score
params: doi_name (string)

returns: int - the number of unique IPs that have voted on the given DOI
"""
def calculate_n_score(doi_name):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  # Find all votes where the DOI name matches a given name, get the count of unique ip addresses
  return Vote.objects.filter(doi__doi=doi_name).values('ip_address').distinct().count() # count() ignores null IP addresses (initial seed will have null ip by design)

"""
method: calculate_doi_voting_permissions
params: doi_name (string), user_ip (string)

returns: list of bools - a list of permissions for soundness, novelty, and reproducibility voting for 
the given doi in that order. In other words [True, False, True] will be interpreted 
as Soundness=Yes, Novelty=No, and Reproducibility=Yes.
"""
def calculate_doi_voting_permissions(doi_name, user_ip):
  if doi_name is None or doi_name.isspace():
    raise ValueError("doi_name cannot be empty")

  if user_ip is None or user_ip.isspace():
    raise ValueError("user_ip cannot be empty")

  permissions = [True, True, True]

  for i in range(0, len(VALID_VOTE_TYPES)):
    valid_vote_type = VALID_VOTE_TYPES[i]
	# if a vote of the current type exists that is linked to the current doi and the current user's ip address, we do not allow them to vote, hence return false in this case.
    has_permission = not Vote.objects.filter(doi__doi=doi_name, vote_type=valid_vote_type, ip_address=user_ip).exists()
    permissions[i] = has_permission

  return permissions