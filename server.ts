import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Endpoint for Water Bill Parsing
  app.post('/api/ai/parse-water', async (req, res) => {
    try {
      const { text, image, mimeType } = req.body;
      if (!text && !image) {
        return res.status(400).json({ error: 'Se requiere texto o imagen de la factura.' });
      }

      const prompt = `Actúa como un Auditor de Servicios Municipales y Experto en Digitalización y Auditoría Exhaustiva de Facturas de Agua y Saneamiento (ej. EMUASA Aguas de Murcia, Canal de Isabel II, Aguas de Barcelona, Hidralia, Aqualia, Emasesa, Facsa).

Tu tarea es convertir el texto o imagen de la factura de agua en un objeto JSON estructurado con DESGLOSE DETALLADO DE CONCEPTOS para identificar con precisión dónde se producen subidas de tasas municipales (basura, alcantarillado, canon o consumo) y costes anómalos.

REGLAS DE FORMATO:
Devuelve ÚNICAMENTE el código JSON válido, sin explicaciones ni texto adicional (puro JSON).

ESQUEMA EXACTO OBLIGATORIO:
{
  "utilityType": "WATER",
  "company": "Nombre de la empresa suministradora (ej: EMUASA)",
  "invoiceNumber": "Número de factura exacto (ej: 06102026A100849994)",
  "contractNumber": "Número de contrato o póliza (ej: 6577933)",
  "chargeDate": "DD.MM.YYYY (Fecha de cobro o cargo bancario en cuenta. Ej: 09.09.2026)",
  "receptionDate": "YYYY-MM-DD (Fecha de emisión o cobro. Ej: 2026-09-09)",
  "periodStartDate": "YYYY-MM-DD (Fecha de lectura anterior. Ej: 2026-07-10)",
  "periodEndDate": "YYYY-MM-DD (Fecha de lectura actual. Ej: 2026-09-08)",
  "periodRange": "DD/MM/YYYY - DD/MM/YYYY (Ej: 10/07/2026 - 08/09/2026)",
  "billingDays": 60,
  "totalAmount": 83.57,
  "m3Consumed": 17,
  "unitPrice": 1.48,
  "costPerDay": 1.393,
  "contractedPower": "Contador 15mm (D15TA174976G)",
  "breakdown": {
    "waterService": 13.80,
    "waterConsumption": 15.90,
    "meterConservation": 0.67,
    "sewerage": 8.58,
    "wasteCollection": 28.35,
    "sanitationCanon": 11.10,
    "taxes": 4.08
  },
  "waterTiers": {
    "tier1_0_5m3": 3.16,
    "tier2_6_20m3": 12.74,
    "tier3_over20m3": 0.00
  },
  "municipalTaxes": {
    "wasteTax": 28.35,
    "sanitationFixed": 6.00,
    "sanitationVariable": 5.10
  },
  "alarm": {
    "hasAlarm": false,
    "reason": "",
    "alerts": []
  },
  "notes": "Factura bimestral de 17 m3. La tasa municipal de basura representa el 33.9% de la factura."
}

REGLAS DE AUDITORÍA:
1. DESGLOSE INDEPENDIENTE DE TASAS:
   - "wasteCollection": Tasa de basuras del Ayuntamiento (ej. 28,35 € en EMUASA).
   - "sanitationCanon": Canon de Saneamiento de la Comunidad Autónoma (ESAMUR: fijo 6,00 € + variable 5,10 € = 11,10 €).
   - "waterService": Cuota fija de servicio de abastecimiento de agua (13,80 €).
   - "waterConsumption": Consumo variable de m³ (3,16 € + 12,74 € = 15,90 €).
   - "meterConservation": Mantenimiento del contador (0,67 €).
   - "sewerage": Cuota y consumo de alcantarillado (3,04 € + 5,54 € = 8,58 €).
2. ALARMAS INTELIGENTES:
   - Si la tasa de basuras o canon supera el 30% del recibo, genera una alerta explicativa en "alarm.alerts".
   - Si el consumo supera los 20 m³ bimestrales, genera aviso de salto a tramo caro.

FACTURA DE AGUA A AUDITAR:
${text || '[Factura proporcionada en imagen/documento]'}
`;

      const contents: any[] = [];
      if (image) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: image,
          },
        });
      }
      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJson = response.text || '{}';
      const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing water bill:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la factura de agua con IA.' });
    }
  });

  // API Endpoint for Electricity Bill Parsing (Auditoría Exhaustiva de Luz)
  app.post('/api/ai/parse-electricity', async (req, res) => {
    try {
      const { text, image, mimeType } = req.body;
      if (!text && !image) {
        return res.status(400).json({ error: 'Se requiere texto o imagen de la factura.' });
      }

      const prompt = `Actúa como un Auditor Energético Senior y Experto en Detección de Sobrecostes y Subidas de Facturas Eléctricas en España (ej. Repsol, Iberdrola, Endesa, Naturgy, TotalEnergies, Curenergía, Octopus, Gana Energía).

Tu objetivo es analizar la factura de luz minuciosamente para extraer todos los datos del término de potencia, término de energía, peajes, impuestos y SERVICIOS OCULTOS/EXTRAS para detectar subidas de precio de kWh o cobros no deseados.

REGLAS DE FORMATO:
Devuelve ÚNICAMENTE el código JSON válido, sin explicaciones ni texto adicional (puro JSON).

ESQUEMA EXACTO OBLIGATORIO:
{
  "utilityType": "ELECTRICITY",
  "company": "Nombre exacto de la comercializadora (ej: Repsol Comercializadora de Electricidad y Gas)",
  "invoiceNumber": "Número exacto de factura (ej: 61093604335)",
  "contractNumber": "Número de contrato (ej: 4301983815)",
  "cups": "Código CUPS (ej: ES0021000013023167NN1F)",
  "chargeDate": "DD.MM.YYYY (Fecha exacta de cobro bancario. Ej: 29.10.2026)",
  "receptionDate": "YYYY-MM-DD (Fecha de emisión o cobro. Ej: 2026-10-29)",
  "periodStartDate": "YYYY-MM-DD (Inicio de periodo. Ej: 2026-09-24)",
  "periodEndDate": "YYYY-MM-DD (Fin de periodo. Ej: 2026-10-24)",
  "periodRange": "DD/MM/YYYY - DD/MM/YYYY (Ej: 24/09/2026 - 24/10/2026)",
  "billingDays": 30,
  "totalAmount": 103.33,
  "kwhConsumed": 415.27,
  "unitPrice": 0.10115,
  "contractedPower": "6,900 kW",
  "fixedTermCost": 33.92,
  "energyCost": 42.01,
  "extraServicesCost": 4.06,
  "extraServicesName": "Tu Asistente 24h",
  "meterRent": 0.75,
  "bonoSocial": 0.74,
  "taxesCost": 21.85,
  "costPerDay": 3.44,
  "hourlyTiers": {
    "puntaKwh": 96.23,
    "llanoKwh": 96.80,
    "valleKwh": 222.25
  },
  "topGas": "No",
  "alarm": {
    "hasAlarm": false,
    "reason": "",
    "alerts": []
  },
  "notes": "Factura Repsol: Potencia 6.9kW (33,92€) + Energía a 0.10115 €/kWh (42,01€) + Servicio Asistencia 24h (4,06€) + Impuestos (21,85€)."
}

REGLAS CRÍTICAS DE AUDITORÍA:
1. DETECCIÓN DE PRECIO REAL DEL KWH ("unitPrice"):
   - Extrae el precio exacto por kWh sin redondear (ej: 0.10115 €/kWh o 0.169746 €/kWh).
2. DETECCIÓN DE SERVICIOS EXTRAS/SEGUROS ("extraServicesCost"):
   - Si la comercializadora incluye conceptos como "Tu Asistente 24h", "Protección de pagos", "Servicio urgencias", "Mantenimiento gas/luz", extráelo en "extraServicesCost" y en "extraServicesName".
   - Si existe este coste adicional, añade una alerta crítica en "alarm.alerts" advirtiendo que la compañía está cobrando servicios auxiliares.
3. TÉRMINO DE POTENCIA:
   - Extrae la potencia contratada (ej: 6,9 kW) y el coste del término fijo total (ej: 33,92 €).
4. TRAMOS HORARIOS:
   - Si la factura desglosa Punta, Llano y Valle, extrae los kWh correspondientes a cada periodo.

FACTURA DE LUZ A AUDITAR:
${text || '[Factura proporcionada en imagen/documento]'}
`;

      const contents: any[] = [];
      if (image) {
        contents.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: image,
          },
        });
      }
      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJson = response.text || '{}';
      const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing electricity bill:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la factura de luz con IA.' });
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

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
