import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('catalog',Path(__file__).parents[1]/'scripts/update-cadastre-catalog.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class CatalogTests(unittest.TestCase):
 def run_case(self,owner=None,service=None,period='09-2026',fields_valid=True):
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'catalog.json';original={'schema':1,'period':'2026-08','municipalities':{'08078':'BARANOA'},'catalogSource':'https://example.com/catalog'};path.write_text(json.dumps(original))
   def get(url):
    if '/search?' in url:return{'results':[{'id':'a'*32}]}
    if '/content/items/' in url:return{'owner':owner or module.OWNER,'access':'public','licenseInfo':'Creative Commons Attribution ShareAlike 4.0','url':service or module.ROOT+'CATASTRO_PUBLICO_TEST/FeatureServer','title':'Base Catastral Pública del Gestor IGAC '+period,'id':'a'*32}
    if '/catalog/query?' in url:raise OSError('directory unavailable')
    if url.endswith('/FeatureServer?f=json'):return{'tables':[{'name':'REGISTRO_1','id':17}],'layers':[{'name':'U_TERRENO','id':7},{'name':'R_TERRENO','id':14}]}
    if '/17?' in url:return{'fields':[{'name':name} for name in (['DIRECCION','MUNICIPIO','NUMERO_PREDIAL'] if fields_valid else ['AREA'])]}
    return{'fields':[{'name':'CODIGO'},{'name':'codigo_municipio'}]}
   with patch.object(module,'PATH',path),patch.object(module,'get',side_effect=get):
    try:module.refresh();success=True
    except ValueError:success=False
   return success,json.loads(path.read_text()),original
 def test_selects_validated_official_cut_and_keeps_municipal_names_if_directory_fails(self):
  success,data,_=self.run_case();self.assertTrue(success);self.assertEqual(data['period'],'2026-09');self.assertEqual(data['municipalities'],{'08078':'BARANOA'})
 def test_rejects_foreign_owner_service_and_changed_schema_without_overwriting(self):
  for params in [{'owner':'someone_else'},{'service':'https://example.com/FeatureServer'},{'fields_valid':False}]:
   with self.subTest(params=params):
    success,data,original=self.run_case(**params);self.assertFalse(success);self.assertEqual(data,original)
 def test_never_regresses_to_an_older_data_period(self):
  success,data,original=self.run_case(period='07-2026');self.assertFalse(success);self.assertEqual(data,original)
if __name__=='__main__':unittest.main()
