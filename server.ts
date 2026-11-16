import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper: Check if a genuine Gemini API key is configured
function hasValidGeminiKey(): boolean {
  const k = process.env.GEMINI_API_KEY;
  return Boolean(k && k.trim() !== '' && k !== 'MY_GEMINI_API_KEY');
}

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Extract text from PDF base64 if present (lazy-loaded to keep server startup fast)
async function extractTextFromBase64File(base64Data: string, mimeType?: string): Promise<string> {
  try {
    if (!base64Data) return '';
    // Strip data URL prefix if present (e.g., data:application/pdf;base64,...)
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const isPdf = (mimeType && mimeType.includes('pdf')) || cleanBase64.startsWith('JVBERi0') || base64Data.includes('application/pdf');
    if (isPdf) {
      const buffer = Buffer.from(cleanBase64, 'base64');
      // @ts-ignore
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      return res.text || '';
    }
  } catch (err) {
    console.warn('PDFParse warning:', err);
  }
  return '';
}


// Parse Spanish / European number format (e.g. "1.234,56" -> 1234.56, "0,10115" -> 0.10115)
function parseEsNum(raw?: string | null): number {
  if (!raw) return 0;
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return 0;
  if (trimmed.includes(',') && trimmed.includes('.')) {
    // Decide which is decimal separator by last occurrence
    const lastComma = trimmed.lastIndexOf(',');
    const lastDot = trimmed.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(trimmed.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(trimmed.replace(/,/g, '')) || 0;
  }
  if (trimmed.includes(',')) {
    return parseFloat(trimmed.replace(',', '.')) || 0;
  }
  return parseFloat(trimmed) || 0;
}

// Convert DD/MM/YYYY or DD-MM-YY to YYYY-MM-DD
function toIsoDate(raw?: string | null): string {
  if (!raw) return '';
  const parts = raw.trim().split(/[\/\.-]/);
  if (parts.length !== 3) return '';
  const [d, m, yRaw] = parts;
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function toDotDate(raw?: string | null): string {
  if (!raw) return '';
  const parts = raw.trim().split(/[\/\.-]/);
  if (parts.length !== 3) return raw.trim();
  const [d, m, yRaw] = parts;
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
}

function toSlashDate(raw?: string | null): string {
  if (!raw) return '';
  const parts = raw.trim().split(/[\/\.-]/);
  if (parts.length !== 3) return raw.trim();
  const [d, m, yRaw] = parts;
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function computeDaysBetween(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function detectUtilityMismatch(text: string, expected: 'WATER' | 'ELECTRICITY'): string | null {
  const lower = text.toLowerCase();
  const waterScore =
    (lower.includes('emuasa') ? 2 : 0) +
    (lower.includes('canal de isabel') ? 2 : 0) +
    (lower.includes('aguas de') ? 2 : 0) +
    (lower.includes('canon saneamiento') || lower.includes('esamur') ? 2 : 0) +
    (lower.includes('alcantarillado') ? 1 : 0) +
    (/\b\d+\s*m3\b/i.test(text) ? 1 : 0);

  const elecScore =
    (lower.includes('factura de luz') ? 2 : 0) +
    (lower.includes('término fijo') || lower.includes('termino fijo') ? 2 : 0) +
    (lower.includes('potencia contratada') ? 2 : 0) +
    (lower.includes('impuesto eléctrico') || lower.includes('impuesto electrico') ? 2 : 0) +
    (lower.includes('peajes de transporte') ? 2 : 0) +
    (/\bkwh\b/i.test(text) ? 1 : 0);

  if (expected === 'WATER' && elecScore >= 4 && waterScore === 0) {
    return 'El PDF adjunto corresponde a una factura de LUZ (electricidad), no de AGUA. Súbelo desde el botón de Luz.';
  }
  if (expected === 'ELECTRICITY' && waterScore >= 4 && elecScore === 0) {
    return 'El PDF adjunto corresponde a una factura de AGUA, no de LUZ. Súbelo desde el botón de Agua.';
  }
  return null;
}

// Strict Deterministic Parser for Electricity Bills (Repsol, Iberdrola, Endesa, Naturgy, etc.)
// Never invents defaults when fields are absent.
function deterministicParseElectricity(text: string): { data?: any; error?: string } {
  const clean = text || '';
  if (clean.trim().length < 20) {
    return { error: 'No se pudo extraer texto legible de la factura de luz. No se inventan datos.' };
  }

  // Total invoice
  const totalMatch =
    clean.match(/Total\s+factura\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/TOTAL\s+IMPORTE\s+FACTURA\s*:?\s*(\d[\d.,]*)\s*€?/i) ||
    clean.match(/TOTAL\s+A\s+PAGAR\s*:?\s*(\d[\d.,]*)\s*€?/i) ||
    clean.match(/Importe\s+total\s*(?:factura)?\s*:?\s*(\d[\d.,]*)\s*€?/i);

  const total = totalMatch ? parseEsNum(totalMatch[1]) : 0;
  if (!total || total <= 0) {
    return { error: 'No se encontró el "Total factura" real en el documento de luz. No se han inventado datos.' };
  }

  // Invoice, Contract, CUPS
  const factNum =
    (clean.match(/N[ºo]\s*(?:de\s*)?factura\s*:?\s*([A-Z0-9\-\/]+)/i) ||
      clean.match(/Factura\s*N[ºo]\s*:?\s*([A-Z0-9\-\/]+)/i) ||
      [])[1] || '';

  const contract =
    (clean.match(/N[ºo]\s*(?:de\s*)?contrato\s*(?!de\s*acceso)\s*:?\s*([A-Z0-9\-\/]+)/i) || [])[1] || '';

  const cups =
    (clean.match(/(?:CUPS|C[oó]digo\s+CUPS)\s*:?\s*(ES[A-Z0-9]{18,22})/i) ||
      clean.match(/\b(ES\d{16}[A-Z0-9]{2,6})\b/) ||
      [])[1] || '';

  // Billing Period Dates
  const periodMatch =
    clean.match(/Periodo\s+de\s+facturaci[oó]n\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})\s*(?:al|-)\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i) ||
    clean.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})\s*(?:al|-)\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/);

  const periodStartDate = periodMatch ? toIsoDate(periodMatch[1]) : '';
  const periodEndDate = periodMatch ? toIsoDate(periodMatch[2]) : '';
  const periodRange = periodMatch ? `${toSlashDate(periodMatch[1])} - ${toSlashDate(periodMatch[2])}` : '';

  const billingDaysMatch = clean.match(/D[ií]as\s+facturados\s*:?\s*(\d+)/i);
  const billingDays = billingDaysMatch
    ? parseInt(billingDaysMatch[1], 10)
    : computeDaysBetween(periodStartDate, periodEndDate);

  // Charge date / emission date
  const chargeDateMatch =
    clean.match(/Fecha\s+de\s+cobro\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i) ||
    clean.match(/Fecha\s+de\s+emisi[oó]n\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i) ||
    clean.match(/cargo\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i);
  const chargeDate = chargeDateMatch ? toDotDate(chargeDateMatch[1]) : '';

  // Energy consumed (kWh)
  const kwhSummaryMatch =
    clean.match(/Consumo\s+en\s+este\s+periodo\s*:?\s*(\d[\d.,]*)\s*kWh/i) ||
    clean.match(/(?:Total\s+)?energ[ií]a\s+consumida\s*:?\s*(\d[\d.,]*)\s*kWh/i);
  const kwhBreakdownMatch = clean.match(/Consumo\s*(?:\([^)]+\))?\s+\d[\d.,]*\s*€\s*(\d[\d.,]*)\s*kWh\s*x\s*(\d[\d.,]*)\s*€\/kWh/i);

  // Hourly tiers (handle Repsol format where date "24/09/2026" may be concatenated directly before "142,50 kWh")
  let puntaKwh = 0;
  let llanoKwh = 0;
  let valleKwh = 0;

  const tiersGlueMatch = clean.match(
    /Consumo\s+del\s+periodo[\s\S]{0,60}?hasta\s*\d{2}\/\d{2}\/\d{4}\s*(\d[\d.,]*)\s*kWh\s*(\d[\d.,]*)\s*kWh\s*(\d[\d.,]*)\s*kWh/i
  );
  const peajesEnergyMatch = clean.match(
    /Por\s+energ[ií]a\s*(\d[\d.,]*)\s*kWh\s*x\s*[\d.,]+\s*€\/kWh\s*\+\s*(\d[\d.,]*)\s*kWh\s*x\s*[\d.,]+\s*€\/kWh\s*\+\s*(\d[\d.,]*)\s*kWh\s*x/i
  );

  if (tiersGlueMatch) {
    puntaKwh = parseEsNum(tiersGlueMatch[1]);
    llanoKwh = parseEsNum(tiersGlueMatch[2]);
    valleKwh = parseEsNum(tiersGlueMatch[3]);
  } else if (peajesEnergyMatch) {
    puntaKwh = parseEsNum(peajesEnergyMatch[1]);
    llanoKwh = parseEsNum(peajesEnergyMatch[2]);
    valleKwh = parseEsNum(peajesEnergyMatch[3]);
  } else {
    const p = clean.match(/\bPunta\b\s*[:\s]*(\d[\d.,]*)\s*kWh/i) || clean.match(/\bP1\b[^\d\n]*(\d[\d.,]*)\s*kWh/i);
    const l = clean.match(/\bLlano\b\s*[:\s]*(\d[\d.,]*)\s*kWh/i) || clean.match(/\bP2\b[^\d\n]*(\d[\d.,]*)\s*kWh/i);
    const v = clean.match(/\bValle\b\s*[:\s]*(\d[\d.,]*)\s*kWh/i) || clean.match(/\bP3\b[^\d\n]*(\d[\d.,]*)\s*kWh/i);
    puntaKwh = p ? parseEsNum(p[1]) : 0;
    llanoKwh = l ? parseEsNum(l[1]) : 0;
    valleKwh = v ? parseEsNum(v[1]) : 0;
  }

  let kwh = 0;
  if (kwhSummaryMatch) {
    kwh = parseEsNum(kwhSummaryMatch[1]);
  } else if (kwhBreakdownMatch) {
    kwh = parseEsNum(kwhBreakdownMatch[1]);
  } else if (puntaKwh + llanoKwh + valleKwh > 0) {
    kwh = Math.round((puntaKwh + llanoKwh + valleKwh) * 100) / 100;
  }

  // Unit Price (€/kWh) — extract from Energy breakdown first (never Peajes!)
  let unitPrice = 0;
  if (kwhBreakdownMatch) {
    unitPrice = parseEsNum(kwhBreakdownMatch[2]);
  } else {
    // Look only inside DESGLOSE section before PEAJES
    const desgloseEnd = clean.search(/PEAJES\s+DE\s+TRANSPORTE/i);
    const mainBody = desgloseEnd > 0 ? clean.slice(0, desgloseEnd) : clean;
    const priceMatch =
      mainBody.match(/Energ[ií]a[\s\S]{0,160}?\d[\d.,]*\s*kWh\s*x\s*(\d[\d.,]*)\s*€\/kWh/i) ||
      mainBody.match(/T[eé]rmino\s+(?:de\s+)?energ[ií]a[\s\S]{0,120}?(\d[\d.,]*)\s*€\/kWh/i) ||
      mainBody.match(/\d[\d.,]*\s*kWh\s*x\s*(\d[\d.,]*)\s*€\/kWh/i);
    if (priceMatch) {
      unitPrice = parseEsNum(priceMatch[1]);
    }
  }

  // Fixed Term Cost (avoid "Por término fijo 18,39 €" in commercialization breakdown)
  const fixedTermMatch =
    clean.match(/(?<!Por\s)T[eé]rmino\s+fijo\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/T[eé]rmino\s+de\s+potencia\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/Importe\s+potencia\s*:?\s*(\d[\d.,]*)\s*€/i);
  const fixedTermCost = fixedTermMatch ? parseEsNum(fixedTermMatch[1]) : 0;

  // Energy Cost (matches "Energía 63,31 €" even when pdf-parse omits newlines)
  const energyCostMatch =
    clean.match(/\bEnerg[ií]a\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/Consumo\s*\([^)]+\)\s+(\d[\d.,]*)\s*€/i) ||
    clean.match(/Importe\s+energ[ií]a\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/T[eé]rmino\s+de\s+energ[ií]a\s*:?\s*(\d[\d.,]*)\s*€/i);
  const energyCost = energyCostMatch ? parseEsNum(energyCostMatch[1]) : 0;

  // Contracted power
  const powerKwMatch =
    clean.match(/Potencia\s+contratada\s*(?:Punta\s*:?)?\s*(\d[\d.,]*)\s*kW/i) ||
    clean.match(/(\d[\d.,]*)\s*kW\s*x\s*\d+\s*d[ií]as/i);
  const contractedPower = powerKwMatch ? `${powerKwMatch[1].replace('.', ',')} kW` : '';

  // Extra non-essential services (Tu Asistente 24h, seguros, etc.)
  const assistantMatch = clean.match(/Tu\s+Asistente\s*24h\s*:?\s*(\d[\d.,]*)\s*€/i);
  const urgenciasMatch = clean.match(/Servicio\s+de\s+urgencias\s*:?\s*(\d[\d.,]*)\s*€/i);
  const proteccionMatch = clean.match(/Protecci[oó]n\s+de\s+pagos\s*:?\s*(\d[\d.,]*)\s*€/i);
  const genericServiciosMatch = clean.match(/\bServicios\s+(\d[\d.,]*)\s*€/i);

  let extraServicesCost = 0;
  let extraServicesName: string | undefined;
  if (assistantMatch) {
    extraServicesCost = parseEsNum(assistantMatch[1]);
    extraServicesName = 'Tu Asistente 24h';
  } else if (urgenciasMatch) {
    extraServicesCost = parseEsNum(urgenciasMatch[1]);
    extraServicesName = 'Servicio de urgencias';
  } else if (proteccionMatch) {
    extraServicesCost = parseEsNum(proteccionMatch[1]);
    extraServicesName = 'Protección de pagos';
  } else if (genericServiciosMatch) {
    extraServicesCost = parseEsNum(genericServiciosMatch[1]);
    if (extraServicesCost > 0) extraServicesName = 'Servicios adicionales';
  }

  // Other regulated items & taxes
  const bonoMatch = clean.match(/Financiaci[oó]n\s+Bono\s+Social\s*:?\s*(\d[\d.,]*)\s*€/i);
  const meterRentMatch = clean.match(/Alquiler\s+de\s+contador\s*:?\s*(\d[\d.,]*)\s*€/i);
  const taxesSummaryMatch = clean.match(/\bImpuestos\s*:?\s*(\d[\d.,]*)\s*€/i);
  const elecTaxMatch = clean.match(/Impuesto\s+El[eé]ctrico\s*:?\s*(\d[\d.,]*)\s*€/i);
  const ivaMatch = clean.match(/IVA\s*\(\d+\s*%\)[^\d€]*?de\s+[\d.,]+\s+(\d[\d.,]*)\s*€/i);

  const bonoSocial = bonoMatch ? parseEsNum(bonoMatch[1]) : 0;
  const meterRent = meterRentMatch ? parseEsNum(meterRentMatch[1]) : 0;
  const taxesCost = taxesSummaryMatch
    ? parseEsNum(taxesSummaryMatch[1])
    : Math.round(((elecTaxMatch ? parseEsNum(elecTaxMatch[1]) : 0) + (ivaMatch ? parseEsNum(ivaMatch[1]) : 0)) * 100) / 100;

  const company = clean.toLowerCase().includes('repsol')
    ? 'Repsol Comercializadora'
    : clean.toLowerCase().includes('iberdrola')
      ? 'Iberdrola'
      : clean.toLowerCase().includes('endesa')
        ? 'Endesa'
        : clean.toLowerCase().includes('naturgy')
          ? 'Naturgy'
          : 'Comercializadora Eléctrica';

  const alerts: string[] = [];
  if (extraServicesCost > 0 && extraServicesName) {
    alerts.push(`🚨 SERVICIO EXTRA NO ESENCIAL: ${extraServicesCost.toFixed(2)} € por "${extraServicesName}".`);
  }
  if (unitPrice > 0.16) {
    alerts.push(`⚠️ TARIFA ELEVADA: ${unitPrice.toFixed(5)} €/kWh.`);
  } else if (unitPrice > 0 && unitPrice <= 0.12) {
    alerts.push(`📉 TARIFA COMPETITIVA: ${unitPrice.toFixed(5)} €/kWh.`);
  }

  return {
    data: {
      utilityType: 'ELECTRICITY',
      company,
      invoiceNumber: factNum || 'S/N',
      contractNumber: contract || undefined,
      cups: cups || undefined,
      chargeDate: chargeDate || undefined,
      receptionDate: new Date().toISOString().split('T')[0],
      periodStartDate,
      periodEndDate,
      periodRange,
      billingDays,
      costPerDay: billingDays > 0 ? parseFloat((total / billingDays).toFixed(3)) : 0,
      totalAmount: total,
      kwhConsumed: kwh,
      unitPrice,
      contractedPower,
      fixedTermCost,
      energyCost,
      extraServicesCost,
      extraServicesName,
      meterRent,
      bonoSocial,
      taxesCost,
      hourlyTiers:
        puntaKwh || llanoKwh || valleKwh
          ? { puntaKwh, llanoKwh, valleKwh }
          : undefined,
      topGas: clean.toLowerCase().includes('tope del gas') ? 'Sí' : 'No',
      alarm: {
        hasAlarm: alerts.length > 0,
        reason: alerts[0] || '',
        alerts,
      },
      notes: `Factura ${company} (${factNum || 'S/N'}) extraída del PDF sin inventar datos.`,
    },
  };
}

// Strict Deterministic Parser for Water Bills (EMUASA, Canal Isabel II, Agbar, Aqualia, etc.)
// Never invents defaults when fields are absent.
function deterministicParseWater(text: string): { data?: any; error?: string } {
  const clean = text || '';
  if (clean.trim().length < 20) {
    return { error: 'No se pudo extraer texto legible de la factura de agua. No se inventan datos.' };
  }

  // Total invoice
  const totalMatch =
    clean.match(/TOTAL\s+A\s+PAGAR\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/TOTAL\s+FACTURA\s*:?\s*(\d[\d.,]*)\s*€/i) ||
    clean.match(/Importe\s+total\s*:?\s*(\d[\d.,]*)\s*€/i);

  const total = totalMatch ? parseEsNum(totalMatch[1]) : 0;
  if (!total || total <= 0) {
    return { error: 'No se encontró el "TOTAL A PAGAR" real en el documento de agua. No se han inventado datos.' };
  }

  // m3 Consumed
  const m3Match =
    clean.match(/CONSUMO\s+TOTAL\s*:?\s*(\d[\d.,]*)\s*m3/i) ||
    clean.match(/CONSUMO\s+TOTAL\s*:?\s*(\d[\d.,]*)\s*m³/i) ||
    clean.match(/Consumo\s*:?\s*(\d[\d.,]*)\s*m[3³]/i);
  const m3 = m3Match ? parseEsNum(m3Match[1]) : 0;

  // Contract & Invoice number
  const contract =
    (clean.match(/(?:N[úu]m\.?\s*contrato|p[oó]liza)\s*:?\s*([A-Z0-9\-\/]+)/i) || [])[1] || '';
  const factNum =
    (clean.match(/(?:N[úu]m\.?\s*factura|Factura\s*N[ºo]|Factura\s*n[úu]m\.?)\s*:?\s*([A-Z0-9\-\/]+)/i) || [])[1] || '';

  // Emission Date
  const emissionMatch =
    clean.match(/Fecha\s+emisi[oó]n\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i) ||
    clean.match(/Fecha\s+de\s+factura\s*:?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i);
  const chargeDate = emissionMatch ? toDotDate(emissionMatch[1]) : '';

  // Meter line: "D15TA174976G 15 08-09-26 828 09-11-26 849 21 Real"
  const meterLineMatch = clean.match(
    /([A-Z0-9]{8,16})\s+(\d{1,3})\s+(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})\s+\d+\s+(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})\s+\d+\s+\d+/i
  );

  let periodStartDate = '';
  let periodEndDate = '';
  let periodRange = '';
  let contractedPower = '';

  if (meterLineMatch) {
    const meterSerial = meterLineMatch[1];
    const diameter = meterLineMatch[2];
    contractedPower = `Contador ${diameter}mm (${meterSerial})`;
    periodStartDate = toIsoDate(meterLineMatch[3]);
    periodEndDate = toIsoDate(meterLineMatch[4]);
    periodRange = `${toSlashDate(meterLineMatch[3])} - ${toSlashDate(meterLineMatch[4])}`;
  } else {
    const slashPeriodMatch = clean.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})\s*(?:al|-)\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/);
    if (slashPeriodMatch) {
      periodStartDate = toIsoDate(slashPeriodMatch[1]);
      periodEndDate = toIsoDate(slashPeriodMatch[2]);
      periodRange = `${toSlashDate(slashPeriodMatch[1])} - ${toSlashDate(slashPeriodMatch[2])}`;
    }
  }

  const periodoCodeMatch = clean.match(/Periodo\s*:?\s*(\d{4}\/\d{2})/i);
  if (periodoCodeMatch) {
    periodRange = periodRange ? `${periodRange} (${periodoCodeMatch[1]})` : `Periodo ${periodoCodeMatch[1]}`;
  }

  const billingDays = computeDaysBetween(periodStartDate, periodEndDate);
  const costPerDayMatch = clean.match(/(\d[\d.,]*)\s*EUR\/d[ií]a/i);
  const costPerDay = costPerDayMatch
    ? parseEsNum(costPerDayMatch[1])
    : billingDays > 0
      ? parseFloat((total / billingDays).toFixed(3))
      : 0;

  // Water breakdown & tiers
  const waterTotalMatch = clean.match(/AGUA\s*\([^)]+\)\s*(?:\(\d+\))?\s*(\d[\d.,]*)/i);
  const waterServiceMatch = clean.match(/AGUA\s*\([^)]+\)[\s\S]*?CUOTA\s+DE\s+SERVICIO\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const tier1Match = clean.match(/CONSUMO\s+De\s+0\s+a\s+5\s+M3\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const tier2Match = clean.match(/CONSUMO\s+De\s+6\s+a\s+20\s+M3\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const tier3Match = clean.match(/CONSUMO\s+De\s+21\s+a\s+\d+\s+M3\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);

  const waterService = waterServiceMatch ? parseEsNum(waterServiceMatch[1]) : 0;
  const tier1 = tier1Match ? parseEsNum(tier1Match[1]) : 0;
  const tier2 = tier2Match ? parseEsNum(tier2Match[1]) : 0;
  const tier3 = tier3Match ? parseEsNum(tier3Match[1]) : 0;

  let waterConsumption = Math.round((tier1 + tier2 + tier3) * 100) / 100;
  if (waterConsumption === 0 && waterTotalMatch) {
    waterConsumption = Math.max(0, Math.round((parseEsNum(waterTotalMatch[1]) - waterService) * 100) / 100);
  }

  const meterConsMatch = clean.match(/CONSERVACI[ÓO]N\s+DE\s+CONTADOR\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const meterConservation = meterConsMatch ? parseEsNum(meterConsMatch[1]) : 0;

  const alcantDomMatch = clean.match(/ALCANTARILLADO\s*\([^)]+\)\s*(?:\(\d+\))?\s*(\d[\d.,]*)/i);
  const alcantInfraMatch = clean.match(/ALCANTARILLADO\.\s*INFRAESTRUC\.[^\n]*?(?:\(\d+\))?\s*(\d[\d.,]*)/i);
  const sewerage =
    Math.round(((alcantDomMatch ? parseEsNum(alcantDomMatch[1]) : 0) + (alcantInfraMatch ? parseEsNum(alcantInfraMatch[1]) : 0)) * 100) / 100;

  const basuraMatch =
    clean.match(/BASURA\s*(?:\(\d+\))?\s*(\d[\d.,]*)/i) ||
    clean.match(/Tasa\s+(?:de\s+)?basura\s*:?\s*(\d[\d.,]*)/i);
  const wasteTax = basuraMatch ? parseEsNum(basuraMatch[1]) : 0;

  const canonMatch =
    clean.match(/CANON\s+SANEAMIENTO\s*(?:\(\d+\))?\s*(\d[\d.,]*)/i) ||
    clean.match(/Saneamiento\s*:?\s*(\d[\d.,]*)/i);
  const canon = canonMatch ? parseEsNum(canonMatch[1]) : 0;

  const canonFijoMatch = clean.match(/CANON\s+FIJO\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const canonVarMatch = clean.match(/CANON\s+VARIABLE\s+\d+\s+\d[\d.,]*\s+(\d[\d.,]*)/i);
  const sanitationFixed = canonFijoMatch ? parseEsNum(canonFijoMatch[1]) : 0;
  const sanitationVariable = canonVarMatch ? parseEsNum(canonVarMatch[1]) : 0;

  let taxes = 0;
  const ivaMatches = clean.matchAll(/I\.?V\.?A\s+al\s+\d+\s*%\s+BASE\s+IMPONIBLE:\s*\d[\d.,]*\s+(\d[\d.,]*)/gi);
  for (const m of ivaMatches) {
    taxes += parseEsNum(m[1]);
  }
  taxes = Math.round(taxes * 100) / 100;

  const unitPrice = m3 > 0 && waterConsumption > 0
    ? Number((waterConsumption / m3).toFixed(3))
    : m3 > 0
      ? Number((total / m3).toFixed(3))
      : 0;

  const company = clean.toLowerCase().includes('emuasa') || clean.toLowerCase().includes('aguas y saneamiento de murcia')
    ? 'EMUASA Aguas de Murcia'
    : clean.toLowerCase().includes('canal')
      ? 'Canal de Isabel II'
      : clean.toLowerCase().includes('barcelona') || clean.toLowerCase().includes('agbar')
        ? 'Aigües de Barcelona'
        : clean.toLowerCase().includes('aqualia')
          ? 'Aqualia'
          : 'Suministradora de Agua';

  const alerts: string[] = [];
  if (total > 0 && (wasteTax + canon) > 0) {
    const taxPct = Math.round(((wasteTax + canon) / total) * 1000) / 10;
    if (taxPct >= 30) {
      alerts.push(`ℹ️ IMPACTO FISCAL ELEVADO: Basura (${wasteTax.toFixed(2)}€) + Saneamiento (${canon.toFixed(2)}€) suponen el ${taxPct}% de la factura.`);
    }
  }

  return {
    data: {
      utilityType: 'WATER',
      company,
      invoiceNumber: factNum || 'S/N',
      contractNumber: contract || undefined,
      chargeDate: chargeDate || undefined,
      receptionDate: new Date().toISOString().split('T')[0],
      periodStartDate,
      periodEndDate,
      periodRange,
      billingDays,
      totalAmount: total,
      m3Consumed: m3,
      unitPrice,
      costPerDay,
      contractedPower,
      breakdown: {
        waterService,
        waterConsumption,
        meterConservation,
        sewerage,
        wasteCollection: wasteTax,
        sanitationCanon: canon,
        taxes,
      },
      waterTiers:
        tier1 || tier2 || tier3
          ? {
              tier1_0_5m3: tier1,
              tier2_6_20m3: tier2,
              tier3_over20m3: tier3,
            }
          : undefined,
      municipalTaxes:
        wasteTax || sanitationFixed || sanitationVariable
          ? {
              wasteTax,
              sanitationFixed,
              sanitationVariable,
            }
          : undefined,
      alarm: {
        hasAlarm: alerts.length > 0,
        reason: alerts[0] || '',
        alerts,
      },
      notes: `Factura ${company} (${factNum || 'S/N'}) extraída del PDF sin inventar datos.`,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // API Endpoint for Water Bill Parsing
  app.post('/api/ai/parse-water', async (req, res) => {
    try {
      const { text, fileBase64, image, mimeType } = req.body;
      const rawPayload = fileBase64 || image;

      if (!text && !rawPayload) {
        return res.status(400).json({ error: 'Se requiere adjuntar el archivo PDF de la factura o una imagen.' });
      }

      // Step 1: Extract clean text if it is a PDF
      let extractedPdfText = '';
      if (rawPayload) {
        extractedPdfText = await extractTextFromBase64File(rawPayload, mimeType);
      }

      const combinedText = (extractedPdfText ? extractedPdfText + '\n\n' : '') + (text || '');

      // Check utility type mismatch before parsing
      if (combinedText.trim().length > 20) {
        const mismatch = detectUtilityMismatch(combinedText, 'WATER');
        if (mismatch) {
          return res.status(422).json({ error: mismatch });
        }
      }

      // Step 2: Try Gemini 3.8 Flash if valid API key is present
      if (hasValidGeminiKey()) {
        try {
          const prompt = `Actúa como un Auditor de Servicios Municipales y Experto en Facturas de Agua y Saneamiento en España (EMUASA, Canal Isabel II, Agbar, Aqualia).

REGLA ESTRICTA DE INTEGRIDAD (CERO INVENCIÓN):
- Extrae ÚNICAMENTE datos reales presentes literalmente en la factura adjunta.
- PROHIBIDO inventar, estimar, adivinar o rellenar con datos ficticios.
- Si un campo numérico no aparece en la factura, devuelve 0. Si un campo de texto no aparece, devuelve "".
- Si el documento NO es una factura de agua o es ilegible, devuelve {"error": "Motivo exacto"}.

GUÍA DE EXTRACCIÓN EMUASA / SUMINISTRADORAS:
- invoiceNumber: "Núm. factura" (ej. 06102026A101053337)
- contractNumber: "Núm. contrato"
- periodStartDate / periodEndDate: fechas de "Lectura anterior" y "Lectura actual" (YYYY-MM-DD)
- billingDays: días reales entre fecha inicio y fin
- totalAmount: "TOTAL A PAGAR" completo en euros (número positivo)
- m3Consumed: "CONSUMO TOTAL" en m³
- breakdown.waterService: importe de "CUOTA DE SERVICIO" dentro de "AGUA(DOMÉSTICA)"
- waterTiers: importes reales de los tramos "De 0 a 5 M3", "De 6 a 20 M3", "De 21 a ... M3"
- breakdown.waterConsumption: suma real de los tramos de consumo de agua
- breakdown.meterConservation: "CONSERVACIÓN DE CONTADOR"
- breakdown.sewerage: suma de "ALCANTARILLADO(DOMÉSTICA)" + "ALCANTARILLADO INFRAESTRUC."
- breakdown.wasteCollection y municipalTaxes.wasteTax: "BASURA" / Tasa municipal
- breakdown.sanitationCanon: "CANON SANEAMIENTO" (fijo + variable ESAMUR)
- breakdown.taxes: suma de los importes de IVA

Devuelve JSON puro con esta estructura exacta (sin markdown):
{
  "utilityType": "WATER",
  "company": "<nombre empresa>",
  "invoiceNumber": "<número factura>",
  "contractNumber": "<número contrato>",
  "chargeDate": "DD.MM.YYYY",
  "receptionDate": "YYYY-MM-DD",
  "periodStartDate": "YYYY-MM-DD",
  "periodEndDate": "YYYY-MM-DD",
  "periodRange": "DD/MM/YYYY - DD/MM/YYYY",
  "billingDays": 0,
  "totalAmount": 0,
  "m3Consumed": 0,
  "unitPrice": 0,
  "costPerDay": 0,
  "contractedPower": "<calibre y nº contador>",
  "breakdown": {
    "waterService": 0,
    "waterConsumption": 0,
    "meterConservation": 0,
    "sewerage": 0,
    "wasteCollection": 0,
    "sanitationCanon": 0,
    "taxes": 0
  },
  "waterTiers": { "tier1_0_5m3": 0, "tier2_6_20m3": 0, "tier3_over20m3": 0 },
  "municipalTaxes": { "wasteTax": 0, "sanitationFixed": 0, "sanitationVariable": 0 },
  "alarm": { "hasAlarm": false, "reason": "", "alerts": [] },
  "notes": "<resumen breve real>"
}

FACTURA DE AGUA:
${combinedText || '[Archivo adjunto]'}
`;

          const contents: any[] = [];
          if (rawPayload) {
            const clean = rawPayload.includes(',') ? rawPayload.split(',')[1] : rawPayload;
            contents.push({
              inlineData: {
                mimeType: mimeType || (clean.startsWith('JVBERi0') ? 'application/pdf' : 'image/jpeg'),
                data: clean,
              },
            });
          }
          contents.push({ text: prompt });

          const geminiCall = getAiClient().models.generateContent({
            model: 'gemini-3.8-flash',
            contents: contents,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 8000));
          const geminiRes: any = await Promise.race([geminiCall, timeoutPromise]);

          const rawJson = geminiRes.text || '{}';
          const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed?.error) {
            return res.status(422).json({ error: parsed.error });
          }
          if (parsed && Number(parsed.totalAmount) > 0) {
            parsed.utilityType = 'WATER';
            return res.json(parsed);
          }
        } catch (geminiErr) {
          console.warn('Gemini water parse warning (falling back to deterministic parser):', geminiErr);
        }
      }

      // Step 3: Strict deterministic parser (zero invented data)
      const result = deterministicParseWater(combinedText);
      if (result.error || !result.data) {
        return res.status(422).json({ error: result.error || 'No se pudo leer la factura de agua.' });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error('Error parsing water bill:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la factura de agua.' });
    }
  });

  // API Endpoint for Electricity Bill Parsing (Auditoría Exhaustiva de Luz)
  app.post('/api/ai/parse-electricity', async (req, res) => {
    try {
      const { text, fileBase64, image, mimeType } = req.body;
      const rawPayload = fileBase64 || image;

      if (!text && !rawPayload) {
        return res.status(400).json({ error: 'Se requiere adjuntar el archivo PDF de la factura o una imagen.' });
      }

      // Step 1: Extract clean text if it is a PDF
      let extractedPdfText = '';
      if (rawPayload) {
        extractedPdfText = await extractTextFromBase64File(rawPayload, mimeType);
      }

      const combinedText = (extractedPdfText ? extractedPdfText + '\n\n' : '') + (text || '');

      // Check utility type mismatch before parsing
      if (combinedText.trim().length > 20) {
        const mismatch = detectUtilityMismatch(combinedText, 'ELECTRICITY');
        if (mismatch) {
          return res.status(422).json({ error: mismatch });
        }
      }

      // Step 2: Try Gemini 3.8 Flash if valid API key is present
      if (hasValidGeminiKey()) {
        try {
          const prompt = `Actúa como un Auditor Energético Senior y Experto en Facturas Eléctricas en España (Repsol, Iberdrola, Endesa, Naturgy).

REGLA ESTRICTA DE INTEGRIDAD (CERO INVENCIÓN):
- Extrae ÚNICAMENTE datos reales presentes literalmente en la factura adjunta.
- PROHIBIDO inventar, estimar, adivinar o rellenar con datos ficticios.
- Si un campo numérico no aparece en la factura, devuelve 0. Si un campo de texto no aparece, devuelve "".
- Si el documento NO es una factura de luz o es ilegible, devuelve {"error": "Motivo exacto"}.

GUÍA DE EXTRACCIÓN REPSOL / COMERCIALIZADORAS:
- invoiceNumber: "Nº de factura" (ej. 61091747645)
- contractNumber: "Nº de contrato" (no confundir con Nº contrato de acceso)
- periodStartDate / periodEndDate / periodRange: "Periodo de facturación" (DD/MM/YYYY - DD/MM/YYYY)
- billingDays: "Días facturados"
- chargeDate: "Fecha de cobro" (en formato DD.MM.YYYY)
- totalAmount: "Total factura" completo en euros
- fixedTermCost: "Término fijo" del desglose principal (no confundir con Cuota de comercialización)
- energyCost: importe total del bloque "Energía"
- kwhConsumed: "Consumo en este periodo" en kWh
- unitPrice: precio real €/kWh del desglose "Energía -> Consumo (P1)" (IMPORTANTE: NO coger los precios de peajes de transporte de la página 3)
- hourlyTiers: consumos en kWh de "Punta", "Llano" y "Valle"
- extraServicesCost / extraServicesName: servicios adicionales no eléctricos como "Tu Asistente 24h", "Servicio de urgencias", "Protección de pagos" (si no hay, 0 y "")
- bonoSocial: "Financiación Bono Social"
- meterRent: "Alquiler de contador"
- taxesCost: importe total de "Impuestos" (Impuesto Eléctrico + IVA)

Devuelve JSON puro con esta estructura exacta (sin markdown):
{
  "utilityType": "ELECTRICITY",
  "company": "<nombre comercializadora>",
  "invoiceNumber": "<número factura>",
  "contractNumber": "<número contrato>",
  "cups": "<código CUPS>",
  "chargeDate": "DD.MM.YYYY",
  "receptionDate": "YYYY-MM-DD",
  "periodStartDate": "YYYY-MM-DD",
  "periodEndDate": "YYYY-MM-DD",
  "periodRange": "DD/MM/YYYY - DD/MM/YYYY",
  "billingDays": 0,
  "totalAmount": 0,
  "kwhConsumed": 0,
  "unitPrice": 0,
  "contractedPower": "<potencia contratada>",
  "fixedTermCost": 0,
  "energyCost": 0,
  "extraServicesCost": 0,
  "extraServicesName": "",
  "meterRent": 0,
  "bonoSocial": 0,
  "taxesCost": 0,
  "costPerDay": 0,
  "hourlyTiers": { "puntaKwh": 0, "llanoKwh": 0, "valleKwh": 0 },
  "topGas": "No",
  "alarm": { "hasAlarm": false, "reason": "", "alerts": [] },
  "notes": "<resumen breve real>"
}

FACTURA DE LUZ:
${combinedText || '[Archivo adjunto]'}
`;

          const contents: any[] = [];
          if (rawPayload) {
            const clean = rawPayload.includes(',') ? rawPayload.split(',')[1] : rawPayload;
            contents.push({
              inlineData: {
                mimeType: mimeType || (clean.startsWith('JVBERi0') ? 'application/pdf' : 'image/jpeg'),
                data: clean,
              },
            });
          }
          contents.push({ text: prompt });

          const geminiCall = getAiClient().models.generateContent({
            model: 'gemini-3.8-flash',
            contents: contents,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 8000));
          const geminiRes: any = await Promise.race([geminiCall, timeoutPromise]);

          const rawJson = geminiRes.text || '{}';
          const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed?.error) {
            return res.status(422).json({ error: parsed.error });
          }
          if (parsed && Number(parsed.totalAmount) > 0) {
            parsed.utilityType = 'ELECTRICITY';
            return res.json(parsed);
          }
        } catch (geminiErr) {
          console.warn('Gemini electricity parse warning (falling back to deterministic parser):', geminiErr);
        }
      }

      // Step 3: Strict deterministic parser (zero invented data)
      const result = deterministicParseElectricity(combinedText);
      if (result.error || !result.data) {
        return res.status(422).json({ error: result.error || 'No se pudo leer la factura de luz.' });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error('Error parsing electricity bill:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la factura de luz.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
