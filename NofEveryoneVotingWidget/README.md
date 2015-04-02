# NofEveryoneVotingWidget
Voting widget developed for NofEveryone.com by Ben Katz <me@bakatz.com>

Basic requirements:
* Python==3.4.3
* MySQL Server (any version)

Library requirements (use `pip install` to install all of the below):
* Django==1.7.5
* django-ipware==0.1.0
* mysqlclient

Usage:

First install all of the required packages above. Next, edit settings.py with your MySQL db connection information. You may have to create the database first if it doesn't exist.  Finally, open a terminal and cd to the directory with manage.py in it. Run: 

`python manage.py runserver nofeveryone.com:3001`
