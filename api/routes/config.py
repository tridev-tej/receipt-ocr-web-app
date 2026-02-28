from fastapi import APIRouter

from api.services import get_config

router = APIRouter(prefix="/api")


@router.get("/config")
def config_endpoint():
    return get_config()
