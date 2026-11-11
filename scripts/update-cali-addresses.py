#!/usr/bin/env python3
"""Build an independently hosted CC BY-SA address snapshot; publish only after validation."""
import argparse, datetime as dt, hashlib, io, json, math, os, re, shutil, tempfile, time, urllib.parse, urllib.request, zipfile
from pathlib import Path
WFS='https://ws-idesc.cali.gov.co/geoserver/wfs'
LAYER='dapm:pdt_nmc_nomenclatura_domiciliaria'
META='https://mg-idesc.cali.gov.co/geonetwork/geonetwork/api/records/26efce58-37c7-44e4-9386-b925c92d17d1'
ROADS={'CARRERA':'KR','CRA':'KR','CR':'KR','KR':'KR','CALLE':'CL','CL':'CL','AVENIDA':'AV','AVDA':'AV','AV':'AV','DIAGONAL':'DG','DIAG':'DG','DG':'DG','TRANSVERSAL':'TV','TRANS':'TV','TV':'TV'}
import unicodedata

def address_key(text):
    text=''.join(c for c in unicodedata.normalize('NFD',str(text or '')) if not unicodedata.combining(c)).upper().split('(')[0].strip()
    m=re.fullmatch(r'(CARRERA|CRA|CR|KR|CALLE|CL|AVENIDA|AVDA|AV|DIAGONAL|DIAG|DG|TRANSVERSAL|TRANS|TV)\.?\s*(\d[A-Z0-9\s]*)\s*#\s*(\d[A-Z0-9\s]*?)\s*-\s*(\d+[A-Z]?)\s*',text)
    if not m:return None
    return re.sub('[^A-Z0-9#-]','',ROADS[m[1]]+m[2]+'#'+m[3]+'-'+m[4])

def encoded(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def digest(data):return hashlib.sha256(data).hexdigest()
def bucket(key):return digest(key.encode())[:2]
def valid_point(point):return len(point)==2 and all(isinstance(n,(float,int)) and not isinstance(n,bool) and math.isfinite(n) for n in point) and -76.65<=point[0]<=-76.40 and 3.25<=point[1]<=3.55

def get_bytes(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Trazia-address-updater/1.0'}),timeout=60) as response:return response.read()
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)

def query(**kwargs):return get_bytes(WFS+'?'+urllib.parse.urlencode({'service':'WFS','version':'2.0.0','request':'GetFeature','typeNames':LAYER,**kwargs}))
def source_count():
    import xml.etree.ElementTree as ET
    count=ET.fromstring(query(resultType='hits')).attrib.get('numberMatched','')
    if not count.isdigit():raise ValueError('Invalid source count')
    return int(count)

def validate(root):
    manifest=json.loads((root/'manifest.json').read_text())
    if manifest.get('schema')!=1 or not re.fullmatch(r'\d{8}T\d{6}Z',manifest.get('version','')):raise ValueError('Invalid manifest')
    count=0
    for part,info in manifest['buckets'].items():
        if not re.fullmatch('[0-9a-f]{2}',part) or info['path']!=f"{manifest['version']}/{part}.json":raise ValueError('Invalid bucket path')
        data=(root/info['path']).read_bytes()
        if digest(data)!=info['sha256']:raise ValueError('Invalid bucket checksum')
        rows=json.loads(data)
        for key,entries in rows.items():
            if bucket(key)!=part:raise ValueError('Invalid bucket')
            for row in entries:
                if len(row)!=6 or address_key(row[0])!=key or not valid_point(row[1:3]):raise ValueError('Invalid address record')
                count+=1
    if count!=manifest['recordCount'] or count<1:raise ValueError('Incomplete snapshot')
    return manifest

def build(root,total,pages,minimum=100000,previous=None):
    buckets={};seen=set();received=0;last_gid=-1;cut_dates=set()
    for features in pages:
        if not features:raise ValueError('Truncated source page')
        for feature in features:
            received+=1
            p=feature.get('properties') or {};gid=p.get('gid')
            if not isinstance(gid,int) or gid<=last_gid:raise ValueError('Unstable pagination')
            last_gid=gid
            address=p.get('nddirecc');key=address_key(address);geometry=feature.get('geometry') or {};point=geometry.get('coordinates') or []
            if geometry.get('type')!='Point' or not key or not valid_point(point):continue
            row=[address,*point,p.get('ndbarrio') or '',p.get('ndestado') or '',p.get('ndfechcort') or '']
            identity=(key,*point,row[4])
            if identity in seen:continue
            seen.add(identity)
            buckets.setdefault(bucket(key),{}).setdefault(key,[]).append(row)
            if row[5]:cut_dates.add(row[5])
    if received!=total:raise ValueError(f'Incomplete source: {received}/{total}')
    count=len(seen)
    if count<minimum or (previous and count<previous['recordCount']*.9):raise ValueError('Unexpected address coverage drop; retaining previous snapshot')
    now=dt.datetime.now(dt.timezone.utc);version=now.strftime('%Y%m%dT%H%M%SZ');folder=root/version;folder.mkdir(parents=True)
    manifest={'schema':1,'version':version,'updatedAt':now.isoformat(),'source':WFS,'layer':LAYER,'metadata':META,'license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'Departamento Administrativo de Planeación / IDESC Cali','changes':'Selected public fields; normalized index, deduplication and validation by Trazia.','sourceCount':total,'recordCount':count,'excludedCount':total-count,'sourceCutDates':sorted(cut_dates),'buckets':{}}
    for part,rows in sorted(buckets.items()):
        for entries in rows.values():entries.sort(key=lambda row:(row[4]!='Certificada',row[0]))
        data=encoded(rows);path=f'{version}/{part}.json';(root/path).write_bytes(data)
        manifest['buckets'][part]={'path':path,'sha256':digest(data)}
    (root/'manifest.json').write_bytes(encoded(manifest));validate(root)
    with zipfile.ZipFile(root/'snapshot.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for file in [root/'manifest.json',*sorted(folder.glob('*.json'))]:archive.write(file,file.relative_to(root))
    return manifest

def recover(root,published):
    data=get_bytes(published.rstrip('/')+'/data/addresses/cali/snapshot.zip')
    with tempfile.TemporaryDirectory() as temp:
        staging=Path(temp)/'snapshot';staging.mkdir()
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if sum(item.file_size for item in archive.infolist())>300_000_000:raise ValueError('Oversized backup')
            for item in archive.infolist():
                path=Path(item.filename)
                if path.is_absolute() or '..' in path.parts:raise ValueError('Unsafe backup')
            archive.extractall(staging)
        manifest=validate(staging)
        if root.exists():shutil.rmtree(root)
        shutil.copytree(staging,root);(root/'snapshot.zip').write_bytes(data)
        return manifest

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='data/addresses/cali');parser.add_argument('--published',default='https://valgraffim-bit.github.io/trazia');parser.add_argument('--force',action='store_true');args=parser.parse_args()
    root=Path(args.output);previous=None
    try:previous=validate(root)
    except Exception:
        try:previous=recover(root,args.published)
        except Exception:print('No valid previous snapshot available; attempting initial download.',flush=True)
    if previous and not args.force:
        age=dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(previous['updatedAt'])
        if age.total_seconds()<6*86400:
            print(f"Keeping recent snapshot: {previous['recordCount']} addresses, {previous['updatedAt']}");return
    try:
        total=source_count()
        if total<100000:raise ValueError('Unexpectedly small source')
        def pages():
            for start in range(0,total,10000):
                payload=json.loads(query(outputFormat='application/json',srsName='EPSG:4326',count='10000',startIndex=str(start),sortBy='gid A',propertyName='gid,nddirecc,ndbarrio,ndestado,ndfechcort,the_geom'))
                features=payload.get('features')
                if not isinstance(features,list) or len(features)!=min(10000,total-start):raise ValueError('Incomplete page')
                print(f'Downloaded {start+len(features)}/{total}',flush=True);yield features;time.sleep(.15)
            if source_count()!=total:raise ValueError('Source changed during download')
        root.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root.parent) as temp:
            staging=Path(temp)/'snapshot';staging.mkdir()
            manifest=build(staging,total,pages(),previous=previous)
            # Keep previous immutable buckets available to clients with an older manifest.
            if previous:
                old=root/previous['version']
                if old.is_dir():shutil.copytree(old,staging/previous['version'],dirs_exist_ok=True)
            backup=root.with_name(root.name+'.previous')
            if backup.exists():shutil.rmtree(backup)
            if root.exists():root.rename(backup)
            try:staging.rename(root)
            except Exception:
                if backup.exists():backup.rename(root)
                raise
            if backup.exists():shutil.rmtree(backup)
            print(f"Published snapshot: {manifest['recordCount']} searchable addresses from {total} source records.",flush=True)
    except Exception as error:
        if previous:
            validate(root);print(f'::warning::Address update failed; retaining valid snapshot: {error}',flush=True)
        else:raise
if __name__=='__main__':main()
