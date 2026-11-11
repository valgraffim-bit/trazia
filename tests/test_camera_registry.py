import unittest
import runpy
from pathlib import Path
build = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts' / 'update-speed-cameras.py'))['build']
class RegistryTest(unittest.TestCase):
    def test_uses_actual_device_point_and_excludes_unapproved_or_inactive(self):
        point = {'codigo_unico': 'fixture', 'latitud': '3,4', 'longitud': '-76,5', 'estado_operacion': 'Operando', 'estado_ubi': 'Aprobada', 'direccion': 'Fixture'}
        rows = [point, {**point, 'codigo_unico': 'expired', 'estado_operacion': 'Vencida'}, {**point, 'codigo_unico': 'proposed', 'estado_ubi': 'Propuesta'}, {**point, 'codigo_unico': 'invalid', 'latitud': 'NaN'}]
        result = build({'timestamp': 1794297633, 'results': [{'municipio': 'CALI', 'ubicaciones': rows}]})
        self.assertEqual(len(result['cameras']), 1)
        self.assertEqual(result['cameras'][0]['lat'], 3.4)
        self.assertEqual(result['cameras'][0]['lng'], -76.5)
if __name__ == '__main__': unittest.main()
