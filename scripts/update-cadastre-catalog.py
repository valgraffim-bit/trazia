#!/usr/bin/env python3
"""Refresh the official IGAC query catalog without downloading owners or parcel records."""
import datetime,json,re,urllib.parse,urllib.request
from pathlib import Path
ROOT='https://services2.arcgis.com/RVvWzU3lgJISqdke/arcgis/rest/services/'
OWNER='sandra.maldonado_IGAC_OIT'
PATH=Path('data/cadastre/igac.json')
def get(url):
    with urllib.request.urlopen(url,timeout=25) as response:return json.load(response)
def refresh():
    previous=json.loads(PATH.read_text());params={'f':'json','q':f'owner:{OWNER} AND type:"Feature Service" AND title:"Base Catastral Pública del Gestor IGAC"','num':'5','sortField':'modified','sortOrder':'desc'}
    candidates=get('https://www.arcgis.com/sharing/rest/search?'+urllib.parse.urlencode(params)).get('results',[])
    for candidate in candidates:
        try:
            item=get(f"https://www.arcgis.com/sharing/rest/content/items/{candidate['id']}?f=json")
            service=item.get('url','')
            if item.get('owner')!=OWNER or item.get('access')!='public' or not re.fullmatch(re.escape(ROOT)+r'[A-Za-z0-9_]+/FeatureServer',service):continue
            license=item.get('licenseInfo','')
            if not re.search(r'(?:ShareAlike|Compartir\s*Igual)',license,re.I) or not re.search(r'4\.0',license):continue
            metadata=get(service+'?f=json');tables={x['name']:x['id'] for x in metadata.get('tables',[])};layers={x['name']:x['id'] for x in metadata.get('layers',[])}
            ids={'registry':tables['REGISTRO_1'],'urban':layers['U_TERRENO'],'rural':layers['R_TERRENO']}
            for name,layer in ids.items():
                fields={x['name'] for x in get(f'{service}/{layer}?f=json')['fields']}
                expected={'DIRECCION','MUNICIPIO','NUMERO_PREDIAL'} if name=='registry' else {'CODIGO','codigo_municipio'}
                if not expected<=fields:raise ValueError('Changed schema')
            period=re.search(r'(0[1-9]|1[0-2])[- ](20\d{2})',item['title'])
            if not period:continue
            if f'{period[2]}-{period[1]}' < previous.get('period',''):continue
            data={**previous,**ids,'itemId':item['id'],'service':service,'title':item['title'],'period':f'{period[2]}-{period[1]}','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
            # Keep the checked-in municipality list if the directory is temporarily unavailable.
            try:
                query={'f':'json','where':'1=1','outFields':'codigo_municipio,nombre_municipio','returnGeometry':'false','resultRecordCount':'2000'}
                directory=get(previous['catalogSource']+'/query?'+urllib.parse.urlencode(query))
                cities={row['attributes']['codigo_municipio']:row['attributes']['nombre_municipio'] for row in directory['features'] if re.fullmatch(r'\d{5}',row['attributes']['codigo_municipio'])}
                if not directory.get('exceededTransferLimit') and len(cities)>=700:data['municipalities']=cities
            except Exception:pass
            temporary=PATH.with_suffix('.tmp');temporary.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));temporary.replace(PATH)
            print(f"IGAC catalog: {data['title']}; {len(data['municipalities'])} municipality names. No parcel records downloaded.");return
        except Exception:continue
    raise ValueError('No validated official IGAC source available')
if __name__=='__main__':
    try:refresh()
    except Exception as error:
        if PATH.exists():print(f'::warning::Keeping bundled cadastre catalog: {error}')
        else:raise
