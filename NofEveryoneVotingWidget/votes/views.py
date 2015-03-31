import json
from django.conf import settings
from django.core import serializers
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from ipware.ip import get_ip, get_real_ip
from votes.models import *
from votes.services import *

# This file is Django's version of a Controller

# GET /index
def index(request):
  return render(request, 'votes/index.html', {"doi_list": DigitalObject.objects.all(), "count": DigitalObject.objects.count()})

# GET /votes/<doi_name>
def detail(request, doi_name):
  if doi_name is None or doi_name.isspace():
    return render(request, 'votes/not_found.html')

  user_ip = __get_request_ip(request)
  if user_ip is None or user_ip.isspace():
    return HttpResponse("Error: request was made from a nonexistent IP address.")

  if DigitalObject.objects.filter(doi=doi_name).exists(): 
    view_model = calculate_doi_upvote_downvote_ratios(doi_name)

    voting_permissions = calculate_doi_voting_permissions(doi_name, user_ip)
    view_model['voting_permissions'] = [json.dumps(item) for item in voting_permissions]
    view_model['category_identifiers'] = VALID_VOTE_TYPES

    context = {
      "data": view_model
    }
    return render(request, 'votes/detail.html', context)
  else:
    return render(request, 'votes/not_found.html')

# GET /votes/<doi_name>/upvote
def upvote(request, doi_name, vote_type):
  if doi_name is None or doi_name.isspace():
    return JsonResponse({"success": False, "message": "the doi name cannot be empty."})

  if vote_type is None or vote_type.isspace():
    return JsonResponse({"success": False, "message": "the vote type cannot be empty."})

  if vote_type not in VALID_VOTE_TYPES:
    return JsonResponse({"success": False, "message": "the vote type [%s] is invalid. valid vote types are: %s" % (vote_type, ", ".join(VALID_VOTE_TYPES))})

  user_ip = __get_request_ip(request)

  if user_ip is None or user_ip.isspace():
    return JsonResponse({"success": False, "message": "the request was made from a nonexistent IP address."})

  return __add_vote(doi_name, user_ip, vote_type, True, request)

# GET /votes/<doi_name>/downvote
def downvote(request, doi_name, vote_type):
  if doi_name is None or doi_name.isspace():
    return JsonResponse({"success": False, "message": "doi name cannot be empty."})

  if vote_type is None or vote_type.isspace():
    return JsonResponse({"success": False, "message": "the vote type cannot be empty."})

  if vote_type not in VALID_VOTE_TYPES:
    return JsonResponse({"success": False, "message": "the vote type [%s] is invalid. valid vote types are: %s" % (vote_type, ", ".join(VALID_VOTE_TYPES))})

  user_ip = __get_request_ip(request)

  if user_ip is None or user_ip.isspace():
    return JsonResponse({"success": False, "message": "the request was made from a nonexistent IP address."})

  return __add_vote(doi_name, user_ip, vote_type, False, request)

# GET /votes/<doi_name>/view
def view(request, doi_name):
  user_ip = __get_request_ip(request)

  if user_ip is None or user_ip.isspace():
    return JsonResponse({"success": False, "message": "the request was made from a nonexistent IP address."})
  if doi_name is None or doi_name.isspace():
    return JsonResponse({"success": False, "message": "the doi name cannot be empty."})

  if not DigitalObject.objects.filter(doi=doi_name).exists():
    return JsonResponse({"success": False, "message": "the doi with name [%s] does not exist." % (doi_name)})

  doi_found = DigitalObject.objects.get(doi=doi_name)
  View.objects.create(doi=doi_found, ip_address=user_ip)
  return JsonResponse({"success": True})

def __add_vote(doi_name, user_ip, vote_type, is_upvote, request):
  if not DigitalObject.objects.filter(doi=doi_name).exists():
    return JsonResponse({"success": False, "message": "The DOI specified does not exist."})
  elif Vote.objects.filter(doi__doi=doi_name, ip_address=user_ip, vote_type=vote_type).exists():
    return JsonResponse({"success": False, "message": "You have already voted on this category before."})
  else:
    doi_found = DigitalObject.objects.get(doi=doi_name)
    Vote.objects.create(doi=doi_found, is_upvote=is_upvote, ip_address=user_ip, vote_type=vote_type)
    return JsonResponse({"success": True})

def __get_request_ip(request):
  # Try to get the real/remote address first (this works when the web server is accepting public connections)
  ip_found = get_real_ip(request)

  # Otherwise fall back to this method which works for local IP addresses only
  if ip_found is None:
    return get_ip(request)
  return ip_found