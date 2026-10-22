from beneviadsystem.service.agent.codegen.code_store import CodeStore


class MemoryStore(CodeStore):
    def __init__(self):
        self.files: dict[str, str] = {}

    def read(self, path):
        return self.files.get(path)

    def write(self, path, content):
        self.files[path] = content

    def exists(self, path):
        return path in self.files

    def list_files(self, folder):
        return sorted(p for p in self.files if p.startswith(folder))

    def append_note(self, path, text):
        self.files[path] = self.files.get(path, "") + text

    def check_path(self, path, for_write):
        pass
