'''
Create a Blender addon .zip from the `import-comp-to-blender` folder.
'''

import shutil

shutil.make_archive('build/after_effects_to_blender_import', 'zip', 'import-comp-to-blender')
