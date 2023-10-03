import os
import subprocess

from pathlib import Path

import aiohttp

from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from refact_data_pipeline.finetune.process_uploaded_files import rm_and_unpack, get_source_type
from self_hosting_machinery import env
from self_hosting_machinery.webgui.selfhost_webutils import log


class UploadViaURL(BaseModel):
    url: str


def rm(f):
    try:
        subprocess.check_call(['rm', '-rf', f])
    except BaseException as e:
        log(f"Error while removing {f}: {e}")


async def download_file_from_url_stream(url: str, file_path: str, chunk_size: int = 8192) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Cannot download: {response.reason} {response.status}",
                )
            with open(file_path, 'wb') as file:
                async for chunk in response.content.iter_chunked(chunk_size):
                    file.write(chunk)
            return file_path


async def unpack(file_path: Path) -> JSONResponse:
    if not file_path.is_file():
        return JSONResponse({"message": f"Error while unpacking: File {file_path.name} does not exist"}, status_code=404)

    if get_source_type(str(file_path)) != 'archive':
        return JSONResponse({"message": f"Error while unpacking: File {file_path.name} is not an archive"}, status_code=400)

    try:
        upload_filename = str(file_path)
        unpack_filename = str(file_path.parent)
        filename = file_path.name
        rm_and_unpack(upload_filename, unpack_filename, 'archive', filename, rm_unpack_dir=False)
        rm(str(Path(unpack_filename) / filename))
        return JSONResponse("OK", status_code=200)
    except BaseException as e:
        return JSONResponse({"message": f"Error while unpacking: {e}"}, status_code=500)


class TabLorasRouter(APIRouter):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.add_api_route("/lora-upload", self._upload_lora, methods=["POST"])
        self.add_api_route("/lora-upload-url", self._upload_lora_url, methods=["POST"])

    async def _upload_lora(self, file: UploadFile):
        async def write_to_file() -> JSONResponse:
            upload_dest = env.DIR_LORAS
            tmp_path = os.path.join(upload_dest, file.filename + ".tmp")
            file_path = os.path.join(upload_dest, file.filename)
            if os.path.exists(file_path):
                return JSONResponse({"message": f"File with this name already exists"}, status_code=409)
            try:
                with open(tmp_path, "wb") as f:
                    while True:
                        contents = await file.read(1024)
                        if not contents:
                            break
                        f.write(contents)
                os.rename(tmp_path, file_path)
                return JSONResponse("OK", status_code=200)
            except OSError as e:
                log("Error while uploading file: %s" % (e or str(type(e))))
                return JSONResponse({"message": "Cannot upload file, see logs for details"}, status_code=500)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        f = Path(os.path.join(env.DIR_LORAS, file.filename))

        if (resp := await write_to_file()).status_code != 200:
            rm(f)
            return resp

        if (resp := await unpack(f)).status_code != 200:
            rm(f)
            return resp

        return JSONResponse("OK", status_code=200)

    async def _upload_lora_url(self, file: UploadViaURL):
        file_name = file.url.split("/")[-1]
        file_path = os.path.join(env.DIR_LORAS, file_name)
        try:
            await download_file_from_url_stream(file.url, file_path)
        except Exception as e:
            rm(file_path)
            return JSONResponse({"message": f"Cannot download: {e}"}, status_code=500)

        if (resp := await unpack(Path(file_path))).status_code != 200:
            rm(file_path)
            return resp

        return JSONResponse("OK", status_code=200)
