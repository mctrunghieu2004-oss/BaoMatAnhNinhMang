# -*- coding: utf-8 -*-
"""Xuat docs/BAO_CAO.md -> docs/BAO_CAO.docx va docs/SLIDE.md -> docs/SLIDE.pptx.

    pip install pypandoc-binary
    python scripts/export-docs.py

Chay lai script nay moi khi sua bao cao/slide, hoac sau khi ve xong so do
va xuat PNG de len docs/diagrams/ (anh se tu duoc nhung vao file .docx).
Khong can cai pandoc rieng: goi pypandoc-binary da kem san ban pandoc.
"""
import io
import os
import re
import subprocess
import zipfile

import pypandoc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
BUILD = os.path.join(DOCS, '_build')
PANDOC = pypandoc.get_pandoc_path()
os.makedirs(BUILD, exist_ok=True)


def reference_a4():
    """reference.docx mac dinh cua pandoc dung kho Letter -> doi sang A4."""
    src = os.path.join(BUILD, 'reference.docx')
    with open(src, 'wb') as f:
        subprocess.run([PANDOC, '--print-default-data-file', 'reference.docx'],
                       stdout=f, check=True)
    dst = os.path.join(BUILD, 'reference-a4.docx')
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                xml = data.decode('utf-8')
                # A4 = 11906 x 16838 twips; le 2.5cm, rieng le trai 3cm de dong gay
                xml = re.sub(r'<w:pgSz[^/]*/>',
                             '<w:pgSz w:w="11906" w:h="16838"/>', xml)
                xml = re.sub(r'<w:pgMar[^/]*/>',
                             '<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" '
                             'w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>',
                             xml)
                data = xml.encode('utf-8')
            zout.writestr(item, data)
    return dst


def slides_source():
    """SLIDE.md -> ban trung gian hop voi bo ghi pptx cua pandoc.

    Bon viec: bo duong ke ngang (pandoc coi la dau ngat -> sinh slide rong),
    cat kich ban demo (la kich ban tong duyet, khong phai slide), dua ghi chu
    nguoi noi vao o Notes, va tach danh sach tac nhan de doa thanh slide rieng
    (pandoc khong dat bang va doan van chung mot slide; de nguyen se sinh mot
    slide khong co tieu de).
    """
    src = io.open(os.path.join(DOCS, 'SLIDE.md'), encoding='utf-8').read()
    src = src.split('\n# Kịch bản demo')[0]
    src = src[src.index('## Slide 1'):]
    src = re.sub(r'^---\s*$', '', src, flags=re.M)

    actors = '\nTác nhân: sinh viên'
    assert src.count(actors) == 1, 'khong tim thay dong tac nhan o slide 3'
    src = src.replace(actors, '\n## Tác nhân đe dọa\n' + actors, 1)
    src = src.replace('Tài sản và tác nhân đe dọa',
                      'Tài sản cần bảo vệ', 1)

    def to_notes(m):
        return '\n::: notes\n' + re.sub(r'\s+', ' ', m.group(1)).strip() + '\n:::\n'
    src = re.sub(r'^\*\((.*?)\)\*\s*$', to_notes, src, flags=re.M | re.S)
    src = re.sub(r'^## Slide \d+ — ', '## ', src, flags=re.M)

    path = os.path.join(BUILD, 'slide-pptx.md')
    io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
    return path


def main():
    docx = os.path.join(DOCS, 'BAO_CAO.docx')
    subprocess.run([PANDOC, 'BAO_CAO.md', '-f', 'gfm', '-o', docx,
                    '--reference-doc', reference_a4(), '--resource-path', '.',
                    '--syntax-highlighting', 'tango'], cwd=DOCS, check=True)

    pptx = os.path.join(DOCS, 'SLIDE.pptx')
    subprocess.run([PANDOC, slides_source(), '-f', 'markdown', '-o', pptx,
                    '--slide-level', '2', '--resource-path', DOCS], check=True)

    for path in (docx, pptx):
        print('%-24s %8.1f KB' % (os.path.basename(path), os.path.getsize(path) / 1024))


if __name__ == '__main__':
    main()
