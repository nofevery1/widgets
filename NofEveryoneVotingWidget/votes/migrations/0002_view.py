# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('votes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('ip_address', models.CharField(max_length=50, null=True, blank=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('doi', models.ForeignKey(related_name='views', to='votes.DigitalObject')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
