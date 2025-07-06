'''
Create a Blender addon .zip from the `import-comp-to-blender` folder.
'''

import glob
import zipfile
import os

def should_exclude_path(path: str):
    return path.endswith('.md')

dst = zipfile.ZipFile('build/after_effects_to_blender_import.zip', "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9)

for path in glob.iglob('**', root_dir='import-comp-to-blender', recursive=True):
    src_path = 'import-comp-to-blender/' + path
    # We don't need to include directories in the zip file, just their contents
    if os.path.isdir(src_path) or should_exclude_path(path):
        continue
    dst.write(src_path, path)
