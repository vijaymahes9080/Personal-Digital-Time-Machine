import pytesseract
from PIL import Image, ImageOps
from loguru import logger
import os
import shutil

from backend.app.core.config import settings

class OCRAgent:
    def __init__(self):
        # Configure Tesseract path if specified or if default needs override
        self.tesseract_cmd = settings.OCR_TESSERACT_CMD
        self.is_available = False

        # Attempt to auto-locate Tesseract or verify path
        if shutil.which(self.tesseract_cmd):
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
            self.is_available = True
            logger.info("Tesseract OCR binary found and initialized.")
        else:
            # Common paths on Windows / macOS / Linux if not in PATH
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                "/usr/local/bin/tesseract",
                "/usr/bin/tesseract"
            ]
            for path in common_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    self.is_available = True
                    logger.info(f"Tesseract OCR found at fallback location: {path}")
                    break
            
            if not self.is_available:
                logger.warning(
                    "Tesseract OCR executable not found in PATH or standard fallbacks. "
                    "Screenshot text indexing will be skipped. "
                    "To enable, install Tesseract OCR natively on your system."
                )

    def process_screenshot(self, image_path: str) -> str:
        """Extracts text from a screenshot file. Preprocesses for accuracy."""
        if not self.is_available:
            return ""

        if not os.path.exists(image_path):
            logger.error(f"Screenshot file does not exist: {image_path}")
            return ""

        try:
            # Load screenshot image
            with Image.open(image_path) as img:
                # Preprocess: convert to grayscale and increase contrast
                gray_img = ImageOps.grayscale(img)
                
                # Perform OCR extraction
                text = pytesseract.image_to_string(gray_img)
                cleaned_text = text.strip()
                
                if cleaned_text:
                    logger.debug(f"OCR Extracted {len(cleaned_text)} characters from {os.path.basename(image_path)}.")
                return cleaned_text
        except Exception as e:
            logger.error(f"Failed to perform OCR on screenshot {image_path}: {e}")
            return ""
