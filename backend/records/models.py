import uuid
from django.db import models
from django.contrib.auth.models import User

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    timezone = models.CharField(max_length=64, default='UTC')
    fiscal_year_start_month = models.PositiveSmallIntegerField(default=1)
    def __str__(self): return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, null=True, blank=True)
    def __str__(self): return f"{self.user.username} - {self.organization}"

class DataSource(models.Model):
    SOURCE_TYPES = [('SAP_FLAT_FILE','SAP Flat File'),('UTILITY_CSV','Utility Portal CSV'),('TRAVEL_CSV','Corporate Travel CSV'),('GENERAL_ESG_CSV','General ESG CSV')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name='data_sources')
    source_type = models.CharField(max_length=32, choices=SOURCE_TYPES)
    name = models.CharField(max_length=255)
    config = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class IngestionRun(models.Model):
    STATUS = [('PENDING','Pending'),('PROCESSING','Processing'),('DONE','Done'),('FAILED','Failed')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    data_source = models.ForeignKey(DataSource, on_delete=models.PROTECT, related_name='runs')
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS, default='PENDING')
    triggered_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    raw_file = models.FileField(upload_to='raw_uploads/', null=True, blank=True)
    row_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

class RawRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ingestion_run = models.ForeignKey(IngestionRun, on_delete=models.PROTECT, related_name='raw_records')
    source_row_ref = models.CharField(max_length=255, blank=True)
    raw_data = models.JSONField()
    ingested_at = models.DateTimeField(auto_now_add=True)
    parse_error = models.TextField(blank=True)
    class Meta:
        indexes = [models.Index(fields=['ingestion_run'])]

class EmissionRecord(models.Model):
    SCOPE_CHOICES = [(1,'Scope 1'),(2,'Scope 2'),(3,'Scope 3')]
    STATUS_CHOICES = [('PENDING','Pending Review'),('APPROVED','Approved'),('REJECTED','Rejected'),('FLAGGED','Flagged'),('LOCKED','Locked for Audit')]
    CATEGORY_CHOICES = [('FUEL_STATIONARY','Fuel — Stationary Combustion'),('FUEL_MOBILE','Fuel — Mobile Combustion'),('ELECTRICITY','Purchased Electricity'),('HEAT_STEAM','Purchased Heat/Steam'),('BUSINESS_TRAVEL','Business Travel'),('PROCUREMENT','Purchased Goods & Services'),('FREIGHT','Upstream Transportation'),('REFRIGERANT_LEAKAGE','Refrigerant Leakage')]
    SCOPE_MAP = {'FUEL_STATIONARY':1,'FUEL_MOBILE':1,'REFRIGERANT_LEAKAGE':1,'ELECTRICITY':2,'HEAT_STEAM':2,'BUSINESS_TRAVEL':3,'PROCUREMENT':3,'FREIGHT':3}
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name='emission_records')
    raw_record = models.ForeignKey(RawRecord, on_delete=models.PROTECT, null=True, related_name='emission_records')
    split_index = models.PositiveSmallIntegerField(null=True, blank=True)
    scope = models.PositiveSmallIntegerField(choices=SCOPE_CHOICES)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    activity_value = models.DecimalField(max_digits=18, decimal_places=6)
    activity_unit = models.CharField(max_length=32)
    original_value = models.DecimalField(max_digits=18, decimal_places=6)
    original_unit = models.CharField(max_length=32)
    period_start = models.DateField()
    period_end = models.DateField()
    facility = models.CharField(max_length=255, blank=True)
    country_code = models.CharField(max_length=3, blank=True)
    currency = models.CharField(max_length=3, blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    reported_emissions_kg_co2e = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    flag_reason = models.TextField(blank=True)
    is_manually_edited = models.BooleanField(default=False)
    edited_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='edited_records')
    edited_at = models.DateTimeField(null=True, blank=True)
    edit_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [models.Index(fields=['organization','status']), models.Index(fields=['organization','scope','period_start']), models.Index(fields=['organization','category'])]
        constraints = [models.UniqueConstraint(fields=['raw_record','split_index'], name='unique_emission_per_raw_split')]
    def save(self, *args, **kwargs):
        self.scope = self.SCOPE_MAP.get(self.category, 3)
        super().save(*args, **kwargs)

class ReviewDecision(models.Model):
    ACTION_CHOICES = [('APPROVE','Approved'),('REJECT','Rejected'),('FLAG','Flagged'),('UNFLAG','Unflagged'),('LOCK','Locked for Audit'),('COMMENT','Comment Added')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    emission_record = models.ForeignKey(EmissionRecord, on_delete=models.PROTECT, related_name='review_decisions')
    analyst = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    note = models.TextField(blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ['-decided_at']

class AuditEvent(models.Model):
    EVENT_TYPES = [('RECORD_CREATED','Record Created'),('RECORD_EDITED','Record Edited'),('RECORD_APPROVED','Record Approved'),('RECORD_LOCKED','Record Locked'),('INGESTION_STARTED','Ingestion Started'),('INGESTION_DONE','Ingestion Completed'),('FLAG_AUTO','Automatic Flag Raised')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    target_id = models.UUIDField(null=True, blank=True)
    target_type = models.CharField(max_length=64, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [models.Index(fields=['organization','created_at']), models.Index(fields=['target_id'])]
