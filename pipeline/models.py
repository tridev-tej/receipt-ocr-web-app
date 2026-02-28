from __future__ import annotations

import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class RawLineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None
    is_tax_or_fee: bool = False
    is_discount: bool = False
    confidence: Literal["high", "medium", "low"] = "high"


class RawReceipt(BaseModel):
    receipt_id: str
    supplier: str
    date: Optional[datetime.date] = None
    currency: str = "EUR"
    language: str = "en"
    items: list[RawLineItem]
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    image_path: str
    ocr_method: str = "claude_vision"
    ocr_confidence: float = 0.9
    notes: str = ""
    is_duplicate: bool = False
    # Additional anomaly notes produced by the optional OCR cross-validation pass.
    cross_validation_notes: list[str] = Field(default_factory=list)


class NormalizedLineItem(BaseModel):
    receipt_id: str
    raw_description: str
    raw_quantity: Optional[float] = None
    raw_unit: Optional[str] = None
    is_tax_or_fee: bool = False
    is_refund: bool = False
    mapped_ingredient: Optional[str] = None
    mapping_method: Optional[Literal["override", "fuzzy", "llm"]] = None
    mapping_confidence: float = 0.0
    ocr_confidence: float = 0.9
    category: Literal["ingredient", "packaging", "exclude", "unknown"] = "unknown"
    quantity_normalized: float = 0.0
    unit_normalized: str = "each"
    unit_price_eur: float = 0.0
    total_eur: float = 0.0
    flagged: bool = False
    flag_reasons: list[str] = Field(default_factory=list)


class IngredientCost(BaseModel):
    ingredient_id: str
    display_name: str
    avg_cost_per_unit: float
    unit: str
    min_cost: float
    max_cost: float
    std_dev: float
    num_data_points: int
    confidence: float
    source_receipts: list[str] = Field(default_factory=list)


class MenuItemCost(BaseModel):
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
    ingredient_breakdown: list[dict[str, object]] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)


class PipelineMetrics(BaseModel):
    run_id: str
    receipts_processed: int = 0
    receipts_failed: int = 0
    total_line_items: int = 0
    total_api_cost_usd: float = 0.0
    avg_ocr_confidence: float = 0.0
    mapping_rate: float = 0.0
    duration_seconds: float = 0.0
