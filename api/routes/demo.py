from fastapi import APIRouter, HTTPException

from api.services import (
    get_evaluation,
    get_flagged,
    get_ingredients,
    get_menu_costs,
    get_metrics,
    get_receipt_ids,
    get_receipt_walkthrough,
    get_report,
)

router = APIRouter(prefix="/api/demo")


@router.get("/menu")
def menu():
    return get_menu_costs()


@router.get("/ingredients")
def ingredients():
    return get_ingredients()


@router.get("/metrics")
def metrics():
    return get_metrics()


@router.get("/evaluation")
def evaluation():
    return get_evaluation()


@router.get("/receipt/{receipt_id}")
def receipt(receipt_id: str):
    data = get_receipt_walkthrough(receipt_id)
    if data is None:
        raise HTTPException(404, f"Receipt {receipt_id} not found")
    return data


@router.get("/report")
def report():
    return get_report()


@router.get("/flagged")
def flagged():
    return get_flagged()


@router.get("/receipts")
def receipt_list():
    return get_receipt_ids()
