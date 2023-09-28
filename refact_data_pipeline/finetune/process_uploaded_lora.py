import subprocess
import sys
import logging

from pathlib import Path

from self_hosting_machinery import env


def rm(fn):
    cmd = ['rm', '-rf', str(fn)]
    subprocess.check_call(cmd)


def main():
    try:
        for file in Path(env.DIR_LORAS).iterdir():
            try:
                if not file.is_file():
                    continue
                if file.suffix != '.zip':
                    continue

                upload_filename = str(file)
                unpack_filename = str(file.parent)
                rm(file.parent / file.stem)
                cmd = ["unzip", '-q', "-d", unpack_filename, upload_filename]
                subprocess.check_call(cmd)
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