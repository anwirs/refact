import subprocess
import sys
import logging

from pathlib import Path

from self_hosting_machinery import env
from refact_data_pipeline.finetune.process_uploaded_files import log, rm_and_unpack, get_source_type


def rm(fn):
    cmd = ['rm', '-rf', str(fn)]
    log(f'CMD: {" ".join(cmd)}')
    subprocess.check_call(cmd)


def main():
    for file in Path(env.DIR_LORAS).iterdir():
        try:
            if not file.is_file():
                log(f'Not a file: {file}')
                continue

            if get_source_type(str(file)) != 'archive':
                log(f'Not an archive: {file}')
                continue

            log(f'PROC: {file}')
            upload_filename = str(file)
            unpack_filename = str(file.parent)
            filename = file.name
            rm_and_unpack(upload_filename, unpack_filename, 'archive', filename, rm_unpack_dir=False)
            rm(upload_filename)
            log(f'DONE: {file}')
        except BaseException as e:
            log(f'Error while processing file {file}: {e}')


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s PREPROC %(message)s',
        datefmt='%Y%m%d %H:%M:%S',
        handlers=[logging.StreamHandler(stream=sys.stderr)])
    main()
