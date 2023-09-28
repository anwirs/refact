import subprocess
import sys
import logging

from pathlib import Path

from refact_data_pipeline.finetune.process_uploaded_files import rm_and_unpack, get_source_type
from self_hosting_machinery import env


def rm(fn: str):
    cmd = ['rm', '-rf', fn]
    subprocess.check_call(cmd)


def main():
    try:
        for file in Path(env.DIR_LORAS).iterdir():
            try:
                if not file.is_file():
                    continue
                source_type = get_source_type(str(file))
                if source_type != 'archive':
                    continue

                upload_filename = str(file)
                unpack_filename = str(file.parent / file.stem)
                rm_and_unpack(upload_filename, unpack_filename, 'archive', upload_filename)
                rm(upload_filename)
            except BaseException as e:
                logging.error(f'Error while processing file {file}: {e}')
    except BaseException as e:
        raise


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s PREPROC %(message)s',
        datefmt='%Y%m%d %H:%M:%S',
        handlers=[logging.StreamHandler(stream=sys.stderr)])
    main()