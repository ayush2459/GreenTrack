import statistics
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from records.models import DataSource, IngestionRun, RawRecord, EmissionRecord, AuditEvent
from .parsers import parse_sap_flat_file, parse_utility_csv, parse_travel_csv
PARSER_MAP={'SAP_FLAT_FILE':parse_sap_flat_file,'UTILITY_CSV':parse_utility_csv,'TRAVEL_CSV':parse_travel_csv}
def get_user_org(request):
    try:return request.user.profile.organization
    except Exception:return None
def auto_flag(record,org):
    siblings=[float(v) for v in EmissionRecord.objects.filter(organization=org,category=record.category,facility=record.facility).exclude(id=record.id).values_list('activity_value',flat=True)]
    if len(siblings)>=5:
        mean=statistics.mean(siblings);stdev=statistics.stdev(siblings)
        if stdev>0:
            z=(float(record.activity_value)-mean)/stdev
            if abs(z)>3:
                record.status='FLAGGED';record.flag_reason=f"Value ({float(record.activity_value):.2f} {record.activity_unit}) is {abs(z):.1f}σ {'above' if z>0 else 'below'} the mean ({mean:.2f}). Please verify.";record.save()
                AuditEvent.objects.create(organization=org,event_type='FLAG_AUTO',target_id=record.id,target_type='EmissionRecord',payload={'z_score':round(z,2),'mean':round(mean,2)})
class IngestView(APIView):
    parser_classes=[MultiPartParser]
    def post(self,request):
        org=get_user_org(request)
        if not org:return Response({'error':'No organization assigned.'},status=403)
        source_id=request.data.get('data_source_id');file_obj=request.FILES.get('file')
        if not source_id or not file_obj:return Response({'error':'data_source_id and file required.'},status=400)
        try:source=DataSource.objects.get(id=source_id,organization=org)
        except DataSource.DoesNotExist:return Response({'error':'Data source not found.'},status=404)
        run=IngestionRun.objects.create(data_source=source,triggered_by=request.user,raw_file=file_obj,status='PROCESSING')
        AuditEvent.objects.create(organization=org,event_type='INGESTION_STARTED',actor=request.user,target_id=run.id,target_type='IngestionRun',payload={'source':source.name,'filename':file_obj.name})
        parser_fn=PARSER_MAP.get(source.source_type)
        if not parser_fn:
            run.status='FAILED';run.notes=f'No parser for {source.source_type}';run.finished_at=timezone.now();run.save();return Response({'error':run.notes},status=400)
        results,errors=parser_fn(file_obj.read(),config=source.config);created=0
        for item in results:
            raw=RawRecord.objects.create(ingestion_run=run,source_row_ref=item.get('row_ref',''),raw_data=item.get('raw',{}))
            rec=EmissionRecord.objects.create(organization=org,raw_record=raw,category=item['category'],activity_value=item['activity_value'],activity_unit=item['activity_unit'],original_value=item['original_value'],original_unit=item['original_unit'],period_start=item['period_start'],period_end=item['period_end'],facility=item.get('facility',''),country_code=item.get('country_code',''),currency=item.get('currency',''),supplier=item.get('supplier',''),description=item.get('description',''),status='PENDING')
            auto_flag(rec,org);AuditEvent.objects.create(organization=org,event_type='RECORD_CREATED',actor=request.user,target_id=rec.id,target_type='EmissionRecord',payload={'source':source.name});created+=1
        for e in errors:RawRecord.objects.create(ingestion_run=run,source_row_ref=f"row_{e.get('row','')}",raw_data=e.get('raw',{}),parse_error=e.get('error',''))
        run.status='DONE';run.row_count=created;run.error_count=len(errors);run.finished_at=timezone.now();run.notes=f'Ingested {created} records. {len(errors)} errors.';run.save()
        AuditEvent.objects.create(organization=org,event_type='INGESTION_DONE',actor=request.user,target_id=run.id,target_type='IngestionRun',payload={'created':created,'errors':len(errors)})
        return Response({'run_id':str(run.id),'created':created,'errors':len(errors),'status':'DONE','error_details':errors[:10]})
