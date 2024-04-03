import re
from os import path

incl_regex = re.compile('\/\/ ?@include *(\'(.+)\'|"(.+)")')

def process_includes(file_path, root_file=False):
    srcdir = path.dirname(file_path)
    def make_include(matchobj):
        return process_includes(path.join(srcdir, matchobj.group(1)[1:-1]))

    contents = ''
    with open(file_path, encoding='utf-8') as file:
        contents = file.read()
        contents = incl_regex.sub(make_include, contents)
    if not root_file:
        return contents
    with open('LICENSE', 'r', encoding='utf-8') as license:
        license_contents = license.read()
        return f'/*\n{license_contents}*/\n\n{contents}'


with open('Export Composition Data to JSON.jsx', 'w', encoding='utf-8') as file:
    file.write(process_includes('export-comp-from-ae/export-comp-from-ae.jsx', True))
