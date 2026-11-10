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

      const prompt = `Actúa como un Auditor de Servicios Municipales y Experto en Digitalización y Auditoría de Facturas de Agua y Saneamiento (ej. EMUASA Aguas de Murcia, Canal de Isabel II, Aguas de Barcelona, Hidralia, Aqualia, Emasesa, Facsa).

Tu tarea es convertir el texto o imagen de la factura de agua en un objeto JSON estructurado con DESGLOSE DETALLADO DE CONCEPTOS para identificar con precisión dónde se producen subidas de tasas municipales (basura, alcantarillado, canon o consumo).

REGLAS DE FORMATO:
Devuelve ÚNICAMENTE el código JSON válido, sin explicaciones ni texto adicional (puro JSON).

ESQUEMA EXACTO OBLIGATORIO:
{
  "utilityType": "WATER",
  "company": "Nombre de la empresa suministradora (ej: EMUASA)",
  "invoiceNumber": "Número de factura exacto",
  "chargeDate": "DD.MM.YYYY (Fecha exacta de cobro o cargo bancario en cuenta. Ej: 11.07.2023)",
  "receptionDate": "YYYY-MM-DD (Fecha exacta de emisión o cobro bancario. Ej: 2023-07-11)",
  "periodStartDate": "YYYY-MM-DD (Fecha de lectura anterior / inicio del tramo facturado. Ej: 2023-05-10)",
  "periodEndDate": "YYYY-MM-DD (Fecha de lectura actual / fin del tramo facturado. Ej: 2023-07-10)",
  "periodRange": "DD.MM.YYYY al DD.MM.YYYY (Tramo facturado visible, ej: 10.05.2023 al 10.07.2023)",
  "totalAmount": 73.56,
  "m3Consumed": 9,
  "unitPrice": 1.71,
  "contractedPower": "Contador 15mm",
  "breakdown": {
    "waterService": 22.21,
    "waterConsumption": 12.50,
    "meterConservation": 0.67,
    "sewerage": 5.98,
    "wasteCollection": 20.54,
    "sanitationCanon": 8.70,
    "taxes": 2.96
  },
  "alarm": {
    "hasAlarm": false,
    "reason": ""
  },
  "notes": "Detalles del contador, lecturas y observaciones de tasas municipales"
}

REGLAS CRÍTICAS PARA FACTURAS DE AGUA:
1. DESGLOSE INDEPENDIENTE DE TASAS (ESENCIAL):
   - "waterService": Cuota fija de servicio de abastecimiento de agua (€).
   - "waterConsumption": Importe de consumo variable de m³ consumidos (€).
   - "meterConservation": Mantenimiento o conservación del contador (€).
   - "sewerage": Tasa de alcantarillado y depuración (€).
   - "wasteCollection": Tasa de recogida de basuras / RSU (€) (Muy importante: a menudo viene incluida en el recibo de agua).
   - "sanitationCanon": Canon de saneamiento autonómico (€).
   - "taxes": IVA o recargos (€).
   La suma de estos conceptos debe coincidir con "totalAmount".
2. FECHAS:
   - "receptionDate": formato "YYYY-MM-DD". Fecha de cargo en banco o emisión.
   - "periodStartDate" y "periodEndDate": Fechas de lectura anterior y actual.
3. ALARMAS:
   - Si la tasa de basuras o el alcantarillado han subido anormalmente o el consumo supera los 25 m³ en vivienda habitual, activa "hasAlarm": true explicando el motivo.

FACTURA DE AGUA A DIGITALIZAR:
${text || '[Factura proporcionada en imagen]'}
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
      // Clean up markdown code blocks if any
      const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing water bill:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la factura de agua con IA.' });
    }
  });

  // API Endpoint for Electricity Bill Parsing
  app.post('/api/ai/parse-electricity', async (req, res) => {
    try {
      const { text, image, mimeType } = req.body;
      if (!text && !image) {
        return res.status(400).json({ error: 'Se requiere texto o imagen de la factura.' });
      }

      const prompt = `Actúa como un Auditor Energético y Experto en Digitalización de Facturas Eléctricas (ej. Repsol, Iberdrola, Endesa, Naturgy, TotalEnergies).

Tu tarea es convertir el texto o imagen de la factura de luz en un objeto JSON estructurado y exacto.

REGLAS DE FORMATO:
Devuelve ÚNICAMENTE el código JSON válido, sin explicaciones ni texto adicional (puro JSON).

ESQUEMA EXACTO:
{
  "utilityType": "ELECTRICITY",
  "company": "Nombre de la comercializadora (ej: Repsol)",
  "invoiceNumber": "Número de factura exacto",
  "chargeDate": "DD.MM.YYYY (Fecha exacta de cobro. Ej: 14.10.2023)",
  "receptionDate": "YYYY-MM-DD (Ej: 2023-10-14)",
  "periodStartDate": "YYYY-MM-DD",
  "periodEndDate": "YYYY-MM-DD",
  "periodRange": "DD.MM.YYYY al DD.MM.YYYY",
  "totalAmount": 105.19,
  "kwhConsumed": 797.80,
  "unitPrice": 0.1149,
  "contractedPower": "5,500 kW",
  "topGas": "No",
  "alarm": {
    "hasAlarm": false,
    "reason": ""
  },
  "notes": "Detalles de potencia punta/valle y peajes"
}

FACTURA DE LUZ A DIGITALIZAR:
${text || '[Factura proporcionada en imagen]'}
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
