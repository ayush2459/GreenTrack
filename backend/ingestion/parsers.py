import csv, io, math
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

AIRPORT_COORDS={'LHR':(51.4775,-0.4614),'JFK':(40.6413,-73.7781),'CDG':(49.0097,2.5479),'FRA':(50.0379,8.5622),'DXB':(25.2528,55.3644),'SIN':(1.3644,103.9915),'BOM':(19.0896,72.8656),'DEL':(28.5562,77.1000),'MAN':(53.3537,-2.2750),'AMS':(52.3086,4.7639),'MAD':(40.4983,-3.5676),'ORD':(41.9742,-87.9073),'LAX':(33.9425,-118.4081),'SFO':(37.6213,-122.3790),'NRT':(35.7720,140.3929),'SYD':(-33.9461,151.1772),'HKG':(22.3080,113.9185)}
SAP_DE={'Buchungsdatum':'posting_date','Belegnummer':'document_number','Werk':'plant_code','Sachkonto':'gl_account','Menge':'quantity','Einheit':'unit','Betrag in Hauswährung':'amount_local','Währung':'currency','Belegkopftext':'description'}
SAP_EN={'Posting Date':'posting_date','Document Number':'document_number','Plant':'plant_code','G/L Account':'gl_account','Quantity':'quantity','Unit':'unit','Amount in Local Currency':'amount_local','Currency':'currency','Document Header Text':'description'}
GL_MAP={'4100000':'FUEL_STATIONARY','4100001':'FUEL_STATIONARY','5200010':'FUEL_MOBILE','5200011':'FUEL_MOBILE','4200000':'ELECTRICITY','6100000':'PROCUREMENT','6100001':'PROCUREMENT'}
def _dec(val):
    if not val or str(val).strip()=='': return Decimal('0')
    s=str(val).strip().replace('\xa0','').replace(' ','')
    if ',' in s and '.' in s: s=s.replace('.','').replace(',','.') if s.index('.')<s.index(',') else s.replace(',','')
    elif ',' in s: s=s.replace(',','.')
    try: return Decimal(s)
    except InvalidOperation: return Decimal('0')
def _date(val):
    for fmt in ['%d.%m.%Y','%Y-%m-%d','%m/%d/%Y','%d/%m/%Y']:
        try: return datetime.strptime(str(val).strip(),fmt).date()
        except ValueError: pass
    return date.today()
def _haversine(la1,lo1,la2,lo2):
    R=6371;p1,p2=math.radians(la1),math.radians(la2);dp,dl=math.radians(la2-la1),math.radians(lo2-lo1);a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R*2*math.atan2(math.sqrt(a),math.sqrt(1-a))
def parse_sap_flat_file(content,config=None):
    config=config or {};results=[];errors=[];col_map=SAP_DE if config.get('language','de')=='de' else SAP_EN;plant_lookup=config.get('plant_lookup',{});gl_map=config.get('gl_category_map',GL_MAP)
    try:text=content.decode('utf-8-sig')
    except UnicodeDecodeError:text=content.decode('latin-1')
    reader=csv.DictReader(io.StringIO(text),delimiter=config.get('delimiter','\t'))
    for i,row in enumerate(reader):
        try:
            n={col_map.get((k or '').strip(),(k or '').strip().lower()): (v or '').strip() for k,v in row.items()};qty=_dec(n.get('quantity','0'))
            if qty<=0: continue
            unit=n.get('unit','L').upper();plant=n.get('plant_code','');pi=plant_lookup.get(plant,{});gl=n.get('gl_account','');cat=gl_map.get(gl,'PROCUREMENT');d=_date(n.get('posting_date',''));u='L' if 'FUEL' in cat else 'KWH' if cat=='ELECTRICITY' else 'KG'
            results.append({'row_ref':f'row_{i+2}','raw':dict(row),'category':cat,'activity_value':qty,'activity_unit':u,'original_value':qty,'original_unit':unit,'period_start':d,'period_end':d,'facility':pi.get('name',plant),'country_code':pi.get('country',''),'currency':n.get('currency','EUR'),'description':n.get('description','')})
        except Exception as e:errors.append({'row':i+2,'error':str(e),'raw':dict(row)})
    return results,errors
def parse_utility_csv(content,config=None):
    config=config or {};results=[];errors=[]
    try:text=content.decode('utf-8-sig')
    except UnicodeDecodeError:text=content.decode('latin-1')
    for i,row in enumerate(csv.DictReader(io.StringIO(text))):
        try:
            mpan=(row.get('MPAN') or '').strip();site=(row.get('Site Name') or mpan).strip();kwh=_dec(row.get('Consumption (kWh)','0'))
            if kwh<=0:errors.append({'row':i+2,'error':'Zero consumption','raw':dict(row)});continue
            ps=_date(row.get('Period Start',''));pe=_date(row.get('Period End',''));country=config.get('default_country','GBR')
            results.append({'row_ref':f'row_{i+2}_mpan_{mpan}','raw':dict(row),'category':'ELECTRICITY','activity_value':kwh,'activity_unit':'KWH','original_value':kwh,'original_unit':'KWH','period_start':ps,'period_end':pe,'facility':site,'country_code':country,'currency':'GBP','description':f'Electricity — {site}'})
        except Exception as e:errors.append({'row':i+2,'error':str(e),'raw':dict(row)})
    return results,errors
def parse_travel_csv(content,config=None):
    config=config or {};results=[];errors=[]
    try:text=content.decode('utf-8-sig')
    except UnicodeDecodeError:text=content.decode('latin-1')
    for i,row in enumerate(csv.DictReader(io.StringIO(text))):
        try:
            et=(row.get('Expense Type') or '').strip().lower();amt=_dec(row.get('Amount (GBP)',row.get('amount','0')));td_raw=row.get('Travel Date',row.get('Check-in',''));td=_date(td_raw) if td_raw.strip() else date.today()
            if 'air' in et or 'flight' in et:
                o=(row.get('Origin') or '').strip().upper();d=(row.get('Destination') or '').strip().upper()
                if o in AIRPORT_COORDS and d in AIRPORT_COORDS:
                    a,b=AIRPORT_COORDS[o];c,e=AIRPORT_COORDS[d];km=Decimal(str(round(_haversine(a,b,c,e),2)));haul='long' if km>3700 else 'short' if km>500 else 'domestic';desc=f'Flight {o}→{d} ({haul}-haul)'
                else:km=Decimal('0');desc=f'Flight {o}→{d} (unknown airports)'
                results.append({'row_ref':f'row_{i+2}_flight_{o}_{d}','raw':dict(row),'category':'BUSINESS_TRAVEL','activity_value':km,'activity_unit':'KM','original_value':km,'original_unit':'KM','period_start':td,'period_end':td,'facility':'','country_code':'','currency':row.get('Currency','GBP'),'description':desc,'supplier':row.get('Merchant','')})
            elif 'hotel' in et or 'accommodation' in et:
                ci=_date(row.get('Check-in','')) if (row.get('Check-in') or '').strip() else td;co=_date(row.get('Check-out','')) if (row.get('Check-out') or '').strip() else ci;nights=Decimal(str(max(1,(co-ci).days)))
                results.append({'row_ref':f'row_{i+2}_hotel_{i}','raw':dict(row),'category':'BUSINESS_TRAVEL','activity_value':nights,'activity_unit':'ROOM_NIGHTS','original_value':nights,'original_unit':'ROOM_NIGHTS','period_start':ci,'period_end':co,'facility':row.get('City',''),'country_code':'','currency':row.get('Currency','GBP'),'description':f"Hotel — {row.get('Merchant','')} — {int(nights)} night(s)",'supplier':row.get('Merchant','')})
            elif any(t in et for t in ['taxi','rail','ground','car','train']):
                dr=(row.get('Distance (km)') or '').strip();dist=_dec(dr) if dr else (amt/Decimal('0.25') if amt>0 else Decimal('0'))
                results.append({'row_ref':f'row_{i+2}_ground_{i}','raw':dict(row),'category':'BUSINESS_TRAVEL','activity_value':dist,'activity_unit':'KM','original_value':dist,'original_unit':'KM','period_start':td,'period_end':td,'facility':row.get('City',''),'country_code':'','currency':row.get('Currency','GBP'),'description':f'Ground ({et})','supplier':row.get('Merchant','')})
        except Exception as e:errors.append({'row':i+2,'error':str(e),'raw':dict(row)})
    return results,errors
