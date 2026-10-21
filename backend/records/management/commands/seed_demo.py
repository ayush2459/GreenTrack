from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from records.models import Organization, UserProfile, DataSource, IngestionRun, RawRecord, EmissionRecord
from decimal import Decimal
from datetime import date

class Command(BaseCommand):
    help = 'Seed GreenTrack demo workspace data'
    def handle(self,*args,**kwargs):
        org,_=Organization.objects.get_or_create(name='Acme Corp',slug='acme-corp',defaults={'timezone':'Europe/London'})
        user,created=User.objects.get_or_create(username='analyst',defaults={'email':'analyst@acme.com','first_name':'Sarah','last_name':'Chen'})
        if created:user.set_password('demo1234');user.save()
        UserProfile.objects.get_or_create(user=user,defaults={'organization':org});Token.objects.get_or_create(user=user)
        sap,_=DataSource.objects.get_or_create(organization=org,source_type='SAP_FLAT_FILE',name='SAP FI — Germany Operations',defaults={'config':{'language':'de','plant_lookup':{'DE01':{'name':'Berlin Manufacturing','country':'DEU'},'UK03':{'name':'Leeds Warehouse','country':'GBR'}}}})
        util,_=DataSource.objects.get_or_create(organization=org,source_type='UTILITY_CSV',name='UK Electricity — National Grid',defaults={'config':{'default_country':'GBR'}})
        trav,_=DataSource.objects.get_or_create(organization=org,source_type='TRAVEL_CSV',name='Concur Travel — Global',defaults={'config':{}})
        rows=[
        {'src':sap,'cat':'FUEL_STATIONARY','av':'25000','au':'L','ov':'25000','ou':'L','ps':date(2024,1,15),'pe':date(2024,1,15),'fac':'Berlin Manufacturing','cc':'DEU','cur':'EUR','desc':'Diesel — Jan Week 2','status':'APPROVED'},
        {'src':sap,'cat':'FUEL_MOBILE','av':'8500','au':'L','ov':'8500','ou':'L','ps':date(2024,1,22),'pe':date(2024,1,22),'fac':'Leeds Warehouse','cc':'GBR','cur':'EUR','desc':'Unleaded — fleet','status':'PENDING'},
        {'src':sap,'cat':'FUEL_STATIONARY','av':'1200','au':'KG','ov':'1200','ou':'KG','ps':date(2024,1,31),'pe':date(2024,1,31),'fac':'Berlin Manufacturing','cc':'DEU','cur':'EUR','desc':'LPG — forklift','status':'FLAGGED','flag':'Value unusually high. Verify against delivery note.'},
        {'src':util,'cat':'ELECTRICITY','av':'47250','au':'KWH','ov':'47250','ou':'KWH','ps':date(2024,1,17),'pe':date(2024,2,15),'fac':'London HQ — Floor 3','cc':'GBR','cur':'GBP','desc':'National Grid — MPAN 1012345678900','status':'APPROVED'},
        {'src':util,'cat':'ELECTRICITY','av':'31800','au':'KWH','ov':'31800','ou':'KWH','ps':date(2024,1,17),'pe':date(2024,2,15),'fac':'London HQ — Floor 4','cc':'GBR','cur':'GBP','desc':'National Grid — MPAN 1012345678901','status':'PENDING'},
        {'src':util,'cat':'ELECTRICITY','av':'112400','au':'KWH','ov':'112400','ou':'KWH','ps':date(2024,1,22),'pe':date(2024,2,20),'fac':'Leeds Warehouse','cc':'GBR','cur':'GBP','desc':'National Grid — MPAN 1098765432100','status':'LOCKED'},
        {'src':trav,'cat':'BUSINESS_TRAVEL','av':'5541','au':'KM','ov':'5541','ou':'KM','ps':date(2024,1,8),'pe':date(2024,1,8),'fac':'','cc':'','cur':'GBP','desc':'Flight LHR→JFK (long-haul)','status':'APPROVED'},
        {'src':trav,'cat':'BUSINESS_TRAVEL','av':'3','au':'ROOM_NIGHTS','ov':'3','ou':'ROOM_NIGHTS','ps':date(2024,1,8),'pe':date(2024,1,11),'fac':'New York','cc':'USA','cur':'GBP','desc':'Hotel — Marriott — 3 nights','status':'PENDING'},
        {'src':trav,'cat':'BUSINESS_TRAVEL','av':'340','au':'KM','ov':'340','ou':'KM','ps':date(2024,1,15),'pe':date(2024,1,15),'fac':'Manchester','cc':'GBR','cur':'GBP','desc':'Rail — MAN→London Euston','status':'PENDING'},
        {'src':trav,'cat':'BUSINESS_TRAVEL','av':'341','au':'KM','ov':'341','ou':'KM','ps':date(2024,1,22),'pe':date(2024,1,22),'fac':'','cc':'','cur':'GBP','desc':'Flight LHR→CDG (short-haul)','status':'REJECTED'},]
        for d in rows:
            run,_=IngestionRun.objects.get_or_create(data_source=d['src'],defaults={'triggered_by':user,'status':'DONE','row_count':1})
            raw=RawRecord.objects.create(ingestion_run=run,source_row_ref='demo',raw_data={'demo':True})
            EmissionRecord.objects.create(organization=org,raw_record=raw,category=d['cat'],scope=EmissionRecord.SCOPE_MAP[d['cat']],activity_value=Decimal(d['av']),activity_unit=d['au'],original_value=Decimal(d['ov']),original_unit=d['ou'],period_start=d['ps'],period_end=d['pe'],facility=d['fac'],country_code=d['cc'],currency=d['cur'],description=d['desc'],status=d['status'],flag_reason=d.get('flag',''))
        self.stdout.write(self.style.SUCCESS('GreenTrack demo is ready. Login: analyst / demo1234'))
