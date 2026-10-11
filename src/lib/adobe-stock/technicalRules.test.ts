import { describe, it, expect } from 'vitest';
import { ADOBE_TECHNICAL_RULES, auditImageTechnicalSpecs } from './technicalRules';

const MB = 1024 * 1024;

describe('ADOBE_TECHNICAL_RULES thresholds', () => {
  it('defines a 4MP minimum and a 100MP maximum', () => {
    expect(ADOBE_TECHNICAL_RULES.minMegapixels).toBe(4.0);
    expect(ADOBE_TECHNICAL_RULES.maxMegapixels).toBe(100.0);
    expect(ADOBE_TECHNICAL_RULES.recommendedMinMegapixels).toBe(8.0);
  });

  it('caps file size at 45MB and flags tiny files under 300KB', () => {
    expect(ADOBE_TECHNICAL_RULES.maxFileSizeMB).toBe(45.0);
    expect(ADOBE_TECHNICAL_RULES.minFileSizeKB).toBe(300);
  });

  it('supports jpeg, png and webp', () => {
    expect(ADOBE_TECHNICAL_RULES.supportedExtensions).toContain('.jpg');
    expect(ADOBE_TECHNICAL_RULES.supportedExtensions).toContain('.png');
    expect(ADOBE_TECHNICAL_RULES.supportedExtensions).toContain('.webp');
  });

  it('lists standard aspect ratios with tolerances', () => {
    expect(ADOBE_TECHNICAL_RULES.standardAspectRatios.length).toBeGreaterThanOrEqual(8);
    for (const entry of ADOBE_TECHNICAL_RULES.standardAspectRatios) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.ratio).toBeGreaterThan(0);
      expect(entry.tolerance).toBeGreaterThan(0);
    }
  });
});

describe('auditImageTechnicalSpecs — healthy submission', () => {
  it('passes a 24MP JPEG of normal size', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'sunset.jpg', size: 6 * MB, type: 'image/jpeg' },
      { width: 6000, height: 4000 },
    );
    expect(audit.isFormatSupported).toBe(true);
    expect(audit.fileFormat).toBe('JPG');
    expect(audit.fileSizeStatus).toBe('PASS');
    expect(audit.fileSizeBytes).toBe(6 * MB);
    expect(audit.fileSizeFormatted).toBe('6.00 MB');
    expect(audit.megapixels).toBe(24);
    expect(audit.resolutionStatus).toBe('PASS');
    expect(audit.orientation).toBe('Landscape');
    expect(audit.aspectRatioLabel).toBe('3:2 (Standard Photo)');
    expect(audit.aspectRatio).toBe('6000×4000');
  });

  it('detects PNG via mime type even when the extension is unusual', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'render', size: 2 * MB, type: 'image/png' },
      { width: 3000, height: 2000 },
    );
    expect(audit.isFormatSupported).toBe(true);
  });

  it('recognizes a 16:9 hero image', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'hero.png', size: 4 * MB, type: 'image/png' },
      { width: 3840, height: 2160 },
    );
    expect(audit.aspectRatioLabel).toBe('16:9 (Widescreen Hero)');
    expect(audit.orientation).toBe('Landscape');
  });

  it('recognizes a portrait image', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'portrait.jpg', size: 5 * MB, type: 'image/jpeg' },
      { width: 4000, height: 6000 },
    );
    expect(audit.orientation).toBe('Portrait');
    expect(audit.aspectRatioLabel).toBe('2:3 (Portrait)');
  });

  it('recognizes a square image', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'square.webp', size: 2 * MB, type: 'image/webp' },
      { width: 3000, height: 3000 },
    );
    expect(audit.orientation).toBe('Square');
    expect(audit.aspectRatioLabel).toBe('1:1 (Square)');
    expect(audit.resolutionStatus).toBe('PASS');
  });

  it('passes through the transparency flag', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'cutout.png', size: 2 * MB, type: 'image/png' },
      { width: 3000, height: 3000, hasTransparency: true },
    );
    expect(audit.hasTransparency).toBe(true);
  });

  it('leaves hasTransparency undefined when not provided', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'photo.jpg', size: 2 * MB, type: 'image/jpeg' },
      { width: 3000, height: 2000 },
    );
    expect(audit.hasTransparency).toBeUndefined();
  });
});

describe('auditImageTechnicalSpecs — failure and review cases', () => {
  it('fails resolution below 4MP', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'small.jpg', size: 1 * MB, type: 'image/jpeg' },
      { width: 2000, height: 1000 },
    );
    expect(audit.megapixels).toBe(2);
    expect(audit.resolutionStatus).toBe('FAIL');
    expect(audit.resolutionMessage).toContain('minimum threshold');
  });

  it('marks 4–8MP as REVIEW rather than FAIL', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'mid.jpg', size: 2 * MB, type: 'image/jpeg' },
      { width: 3000, height: 2000 },
    );
    expect(audit.megapixels).toBe(6);
    expect(audit.resolutionStatus).toBe('REVIEW');
    expect(audit.resolutionMessage).toContain('8+ MP');
  });

  it('fails resolution above 100MP', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'huge.jpg', size: 40 * MB, type: 'image/jpeg' },
      { width: 12000, height: 10000 },
    );
    expect(audit.megapixels).toBe(120);
    expect(audit.resolutionStatus).toBe('FAIL');
    expect(audit.resolutionMessage).toContain('maximum limit');
  });

  it('fails files larger than 45MB', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'big.jpg', size: 50 * MB, type: 'image/jpeg' },
      { width: 6000, height: 4000 },
    );
    expect(audit.fileSizeStatus).toBe('FAIL');
    expect(audit.fileSizeMessage).toContain('exceeds');
    expect(audit.fileSizeFormatted).toBe('50.00 MB');
  });

  it('marks tiny files under 300KB for review', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'tiny.jpg', size: 200 * 1024, type: 'image/jpeg' },
      { width: 6000, height: 4000 },
    );
    expect(audit.fileSizeStatus).toBe('REVIEW');
    expect(audit.fileSizeMessage).toContain('compression');
    expect(audit.fileSizeFormatted).toBe('200 KB');
  });

  it('rejects unsupported formats like TIFF', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'art.tiff', size: 10 * MB, type: 'image/tiff' },
      { width: 6000, height: 4000 },
    );
    expect(audit.isFormatSupported).toBe(false);
    expect(audit.fileFormat).toBe('TIFF');
  });

  it('labels a non-standard aspect ratio with raw dimensions', () => {
    const audit = auditImageTechnicalSpecs(
      { name: 'odd.jpg', size: 2 * MB, type: 'image/jpeg' },
      { width: 5000, height: 3200 },
    );
    expect(audit.aspectRatioLabel).toBe('5000:3200');
  });
});
