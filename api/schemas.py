from __future__ import annotations

from pydantic import BaseModel


class MenuItemCostResponse(BaseModel):
    menu_item_id: str
    name: str
    category: str
    sell_price: float
    ingredient_cost: float
    packaging_cost: float
    total_cogs: float
    margin_percent: float
    margin_eur: float
    confidence: float
    breakdown: list[dict]


class IngredientCostResponse(BaseModel):
    ingredient_id: str
    display_name: str
    avg_cost_per_unit: float
    unit: str
    min_cost: float
    max_cost: float
    std_dev: float
    num_data_points: int
    confidence: float
    source_receipts: list[str]
    data_points: list[dict] | None = None


class FlaggedItemResponse(BaseModel):
    id: int
    receipt_id: str
    raw_description: str
    mapped_ingredient: str | None
    mapping_method: str | None
    mapping_confidence: float | None
    category: str | None
    quantity: float | None
    total_eur: float | None
    flag_reasons: list[str]


class ReceiptWalkthroughResponse(BaseModel):
    receipt_id: str
    supplier: str
    date: str | None
    currency: str
    raw_extraction: dict
    line_items: list[dict]


class UploadStatusResponse(BaseModel):
    run_id: str
    stage: str
    current_receipt: int
    total_receipts: int
    error: str | None = None


class UploadResultsResponse(BaseModel):
    run_id: str
    menu_costs: list[MenuItemCostResponse]
    ingredients: list[IngredientCostResponse]
    metrics: dict
    report_md: str
