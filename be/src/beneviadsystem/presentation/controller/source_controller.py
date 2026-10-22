from fastapi import APIRouter, Depends, Query, Response

from beneviadsystem.config.container import Container
from beneviadsystem.domain.model.base import CamelModel
from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.presentation.dto.errors import ApiError, api_error

from .dependencies import container

router = APIRouter(prefix="/api/v1/source", tags=["Source"])


class FilesResponse(CamelModel):
    files: list[SourceFile]


@router.get("/{collection}", response_model=FilesResponse, summary="All files of a collection", responses={400: {"model": ApiError}})
def files(collection: str, app: Container = Depends(container)):
    """Every file of the collection with its content: ``template`` is the tree of fe/neviadlike_structure the code agents work on,
    ``objects`` the drawn objects of /vat-the-mo-phong. Read-only: fe/scripts/push-source.mjs writes the table directly."""
    try:
        return FilesResponse(files=app.source_library_service.files(collection))
    except ValueError as invalid:
        return api_error(400, "Bad Request", str(invalid))


@router.get("/{collection}/file", response_model=SourceFile, summary="One file of a collection",
            responses={400: {"model": ApiError}, 404: {"description": "No such file"}})
def file(collection: str, path: str = Query(...), app: Container = Depends(container)):
    try:
        found = app.source_library_service.file(collection, path)
    except ValueError as invalid:
        return api_error(400, "Bad Request", str(invalid))
    return found if found is not None else Response(status_code=404)
