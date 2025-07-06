'''
This is a simple shim file to display an error message if you try to load this addon in a version of Blender that uses
the old extension format. This file is ignored by 4.2 and up.

Without this, those old Blender versions will happily say "module successfully installed!" without actually installing
anything.
'''

bl_info = {
    "name": "Import After Effects Composition",
    "description": "This add-on is incompatible with Blender versions below 4.2. Please update your Blender version.",
    "author": "adroitwhiz",
    "version": (0, 0, 0),
    "blender": (4, 2, 0),
    "category": "Import-Export",
    "doc_url": "https://github.com/adroitwhiz/after-effects-to-blender-export/",
}

def show_err(self, context):
    self.layout.label(text="This add-on is incompatible with Blender versions below 4.2. Please update your Blender version.")

def register():
    raise Exception("This add-on is incompatible with Blender versions below 4.2. Please update your Blender version.")


def unregister():
    pass

if __name__ == "__main__":
    register()
