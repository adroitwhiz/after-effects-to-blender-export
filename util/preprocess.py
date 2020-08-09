import re
from os import path

incl_regex = re.compile('\/\/ ?@include *(\'(.+)\'|"(.+)")')

def process_includes(file_path):
    srcdir = path.dirname(file_path)
    def make_include(matchobj):
        return process_includes(path.join(srcdir, matchobj.group(1)[1:-1]))

    with open(file_path, encoding='utf-8') as file:
        contents = file.read()
        return incl_regex.sub(make_include, contents)

with open('Export Camera Data to JSON.jsx', 'w') as file:
    file.write(process_includes('export-camera-from-ae/export-camera-from-ae.jsx'))
