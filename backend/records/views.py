from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from .models import Organization, DataSource, IngestionRun, EmissionRecord, ReviewDecision, AuditEvent
from .serializers import OrganizationSerializer, DataSourceSerializer, IngestionRunSerializer, EmissionRecordSerializer, ReviewDecisionSerializer, AuditEventSerializer

def get_user_org(request):
    try: return request.user.profile.organization
    except Exception: return None

class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        return Organization.objects.filter(id=org.id) if org else Organization.objects.none()

class DataSourceViewSet(viewsets.ModelViewSet):
    serializer_class = DataSourceSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        return DataSource.objects.filter(organization=org) if org else DataSource.objects.none()

class IngestionRunViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = IngestionRunSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        return IngestionRun.objects.filter(data_source__organization=org).order_by('-started_at') if org else IngestionRun.objects.none()

class EmissionRecordViewSet(viewsets.ModelViewSet):
    serializer_class = EmissionRecordSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        if not org: return EmissionRecord.objects.none()
        qs=EmissionRecord.objects.filter(organization=org).order_by('-created_at')
        for param in ['status','scope','category']:
            val=self.request.query_params.get(param)
            if val: qs=qs.filter(**{param:val})
        return qs
    @action(detail=False, methods=['get'])
    def stats(self, request):
        org=get_user_org(request)
        if not org: return Response({})
        qs=EmissionRecord.objects.filter(organization=org)
        return Response({'total':qs.count(),'pending':qs.filter(status='PENDING').count(),'approved':qs.filter(status='APPROVED').count(),'flagged':qs.filter(status='FLAGGED').count(),'rejected':qs.filter(status='REJECTED').count(),'locked':qs.filter(status='LOCKED').count(),'by_scope':{'scope1':qs.filter(scope=1).count(),'scope2':qs.filter(scope=2).count(),'scope3':qs.filter(scope=3).count()},'by_category':list(qs.values('category').annotate(count=Count('id')))})
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        record=self.get_object()
        if record.status=='LOCKED': return Response({'error':'Record is locked for audit.'},status=400)
        action_type=request.data.get('action'); note=request.data.get('note','')
        status_map={'APPROVE':'APPROVED','REJECT':'REJECTED','FLAG':'FLAGGED','UNFLAG':'PENDING','LOCK':'LOCKED'}
        if action_type not in status_map: return Response({'error':'Invalid action.'},status=400)
        if action_type=='LOCK' and record.status!='APPROVED': return Response({'error':'Only approved records can be locked.'},status=400)
        record.status=status_map[action_type]; record.save()
        ReviewDecision.objects.create(emission_record=record,analyst=request.user,action=action_type,note=note)
        AuditEvent.objects.create(organization=record.organization,event_type='RECORD_APPROVED' if action_type=='APPROVE' else 'RECORD_LOCKED' if action_type=='LOCK' else 'RECORD_EDITED',actor=request.user,target_id=record.id,target_type='EmissionRecord',payload={'action':action_type,'note':note,'new_status':record.status})
        return Response(EmissionRecordSerializer(record).data)
    @action(detail=False, methods=['post'])
    def bulk_review(self, request):
        org=get_user_org(request); ids=request.data.get('ids',[]); action_type=request.data.get('action'); note=request.data.get('note','')
        status_map={'APPROVE':'APPROVED','REJECT':'REJECTED','FLAG':'FLAGGED','LOCK':'LOCKED'}
        if action_type not in status_map: return Response({'error':'Invalid action.'},status=400)
        recs=EmissionRecord.objects.filter(id__in=ids,organization=org).exclude(status='LOCKED')
        if action_type=='LOCK': recs=recs.filter(status='APPROVED')
        updated=0
        for rec in recs:
            rec.status=status_map[action_type]; rec.save()
            ReviewDecision.objects.create(emission_record=rec,analyst=request.user,action=action_type,note=note)
            updated+=1
        return Response({'updated':updated})

class ReviewDecisionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=ReviewDecisionSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        return ReviewDecision.objects.filter(emission_record__organization=org).order_by('-decided_at') if org else ReviewDecision.objects.none()

class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=AuditEventSerializer
    def get_queryset(self):
        org=get_user_org(self.request)
        return AuditEvent.objects.filter(organization=org).order_by('-created_at') if org else AuditEvent.objects.none()
