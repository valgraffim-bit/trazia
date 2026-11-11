"""Build a minimal public camera dataset from the ANSV registry (no user data)."""
import datetime
import json
import math
from pathlib import Path
import urllib.request

SOURCE = 'https://fotodeteccion.ansv.gov.co/data/sast.json'

def build(payload):
    if not isinstance(payload.get('results'), list):
        raise ValueError('Invalid ANSV registry')
    cameras = {}
    for record in payload['results']:
        for point in record.get('ubicaciones', []):
            if point.get('estado_operacion') != 'Operando' or point.get('estado_ubi') != 'Aprobada':
                continue
            try:
                lat = float(str(point['latitud']).replace(',', '.'))
                lng = float(str(point['longitud']).replace(',', '.'))
            except (KeyError, ValueError, TypeError):
                continue
            if not (math.isfinite(lat) and math.isfinite(lng) and -5.1 <= lat <= 14.3 and -82.2 <= lng <= -66.5):
                continue
            code = point.get('codigo_unico')
            if not code:
                continue
            cameras[code] = {
                'id': code, 'lat': lat, 'lng': lng,
                'address': point.get('direccion') or 'Punto de fotodetección',
                'city': record.get('municipio', ''), 'state': record.get('departamento', ''),
                'status': 'Operando', 'technology': point.get('tipo_tecnologia', ''),
            }
    if not cameras:
        raise ValueError('ANSV registry contains no usable operating locations')
    updated = datetime.datetime.fromtimestamp(payload['timestamp'], datetime.timezone.utc).isoformat()
    return {'source': 'ANSV', 'sourceUrl': 'https://fotodeteccion.ansv.gov.co/ubicaciones-aprobadas.html', 'updatedAt': updated, 'cameras': sorted(cameras.values(), key=lambda camera: camera['id'])}

if __name__ == '__main__':
    target = Path(__file__).resolve().parents[1] / 'data' / 'speed-cameras.json'
    try:
        with urllib.request.urlopen(SOURCE, timeout=25) as response:
            payload = json.load(response)
        result = build(payload)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        print(f"ANSV: {len(result['cameras'])} public locations; registry date {result['updatedAt']}")
    except Exception as error:
        if not target.exists():
            raise
        print(f'::warning::ANSV refresh unavailable ({type(error).__name__}); using the dated bundled dataset.')
