from django.contrib import admin
from votes.models import *

# Allow the following DB objects to be editable in the Django administration page
admin.site.register(DigitalObject)
admin.site.register(Vote)
admin.site.register(View)