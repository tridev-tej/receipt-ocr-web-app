from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, UnidentifiedImageError

import config

logger = logging.getLogger(__name__)

MAX_PIXELS = 4_000_000  # 4MP limit for API cost control
MAX_IMAGE_DIMENSION = 10_000


def preprocess_image(image_path: str | Path) -> bytes:
    path = Path(image_path)
    try:
        raw_img = Image.open(path)
    except FileNotFoundError:
        logger.error("missing_image", extra={"path": str(path)})
        raise
    except UnidentifiedImageError:
        logger.error("invalid_image", extra={"path": str(path)})
        raise
    except Exception:
        logger.error("corrupt_image", extra={"path": str(path)})
        raise

    try:
        w, h = raw_img.size
        if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION:
            logger.warning(
                "large_image_downsampled",
                extra={
                    "path": str(path),
                    "width": w,
                    "height": h,
                    "max_dimension": MAX_IMAGE_DIMENSION,
                },
            )
            raw_img.thumbnail(
                (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )

        try:
            raw_img.load()  # force pixel read into memory
        except UnidentifiedImageError:
            logger.error("invalid_image", extra={"path": str(path)})
            raise
        except Exception:
            logger.error("corrupt_image", extra={"path": str(path)})
            raise

        img: Image.Image = _to_rgb(raw_img)

        img = _deskew(img)
        img = _enhance_contrast(img)
        img = _denoise(img)
        img = _resize_if_large(img)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()
    finally:
        raw_img.close()


def _to_rgb(img: Image.Image) -> Image.Image:
    if img.mode == "RGB":
        return img
    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        return background
    return img.convert("RGB")


def _deskew(img: Image.Image) -> Image.Image:
    # NOTE: not a true deskew (skew-angle detection). This simply rotates
    # landscape-oriented receipts to portrait based on aspect ratio.
    w, h = img.size
    if w > h * config.DESKEW_ASPECT_RATIO:
        img = img.rotate(90, expand=True)
    return img


def _enhance_contrast(img: Image.Image) -> Image.Image:
    enhancer = ImageEnhance.Contrast(img)
    return enhancer.enhance(1.5)


def _denoise(img: Image.Image) -> Image.Image:
    return img.filter(ImageFilter.MedianFilter(size=3))


def _resize_if_large(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w * h > MAX_PIXELS:
        scale = (MAX_PIXELS / (w * h)) ** 0.5
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return img
