import os, sys, tarfile

src_root = sys.argv[1]          # e.g. dist/midFX-darwin-x64
out_path = sys.argv[2]          # e.g. dist/midFX-darwin-x64.tar.gz
arc_root = os.path.basename(os.path.normpath(src_root))

def filt(ti: tarfile.TarInfo):
    ti.uid = 501
    ti.gid = 20
    ti.uname = 'staff'
    ti.gname = 'staff'
    if ti.issym():
        if ti.linkname:
            ti.linkname = ti.linkname.replace('\\', '/')
        return ti
    if ti.isdir():
        ti.mode = 0o755
        return ti
    base = os.path.basename(ti.name)
    is_bin = ('.' not in base) or base.endswith('.node')
    ti.mode = 0o755 if is_bin else 0o644
    return ti

with tarfile.open(out_path, 'w:gz') as tf:
    tf.add(src_root, arcname=arc_root, filter=filt)

print('wrote', out_path)
