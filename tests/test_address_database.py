import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('updater',Path(__file__).parents[1]/'scripts/update-cali-addresses.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
def feature(gid,address='KR 15 # 12 - 83',point=None):
 return {'geometry':{'type':'Point','coordinates':point or [-76.52895843,3.44289173]},'properties':{'gid':gid,'nddirecc':address,'ndbarrio':'San Pascual','ndestado':'Certificada','ndfechcort':'2026-09-03Z','ndnpn':'NOT TO BE PUBLISHED'}}
class AddressDatabaseTests(unittest.TestCase):
 def test_snapshot_is_searchable_checksummed_and_minimal(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);manifest=db.build(root,3,[[feature(1),feature(2),feature(3,'CL 12 # 11 - 49')]],minimum=1)
   self.assertEqual(manifest['recordCount'],2);self.assertEqual(manifest['sourceCount'],3);self.assertEqual(db.validate(root),manifest)
   data=b''.join((root/info['path']).read_bytes() for info in manifest['buckets'].values())
   self.assertNotIn(b'NOT TO BE PUBLISHED',data);self.assertTrue((root/'snapshot.zip').exists())
   info=next(iter(manifest['buckets'].values()));(root/info['path']).write_text('{}')
   with self.assertRaisesRegex(ValueError,'checksum'):db.validate(root)
 def test_rejects_partial_pages_unstable_order_and_large_coverage_drop(self):
  for total,pages,previous in [(2,[[feature(1)]],None),(2,[[feature(2),feature(1)]],None),(1,[[feature(1)]],{'recordCount':100})]:
   with self.subTest(total=total,previous=previous),tempfile.TemporaryDirectory() as directory:
    with self.assertRaises(ValueError):db.build(Path(directory),total,pages,minimum=1,previous=previous)
    self.assertFalse((Path(directory)/'manifest.json').exists())
 def test_normalization_preserves_house_boundaries_and_street_suffix_digits(self):
  self.assertEqual(db.address_key('Cra. 83b 3 #45-53'),db.address_key('KR 83 B 3 # 45 - 53'))
  self.assertNotEqual(db.address_key('KR 15 # 1-283'),db.address_key('KR 15 #12-83'))
  self.assertNotEqual(db.address_key('KR 83 B #45-53'),db.address_key('KR 83 B 3 #45-53'))
 def test_snapshot_backup_is_recoverable(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)/'original';root.mkdir();manifest=db.build(root,1,[[feature(1)]],minimum=1)
   previous_get=db.get_bytes;db.get_bytes=lambda _: (root/'snapshot.zip').read_bytes()
   try:
    restored=Path(directory)/'restored';self.assertEqual(db.recover(restored,'https://example.com'),manifest);db.validate(restored)
   finally:db.get_bytes=previous_get
 def test_failed_refresh_preserves_last_valid_database(self):
  import sys
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)/'cali';root.mkdir();manifest=db.build(root,1,[[feature(1)]],minimum=1)
   before=(root/'manifest.json').read_bytes()
   with patch.object(sys,'argv',['updater','--output',str(root),'--force']),patch.object(db,'source_count',side_effect=OSError('source offline')):
    db.main()
   self.assertEqual((root/'manifest.json').read_bytes(),before);self.assertEqual(db.validate(root),manifest)
if __name__=='__main__':unittest.main()
