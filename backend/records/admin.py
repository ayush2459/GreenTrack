from django.contrib import admin
from .models import Organization, UserProfile, DataSource, IngestionRun, RawRecord, EmissionRecord, ReviewDecision, AuditEvent
for model in [Organization,UserProfile,DataSource,IngestionRun,RawRecord,EmissionRecord,ReviewDecision,AuditEvent]:
    admin.site.register(model)
