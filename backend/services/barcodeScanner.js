const {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} = require('@zxing/library');

const sharp = require('sharp');

class BarcodeScanner {
  constructor() {
    this.reader = new MultiFormatReader();

    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ];

    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.reader.setHints(hints);
  }

  async scanFromImage(imagePath) {
    try {
      // Convert image to raw pixel data (RGBA)
      const image = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = image;

      // Convert RGBA to grayscale luminance (Zxing expects grayscale)
      const luminances = new Uint8ClampedArray(info.width * info.height);
      for (let i = 0; i < luminances.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        luminances[i] = Math.floor((r + g + b) / 3); // average method
      }

      const source = new RGBLuminanceSource(luminances, info.width, info.height);
      const bitmap = new BinaryBitmap(new HybridBinarizer(source));
      const result = this.reader.decode(bitmap);

      return {
        success: true,
        barcode: result.getText(),
        format: result.getBarcodeFormat().toString()
      };

    } catch (error) {
      console.error('Barcode scan error:', error.message);
      return {
        success: false,
        error: 'No barcode detected. Please try a clearer image.',
        details: error.message
      };
    }
  }
}

module.exports = new BarcodeScanner();
