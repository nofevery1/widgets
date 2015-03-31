from django.conf.urls import patterns, url
from votes import views

urlpatterns = patterns('',
  url(r'^$', views.index, name='index'), # Matches: GET /votes/index
  url(r'^(?P<doi_name>.+)/$', views.detail, name='detail'), # Matches: GET /votes/<doi_name>
  url(r'^(?P<doi_name>.+)/view$', views.view, name='view'), # Matches: GET /votes/<doi_name>/view -- this URL is used to add a view for the DOI
  url(r'^(?P<doi_name>.+)/(?P<vote_type>.+)/upvote$', views.upvote, name='upvote'), # Matches: GET /votes/<doi_name>/upvote
  url(r'^(?P<doi_name>.+)/(?P<vote_type>.+)/downvote$', views.downvote, name='downvote'), # Matches: GET /votes/<doi_name>/downvote
)