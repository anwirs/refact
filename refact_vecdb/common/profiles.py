from dataclasses import dataclass
from pathlib import Path


PROFILES = {
    'smc': {
        'workdir': Path('/home/user/.refact/tmp/unpacked-files')
    }
}


@dataclass
class VDBFiles:
    database_set = "database_set.jsonl"
    index_files_state = "index_files_state.json"
    change_provider = "change_provider.json"
    update_indexes = "update_indexes.json"
