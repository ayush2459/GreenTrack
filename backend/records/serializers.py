from rest_framework import serializers
from .models import Organization, DataSource, IngestionRun, EmissionRecord, ReviewDecision, AuditEvent

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta: model = Organization; fields = '__all__'

class DataSourceSerializer(serializers.ModelSerializer):
    class Meta: model = DataSource; fields = '__all__'

class IngestionRunSerializer(serializers.ModelSerializer):
    data_source_name = serializers.CharField(source='data_source.name', read_only=True)
    source_type = serializers.CharField(source='data_source.source_type', read_only=True)
    triggered_by_username = serializers.CharField(source='triggered_by.username', read_only=True)
    class Meta: model = IngestionRun; fields = '__all__'

class EmissionRecordSerializer(serializers.ModelSerializer):
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    data_source_name = serializers.SerializerMethodField()
    def get_data_source_name(self, obj):
        if obj.raw_record and obj.raw_record.ingestion_run: return obj.raw_record.ingestion_run.data_source.name
        return ''
    class Meta: model = EmissionRecord; fields = '__all__'

class ReviewDecisionSerializer(serializers.ModelSerializer):
    analyst_username = serializers.CharField(source='analyst.username', read_only=True)
    class Meta:
        model = ReviewDecision
        fields = '__all__'
        read_only_fields = ['analyst','decided_at']

class AuditEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    class Meta: model = AuditEvent; fields = '__all__'
