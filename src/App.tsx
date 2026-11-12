/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  FileText,
  DollarSign,
  Droplet,
  Zap,
  Wrench,
  Calendar,
  BarChart2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  Database,
  Percent,
  Flame,
  Globe,
  Printer,
  Table,
  Eye,
  Copy,
  Send,
  ArrowRight,
  CreditCard,
  TrendingUp,
  PieChart,
  Sliders,
  Info,
  TrendingDown,
  BellRing,
  Activity
} from 'lucide-react';

import modernBgImg from '@/src/assets/images/modern_interior_bg_1794332151577.jpg';

// --- Types ---
interface TenantInfo {
  name: string;
  dni: string;
  phone: string;
  familyPhone: string;
  familyName: string;
  familyRelationship: string;
}

interface AdvancePayment {
  id: string;
  count: number;
  cost: number;
  description: string;
  date: string;
}

interface RentRate {
  id: string;
  amount: number;
  startDate: string;
  modificationDate?: string;
  reason?: string;
}

interface SupplySplitRules {
  electricity: number;
  water: number;
  gas: number;
  internet: number;
}

interface WaterExpense {
  id: string;
  utilityType: 'WATER';
  company: string;
  invoiceNumber: string;
  contractNumber?: string;
  chargeDate: string;
  receptionDate: string; // YYYY-MM-DD
  periodStartDate: string;
  periodEndDate: string;
  periodRange: string;
  billingDays?: number;
  costPerDay?: number;
  totalAmount: number; // Parte del inquilino
  fullInvoiceTotal?: number; // Total de la factura completa
  m3Consumed: number;
  unitPrice: number;
  contractedPower: string;
  breakdown: {
    waterService: number;
    waterConsumption: number;
    meterConservation: number;
    sewerage: number;
    wasteCollection: number;
    sanitationCanon: number;
    taxes: number;
  };
  waterTiers?: {
    tier1_0_5m3?: number;
    tier2_6_20m3?: number;
    tier3_over20m3?: number;
  };
  municipalTaxes?: {
    wasteTax?: number;
    sanitationFixed?: number;
    sanitationVariable?: number;
  };
  priceVariationPct?: number;
  prevUnitPrice?: number;
  alarm: {
    hasAlarm: boolean;
    reason: string;
    alerts?: string[];
  };
  notes: string;
  status: 'PENDING' | 'PAID';
  receiptId?: string;
}

interface ElectricityExpense {
  id: string;
  utilityType: 'ELECTRICITY';
  company: string;
  invoiceNumber: string;
  contractNumber?: string;
  cups?: string;
  chargeDate: string;
  receptionDate: string; // YYYY-MM-DD
  periodStartDate: string;
  periodEndDate: string;
  periodRange: string;
  billingDays?: number;
  costPerDay?: number;
  totalAmount: number; // Parte del inquilino
  fullInvoiceTotal?: number; // Total de la factura completa
  kwhConsumed: number;
  unitPrice: number; // Precio exacto €/kWh (ej 0.10115 o 0.169746)
  contractedPower: string;
  topGas: string;
  fixedTermCost?: number;
  energyCost?: number;
  extraServicesCost?: number; // Ej: Tu Asistente 24h
  extraServicesName?: string;
  meterRent?: number;
  bonoSocial?: number;
  taxesCost?: number;
  hourlyTiers?: {
    puntaKwh?: number;
    llanoKwh?: number;
    valleKwh?: number;
  };
  priceVariationPct?: number;
  prevUnitPrice?: number;
  isRateChange?: boolean;
  alarm: {
    hasAlarm: boolean;
    reason: string;
    alerts?: string[];
  };
  notes: string;
  status: 'PENDING' | 'PAID';
  receiptId?: string;
}

interface OtherExpense {
  id: string;
  name: string;
  cost: number;
  date: string; // YYYY-MM-DD
  notes: string;
  status: 'PENDING' | 'PAID';
  receiptId?: string;
}

interface MonthlyRentItem {
  id: string;
  monthYear: string;
  monthName: string;
  rentAmount: number;
  status: 'PENDING' | 'PAID';
  receiptId?: string;
}

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  issueDate: string; // Fecha de creación/emisión (YYYY-MM-DD)
  title: string;
  items: {
    type: 'RENT' | 'WATER' | 'ELECTRICITY' | 'OTHER';
    itemId: string;
    description: string;
    amount: number;
    period?: string;
    detail?: string;
  }[];
  previousBalance: number; // Positivo = debía del recibo anterior; Negativo = a favor del inquilino
  subtotalItems: number;
  totalAmount: number; // subtotalItems + previousBalance
  amountPaid: number; // Lo que pagó efectivamente el inquilino
  remainingBalance: number; // totalAmount - amountPaid (>0 = pendiente para siguiente recibo; <0 = a favor)
  explanationNote: string; // Texto explicativo para WhatsApp / inquilino
  status: 'PENDING' | 'PAID';
  paidDate?: string;
}

interface CustomHistoricalEntry {
  id: string;
  year: number;
  monthKey: string; // e.g. "2025-05"
  monthName: string; // e.g. "Mayo 2025"
  tenantName: string;
  rentAmount: number;
  elecCost: number;
  waterCost: number;
  gasCost: number;
  repairsCost: number;
  status: 'PAID' | 'PENDING';
  notes?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'months' | 'expenses' | 'billing' | 'desglose' | 'stats' | 'backup' | 'analytics'>('tenant');
  const [expensesSubTab, setExpensesSubTab] = useState<'summary' | 'audit_elec' | 'audit_water' | 'other'>('summary');
  const [billingSubTab, setBillingSubTab] = useState<'4.1_builder' | '4.2_receipts' | '4.3_history' | '4.4_stats'>('4.1_builder');
  const [filterExpenseStatus, setFilterExpenseStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Advanced Supply Analytics Filters
  const [analyticsPeriod, setAnalyticsPeriod] = useState<number | 'ALL' | 'L12M'>(2026);
  const [analyticsCompareWith, setAnalyticsCompareWith] = useState<'PREV_YEAR' | 'AVERAGE'>('PREV_YEAR');

  // Tenant state
  const [tenant, setTenant] = useState<TenantInfo>(() => {
    const saved = localStorage.getItem('inquilinopro_tenant');
    return saved ? JSON.parse(saved) : {
      name: 'Borja Álvarez',
      dni: '48291024-X',
      phone: '+34 612 345 678',
      familyPhone: '+34 698 765 432',
      familyName: 'María Álvarez (Madre)',
      familyRelationship: 'Madre',
    };
  });

  // Advance payments
  const [advances, setAdvances] = useState<AdvancePayment[]>(() => {
    const saved = localStorage.getItem('inquilinopro_advances');
    return saved ? JSON.parse(saved) : [
      { id: '1', count: 2, cost: 600, description: 'Fianza legal (2 meses de fianza/adelanto)', date: '2025-01-01' }
    ];
  });

  // Rent rates
  const [rentRates, setRentRates] = useState<RentRate[]>(() => {
    const saved = localStorage.getItem('inquilinopro_rents');
    return saved ? JSON.parse(saved) : [
      { id: '1', amount: 250, startDate: '2021-07-01', modificationDate: '2021-07-01', reason: 'Inicio de contrato' },
      { id: '2', amount: 300, startDate: '2026-07-01', modificationDate: '2026-06-15', reason: 'Actualización IPC y mejora' }
    ];
  });

  // Supply split rules
  const [supplyRules, setSupplyRules] = useState<SupplySplitRules>(() => {
    const saved = localStorage.getItem('inquilinopro_supply_rules');
    return saved ? JSON.parse(saved) : {
      electricity: 50,
      water: 50,
      gas: 0,
      internet: 0
    };
  });

  // Water expenses (Desglose tipo EMUASA Aguas de Murcia con tasas municipales)
  const [waterExpenses, setWaterExpenses] = useState<WaterExpense[]>(() => {
    const saved = localStorage.getItem('inquilinopro_water_v2');
    return saved ? JSON.parse(saved) : [
      {
        id: 'w_sep26',
        utilityType: 'WATER',
        company: 'EMUASA Aguas de Murcia',
        invoiceNumber: '06102026A100849994',
        contractNumber: '6577933',
        chargeDate: '09.09.2026',
        receptionDate: '2026-09-09',
        periodStartDate: '2026-07-10',
        periodEndDate: '2026-09-08',
        periodRange: '10/07/2026 - 08/09/2026',
        billingDays: 60,
        costPerDay: 1.393,
        totalAmount: 41.79, // 50%
        fullInvoiceTotal: 83.57,
        m3Consumed: 17,
        unitPrice: 1.48,
        contractedPower: 'Contador 15mm (D15TA174976G)',
        breakdown: {
          waterService: 13.80,
          waterConsumption: 15.90,
          meterConservation: 0.67,
          sewerage: 8.58,
          wasteCollection: 28.35,
          sanitationCanon: 11.10,
          taxes: 4.08
        },
        waterTiers: { tier1_0_5m3: 3.16, tier2_6_20m3: 12.74, tier3_over20m3: 0.00 },
        municipalTaxes: { wasteTax: 28.35, sanitationFixed: 6.00, sanitationVariable: 5.10 },
        alarm: {
          hasAlarm: true,
          reason: 'La tasa de basura (28,35€) y el canon de saneamiento (11,10€) suman el 47,2% del total de la factura.',
          alerts: [
            'Tasa de Basura del Ayuntamiento de Murcia: 28,35 € (33,9% del total)',
            'Canon de Saneamiento ESAMUR: 11,10 € (Fijo 6,00 € + Variable 5,10 €)'
          ]
        },
        notes: 'Factura bimestral de 17 m3. Fuerte impacto de tasas municipales.',
        status: 'PENDING'
      },
      {
        id: 'w_jul26',
        utilityType: 'WATER',
        company: 'EMUASA Aguas de Murcia',
        invoiceNumber: '06102026A100612140',
        contractNumber: '6577933',
        chargeDate: '09.07.2026',
        receptionDate: '2026-07-09',
        periodStartDate: '2026-05-11',
        periodEndDate: '2026-07-10',
        periodRange: '11/05/2026 - 10/07/2026',
        billingDays: 60,
        costPerDay: 1.320,
        totalAmount: 39.60,
        fullInvoiceTotal: 79.20,
        m3Consumed: 14,
        unitPrice: 1.45,
        contractedPower: 'Contador 15mm',
        breakdown: {
          waterService: 13.80,
          waterConsumption: 13.10,
          meterConservation: 0.67,
          sewerage: 7.40,
          wasteCollection: 28.35,
          sanitationCanon: 9.80,
          taxes: 3.88
        },
        alarm: { hasAlarm: false, reason: '' },
        notes: 'Factura bimestral pagada',
        status: 'PAID'
      },
      {
        id: 'w_may26',
        utilityType: 'WATER',
        company: 'EMUASA Aguas de Murcia',
        invoiceNumber: '06102026A100498112',
        contractNumber: '6577933',
        chargeDate: '11.05.2026',
        receptionDate: '2026-05-11',
        periodStartDate: '2026-03-11',
        periodEndDate: '2026-05-11',
        periodRange: '11/03/2026 - 11/05/2026',
        billingDays: 61,
        costPerDay: 1.400,
        totalAmount: 42.70,
        fullInvoiceTotal: 85.40,
        m3Consumed: 18,
        unitPrice: 1.50,
        contractedPower: 'Contador 15mm',
        breakdown: {
          waterService: 13.80,
          waterConsumption: 16.90,
          meterConservation: 0.67,
          sewerage: 9.10,
          wasteCollection: 28.35,
          sanitationCanon: 11.60,
          taxes: 4.18
        },
        alarm: { hasAlarm: false, reason: '' },
        notes: 'Liquidada en recibo',
        status: 'PAID'
      }
    ];
  });

  // Electricity expenses (Historial real Repsol con seguimiento de precio kWh, tramos y servicios ocultos)
  const [electricityExpenses, setElectricityExpenses] = useState<ElectricityExpense[]>(() => {
    const saved = localStorage.getItem('inquilinopro_elec_v2');
    return saved ? JSON.parse(saved) : [
      {
        id: 'e_oct26',
        utilityType: 'ELECTRICITY',
        company: 'Repsol Comercializadora',
        invoiceNumber: '61093604335',
        contractNumber: '4301983815',
        cups: 'ES0021000013023167NN1F',
        chargeDate: '29.10.2026',
        receptionDate: '2026-10-29',
        periodStartDate: '2026-09-24',
        periodEndDate: '2026-10-24',
        periodRange: '24/09/2026 - 24/10/2026',
        billingDays: 30,
        costPerDay: 3.44,
        totalAmount: 51.67, // 50%
        fullInvoiceTotal: 103.33,
        kwhConsumed: 415.27,
        unitPrice: 0.101150,
        prevUnitPrice: 0.139746,
        priceVariationPct: -27.6, // ¡Gran bajada de precio de energía!
        contractedPower: '6,900 kW',
        fixedTermCost: 33.92,
        energyCost: 42.01,
        extraServicesCost: 4.06,
        extraServicesName: 'Tu Asistente 24h',
        meterRent: 0.75,
        bonoSocial: 0.74,
        taxesCost: 21.85,
        hourlyTiers: {
          puntaKwh: 96.23,
          llanoKwh: 96.80,
          valleKwh: 222.25
        },
        topGas: 'No',
        alarm: {
          hasAlarm: true,
          reason: 'Servicio accesorio detectado: Repsol cobra 4,06 € por Tu Asistente 24h. Bajada de precio de kWh de 0,1397 € a 0,1011 € (-27,6%).',
          alerts: [
            '📉 Bajada de precio kWh: De 0,139746 € a 0,101150 € (-27,6% de ahorro en término de energía).',
            '🚨 Cobro no esencial detectado: 4,06 € facturados por "Tu Asistente 24h" (posible servicio prescindible).'
          ]
        },
        notes: 'Factura oficial Repsol. Potencia 6,9 kW. Bajada sustancial de precio de energía pero incluye Tu Asistente 24h.',
        status: 'PENDING'
      },
      {
        id: 'e_sep26',
        utilityType: 'ELECTRICITY',
        company: 'Repsol Comercializadora',
        invoiceNumber: '61093512891',
        contractNumber: '4301983815',
        chargeDate: '03.10.2026',
        receptionDate: '2026-10-03',
        periodStartDate: '2026-08-24',
        periodEndDate: '2026-09-24',
        periodRange: '24/08/2026 - 24/09/2026',
        billingDays: 31,
        costPerDay: 2.607,
        totalAmount: 40.41,
        fullInvoiceTotal: 80.82,
        kwhConsumed: 332.00,
        unitPrice: 0.139746,
        prevUnitPrice: 0.139746,
        priceVariationPct: 0.0,
        contractedPower: '6,900 kW',
        fixedTermCost: 33.92,
        energyCost: 46.40,
        extraServicesCost: 4.06,
        extraServicesName: 'Tu Asistente 24h',
        hourlyTiers: {
          puntaKwh: 97.00,
          llanoKwh: 103.00,
          valleKwh: 132.00
        },
        topGas: 'No',
        alarm: { hasAlarm: false, reason: '' },
        notes: 'Factura mensual septiembre',
        status: 'PENDING'
      },
      {
        id: 'e_aug26',
        utilityType: 'ELECTRICITY',
        company: 'Repsol Comercializadora',
        invoiceNumber: '61093409123',
        chargeDate: '03.09.2026',
        receptionDate: '2026-09-03',
        periodStartDate: '2026-07-24',
        periodEndDate: '2026-08-24',
        periodRange: '24/07/2026 - 24/08/2026',
        billingDays: 31,
        costPerDay: 3.049,
        totalAmount: 47.26,
        fullInvoiceTotal: 94.52,
        kwhConsumed: 417.00,
        unitPrice: 0.139746,
        prevUnitPrice: 0.139746,
        priceVariationPct: 0.0,
        contractedPower: '6,900 kW',
        extraServicesCost: 4.06,
        extraServicesName: 'Tu Asistente 24h',
        hourlyTiers: {
          puntaKwh: 120.00,
          llanoKwh: 121.00,
          valleKwh: 176.00
        },
        topGas: 'No',
        alarm: { hasAlarm: false, reason: '' },
        notes: 'Verano climatización',
        status: 'PAID'
      },
      {
        id: 'e_jul26',
        utilityType: 'ELECTRICITY',
        company: 'Repsol Comercializadora',
        invoiceNumber: '61093301290',
        chargeDate: '02.08.2026',
        receptionDate: '2026-08-02',
        periodStartDate: '2026-06-24',
        periodEndDate: '2026-07-24',
        periodRange: '24/06/2026 - 24/07/2026',
        billingDays: 30,
        costPerDay: 3.150,
        totalAmount: 47.26,
        fullInvoiceTotal: 94.52,
        kwhConsumed: 425.00,
        unitPrice: 0.139746,
        prevUnitPrice: 0.169342,
        priceVariationPct: -17.5,
        contractedPower: '6,900 kW',
        extraServicesCost: 4.06,
        extraServicesName: 'Tu Asistente 24h',
        hourlyTiers: {
          puntaKwh: 128.00,
          llanoKwh: 121.00,
          valleKwh: 176.00
        },
        topGas: 'No',
        alarm: {
          hasAlarm: true,
          reason: 'Bajada de tarifa tras negociación: De 0,169342 € a 0,139746 € (-17,5%).'
        },
        notes: 'Nuevo precio tras fin de contrato anterior',
        status: 'PAID'
      },
      {
        id: 'e_jun26',
        utilityType: 'ELECTRICITY',
        company: 'Repsol Comercializadora',
        invoiceNumber: '61093208741',
        chargeDate: '03.07.2026',
        receptionDate: '2026-07-03',
        periodStartDate: '2026-05-24',
        periodEndDate: '2026-06-24',
        periodRange: '01/06/2026 - 03/07/2026',
        billingDays: 32,
        costPerDay: 3.662,
        totalAmount: 58.60,
        fullInvoiceTotal: 117.20,
        kwhConsumed: 477.00,
        unitPrice: 0.169342,
        isRateChange: true,
        contractedPower: '6,900 kW',
        extraServicesCost: 4.06,
        extraServicesName: 'Tu Asistente 24h',
        hourlyTiers: {
          puntaKwh: 103.00,
          llanoKwh: 167.00,
          valleKwh: 207.00
        },
        topGas: 'No',
        alarm: {
          hasAlarm: true,
          reason: '⚡ CAMBIO DE TARIFA indicado en factura por la comercializadora.'
        },
        notes: 'Cambio de tarifa registrado en hoja Repsol',
        status: 'PAID'
      }
    ];
  });

  // Other expenses
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>(() => {
    const saved = localStorage.getItem('inquilinopro_other');
    return saved ? JSON.parse(saved) : [];
  });

  // Receipts list
  const [receipts, setReceipts] = useState<ReceiptItem[]>(() => {
    const saved = localStorage.getItem('inquilinopro_receipts');
    return saved ? JSON.parse(saved) : [];
  });

  // Arrears / Balance carryover
  const [tenantAccumulatedBalance, setTenantAccumulatedBalance] = useState<number>(() => {
    const saved = localStorage.getItem('inquilinopro_tenant_balance');
    return saved ? parseFloat(saved) : 0;
  });

  // Multi-year History Filter & Custom Entries State
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState<number | 'ALL'>(2026);
  const [chartViewMode, setChartViewMode] = useState<'monthly' | 'breakdown' | 'comparison'>('monthly');
  const [isAddHistoricalModalOpen, setIsAddHistoricalModalOpen] = useState(false);

  // Form states for manual historical entry modal
  const [histFormYear, setHistFormYear] = useState<number>(2025);
  const [histFormMonthNum, setHistFormMonthNum] = useState<number>(12);
  const [histFormRent, setHistFormRent] = useState<string>('250');
  const [histFormElec, setHistFormElec] = useState<string>('0');
  const [histFormWater, setHistFormWater] = useState<string>('0');
  const [histFormGas, setHistFormGas] = useState<string>('0');
  const [histFormRepairs, setHistFormRepairs] = useState<string>('0');
  const [histFormStatus, setHistFormStatus] = useState<'PAID' | 'PENDING'>('PAID');

  const [customHistoricalEntries, setCustomHistoricalEntries] = useState<CustomHistoricalEntry[]>(() => {
    const saved = localStorage.getItem('inquilinopro_custom_history');
    return saved ? JSON.parse(saved) : [
      { id: 'h2025_12', year: 2025, monthKey: '2025-12', monthName: 'Diciembre 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 75.40, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_11', year: 2025, monthKey: '2025-11', monthName: 'Noviembre 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 68.20, waterCost: 40.10, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_10', year: 2025, monthKey: '2025-10', monthName: 'Octubre 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 62.00, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_09', year: 2025, monthKey: '2025-09', monthName: 'Septiembre 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 95.10, waterCost: 42.50, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_08', year: 2025, monthKey: '2025-08', monthName: 'Agosto 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 110.00, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_07', year: 2025, monthKey: '2025-07', monthName: 'Julio 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 105.30, waterCost: 44.00, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_06', year: 2025, monthKey: '2025-06', monthName: 'Junio 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 72.80, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_05', year: 2025, monthKey: '2025-05', monthName: 'Mayo 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 55.40, waterCost: 38.90, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_04', year: 2025, monthKey: '2025-04', monthName: 'Abril 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 58.10, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_03', year: 2025, monthKey: '2025-03', monthName: 'Marzo 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 65.00, waterCost: 39.50, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_02', year: 2025, monthKey: '2025-02', monthName: 'Febrero 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 78.90, waterCost: 0, gasCost: 0, repairsCost: 0, status: 'PAID' },
      { id: 'h2025_01', year: 2025, monthKey: '2025-01', monthName: 'Enero 2025', tenantName: 'Borja Álvarez', rentAmount: 250, elecCost: 82.30, waterCost: 41.20, gasCost: 0, repairsCost: 0, status: 'PAID' },
    ];
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('inquilinopro_tenant', JSON.stringify(tenant));
    localStorage.setItem('inquilinopro_advances', JSON.stringify(advances));
    localStorage.setItem('inquilinopro_rents', JSON.stringify(rentRates));
    localStorage.setItem('inquilinopro_supply_rules', JSON.stringify(supplyRules));
    localStorage.setItem('inquilinopro_water_v2', JSON.stringify(waterExpenses));
    localStorage.setItem('inquilinopro_elec_v2', JSON.stringify(electricityExpenses));
    localStorage.setItem('inquilinopro_other', JSON.stringify(otherExpenses));
    localStorage.setItem('inquilinopro_receipts', JSON.stringify(receipts));
    localStorage.setItem('inquilinopro_tenant_balance', tenantAccumulatedBalance.toString());
    localStorage.setItem('inquilinopro_custom_history', JSON.stringify(customHistoricalEntries));
  }, [tenant, advances, rentRates, supplyRules, waterExpenses, electricityExpenses, otherExpenses, receipts, tenantAccumulatedBalance, customHistoricalEntries]);

  // AI Modal State for PDF & Image OCR
  const [isScanning, setIsScanning] = useState(false);
  const [aiModalType, setAiModalType] = useState<'WATER' | 'ELECTRICITY' | null>(null);
  const [rawAiInput, setRawAiInput] = useState('');
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string | null>(null);
  const [uploadedPdfInfo, setUploadedPdfInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  // Dedicated Audit Inspector and Alert States
  const [auditedBillPreview, setAuditedBillPreview] = useState<{
    expense: ElectricityExpense | WaterExpense;
    type: 'ELECTRICITY' | 'WATER';
    priceDiffPct?: number;
    prevUnitPrice?: number;
    alerts: string[];
    isRateChange?: boolean;
    extraServiceWarning?: string;
  } | null>(null);

  const [viewingAuditExpense, setViewingAuditExpense] = useState<ElectricityExpense | WaterExpense | null>(null);

  // Selected receipt for detailed preview / print modal
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<ReceiptItem | null>(null);
  const [copySuccessToast, setCopySuccessToast] = useState(false);

  // --- Dynamic Receipt Builder State (Prompt 9 Requirements) ---
  const todayStr = new Date().toISOString().split('T')[0];
  const [draftIssueDate, setDraftIssueDate] = useState<string>(todayStr);
  const [draftReceiptNumber, setDraftReceiptNumber] = useState<string>(`REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`);
  const [draftTitle, setDraftTitle] = useState<string>('Liquidación de Alquiler y Suministros');
  
  // Selected items to bundle in current draft
  const [selectedRentMonths, setSelectedRentMonths] = useState<string[]>(['2026-11']);
  const [selectedWaterIds, setSelectedWaterIds] = useState<string[]>([]);
  const [selectedElectricityIds, setSelectedElectricityIds] = useState<string[]>([]);
  const [selectedOtherIds, setSelectedOtherIds] = useState<string[]>([]);

  // Previous balance adjustment (e.g. +59€ or -41€)
  const [draftPreviousBalance, setDraftPreviousBalance] = useState<number>(tenantAccumulatedBalance);
  const [draftAmountPaid, setDraftAmountPaid] = useState<string>('');
  const [draftExplanationNote, setDraftExplanationNote] = useState<string>('');
  const [isNoteManuallyEdited, setIsNoteManuallyEdited] = useState<boolean>(false);

  // Sync draft previous balance if tenantAccumulatedBalance changes and draft has not been touched
  useEffect(() => {
    setDraftPreviousBalance(tenantAccumulatedBalance);
  }, [tenantAccumulatedBalance]);

  // Rent lookup by month
  const getCurrentRentForMonth = (yearMonth: string) => {
    const sorted = [...rentRates].sort((a, b) => a.startDate.localeCompare(b.startDate));
    let current = sorted[0]?.amount || 300;
    for (const r of sorted) {
      if (r.startDate <= `${yearMonth}-01`) {
        current = r.amount;
      }
    }
    return current;
  };

  // Generate Months list
  const monthsList: MonthlyRentItem[] = useMemo(() => {
    const list: MonthlyRentItem[] = [];
    const now = new Date();
    for (let i = 8; i >= -3; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${month}`;
      const monthName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const rentAmount = getCurrentRentForMonth(yearMonth);
      
      // Look for a paid receipt containing this month
      const isPaid = receipts.some(rec => 
        rec.status === 'PAID' && rec.items.some(item => item.type === 'RENT' && item.itemId === `rent-${yearMonth}`)
      );
      const isDraftSelected = selectedRentMonths.includes(yearMonth);

      list.push({
        id: `rent-${yearMonth}`,
        monthYear: yearMonth,
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        rentAmount,
        status: isPaid ? 'PAID' : 'PENDING',
        receiptId: isPaid ? 'PAID_RECEIPT' : undefined
      });
    }
    return list.sort((a, b) => b.monthYear.localeCompare(a.monthYear));
  }, [rentRates, receipts, selectedRentMonths]);

  // Calculate Draft Items
  const draftItems = useMemo(() => {
    const items: ReceiptItem['items'] = [];

    // Rent items
    selectedRentMonths.forEach(ym => {
      const amount = getCurrentRentForMonth(ym);
      const monthObj = monthsList.find(m => m.monthYear === ym);
      items.push({
        type: 'RENT',
        itemId: `rent-${ym}`,
        description: `Renta Alquiler ${monthObj ? monthObj.monthName : ym}`,
        amount,
        period: ym
      });
    });

    // Water items
    selectedWaterIds.forEach(id => {
      const w = waterExpenses.find(x => x.id === id);
      if (w) {
        items.push({
          type: 'WATER',
          itemId: w.id,
          description: `Agua ${w.company} (${w.periodRange || w.invoiceNumber})`,
          amount: w.totalAmount,
          period: w.periodRange,
          detail: `Factura total: ${w.fullInvoiceTotal || (w.totalAmount / (supplyRules.water / 100)).toFixed(2)}€ (A cargo inquilino ${supplyRules.water}%)`
        });
      }
    });

    // Electricity items
    selectedElectricityIds.forEach(id => {
      const e = electricityExpenses.find(x => x.id === id);
      if (e) {
        items.push({
          type: 'ELECTRICITY',
          itemId: e.id,
          description: `Luz ${e.company} (${e.periodRange || e.invoiceNumber})`,
          amount: e.totalAmount,
          period: e.periodRange,
          detail: `Factura total: ${e.fullInvoiceTotal || (e.totalAmount / (supplyRules.electricity / 100)).toFixed(2)}€ (A cargo inquilino ${supplyRules.electricity}%)`
        });
      }
    });

    // Other items
    selectedOtherIds.forEach(id => {
      const o = otherExpenses.find(x => x.id === id);
      if (o) {
        items.push({
          type: 'OTHER',
          itemId: o.id,
          description: `Gasto / Avería: ${o.name}`,
          amount: o.cost,
          detail: o.notes
        });
      }
    });

    return items;
  }, [selectedRentMonths, selectedWaterIds, selectedElectricityIds, selectedOtherIds, monthsList, waterExpenses, electricityExpenses, otherExpenses, supplyRules]);

  // Calculations for Draft Receipt
  const draftSubtotal = useMemo(() => {
    return draftItems.reduce((acc, i) => acc + i.amount, 0);
  }, [draftItems]);

  const draftTotalAmount = useMemo(() => {
    return Math.round((draftSubtotal + draftPreviousBalance) * 100) / 100;
  }, [draftSubtotal, draftPreviousBalance]);

  // When total changes, if user hasn't typed an amount paid, default to draftTotalAmount
  const currentAmountPaidNum = draftAmountPaid === '' ? draftTotalAmount : (parseFloat(draftAmountPaid) || 0);
  const draftRemainingBalance = Math.round((draftTotalAmount - currentAmountPaidNum) * 100) / 100;

  // Unbilled / Pending supplies that have NOT been included in this receipt (User prompt 9 requirement)
  const unincludedPendingWater = useMemo(() => {
    return waterExpenses.filter(w => w.status === 'PENDING' && !selectedWaterIds.includes(w.id));
  }, [waterExpenses, selectedWaterIds]);

  const unincludedPendingElec = useMemo(() => {
    return electricityExpenses.filter(e => e.status === 'PENDING' && !selectedElectricityIds.includes(e.id));
  }, [electricityExpenses, selectedElectricityIds]);

  // Auto-generate dynamic explanation text for the tenant / WhatsApp (User prompt 9 requirement)
  useEffect(() => {
    if (isNoteManuallyEdited) return;

    let text = `📄 *LIQUIDACIÓN Y RECIBO DE COBRO*\n`;
    text += `👤 *Inquilino:* ${tenant.name}\n`;
    text += `📅 *Fecha de emisión:* ${draftIssueDate}\n`;
    text += `🔖 *Nº Recibo:* ${draftReceiptNumber}\n\n`;

    text += `📌 *CONCEPTOS INCLUIDOS:*\n`;
    if (draftItems.length === 0) {
      text += `- Sin conceptos seleccionados\n`;
    } else {
      draftItems.forEach(item => {
        text += `• ${item.description}: ${item.amount.toFixed(2)} €\n`;
      });
    }

    text += `\n*Subtotal conceptos:* ${draftSubtotal.toFixed(2)} €\n`;

    if (draftPreviousBalance !== 0) {
      if (draftPreviousBalance > 0) {
        text += `⚠️ *Saldo pendiente de liquidación anterior:* +${draftPreviousBalance.toFixed(2)} €\n`;
      } else {
        text += `💰 *Saldo a favor del inquilino aplicado:* ${draftPreviousBalance.toFixed(2)} €\n`;
      }
    }

    text += `\n💵 *TOTAL A PAGAR: ${draftTotalAmount.toFixed(2)} €*\n`;
    text += `💳 *Importe entregado / pagado:* ${currentAmountPaidNum.toFixed(2)} €\n`;

    if (draftRemainingBalance > 0) {
      text += `❗ *Pendiente para el próximo recibo:* ${draftRemainingBalance.toFixed(2)} € (se cobrará en la siguiente liquidación)\n`;
    } else if (draftRemainingBalance < 0) {
      text += `🎉 *Saldo a favor del inquilino para el próximo recibo:* ${Math.abs(draftRemainingBalance).toFixed(2)} € (se descontará en la siguiente liquidación)\n`;
    } else {
      text += `✅ *Liquidación totalmente saldada al día.*\n`;
    }

    // Explanatory note about pending supplies not yet received / not included (exact user request in prompt 9)
    const pendingNotes: string[] = [];
    if (unincludedPendingWater.length > 0) {
      pendingNotes.push(`Agua (${unincludedPendingWater.map(w => w.periodRange || w.company).join(', ')})`);
    } else {
      pendingNotes.push(`Suministro de agua del bimestre en curso pendiente de emisión por la suministradora`);
    }
    if (unincludedPendingElec.length > 0) {
      pendingNotes.push(`Luz (${unincludedPendingElec.map(e => e.periodRange || e.company).join(', ')})`);
    }

    text += `\nℹ️ *Nota de suministros pendientes:* Queda pendiente de recibir/incorporar: ${pendingNotes.join(' y ')}, que se regularizará y cobrará en el siguiente recibo.\n`;

    setDraftExplanationNote(text);
  }, [
    draftIssueDate,
    draftReceiptNumber,
    tenant.name,
    draftItems,
    draftSubtotal,
    draftPreviousBalance,
    draftTotalAmount,
    currentAmountPaidNum,
    draftRemainingBalance,
    unincludedPendingWater,
    unincludedPendingElec,
    isNoteManuallyEdited
  ]);

  // Handler to toggle an item in the draft
  const toggleRentMonth = (ym: string) => {
    setSelectedRentMonths(prev => 
      prev.includes(ym) ? prev.filter(x => x !== ym) : [...prev, ym]
    );
  };

  const toggleWater = (id: string) => {
    setSelectedWaterIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleElectricity = (id: string) => {
    setSelectedElectricityIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleOther = (id: string) => {
    setSelectedOtherIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Quick action from Section 3 (Gastos y Suministros table) to add to draft and switch to billing
  const addSupplyToCurrentDraft = (type: 'WATER' | 'ELECTRICITY', id: string) => {
    if (type === 'WATER') {
      if (!selectedWaterIds.includes(id)) {
        setSelectedWaterIds(prev => [...prev, id]);
      }
    } else {
      if (!selectedElectricityIds.includes(id)) {
        setSelectedElectricityIds(prev => [...prev, id]);
      }
    }
    setActiveTab('billing');
    setBillingSubTab('4.1_builder');
  };

  // Save Receipt Handler
  const handleSaveReceipt = (asPaid: boolean) => {
    if (draftItems.length === 0 && draftPreviousBalance === 0) {
      alert('Por favor selecciona al menos un concepto o define un saldo para formar el recibo.');
      return;
    }

    const paidNum = draftAmountPaid === '' ? draftTotalAmount : parseFloat(draftAmountPaid) || 0;
    const remaining = Math.round((draftTotalAmount - paidNum) * 100) / 100;

    const newReceipt: ReceiptItem = {
      id: draftReceiptNumber || `REC-${Date.now()}`,
      receiptNumber: draftReceiptNumber,
      issueDate: draftIssueDate,
      title: draftTitle || 'Liquidación de Alquiler y Suministros',
      items: draftItems,
      previousBalance: draftPreviousBalance,
      subtotalItems: draftSubtotal,
      totalAmount: draftTotalAmount,
      amountPaid: asPaid ? paidNum : 0,
      remainingBalance: asPaid ? remaining : draftTotalAmount,
      explanationNote: draftExplanationNote,
      status: asPaid ? 'PAID' : 'PENDING',
      paidDate: asPaid ? todayStr : undefined
    };

    // Update receipts
    setReceipts([newReceipt, ...receipts]);

    if (asPaid) {
      // Mark all included supplies and expenses as PAID
      const waterIds = draftItems.filter(i => i.type === 'WATER').map(i => i.itemId);
      const elecIds = draftItems.filter(i => i.type === 'ELECTRICITY').map(i => i.itemId);
      const otherIds = draftItems.filter(i => i.type === 'OTHER').map(i => i.itemId);

      setWaterExpenses(waterExpenses.map(w => waterIds.includes(w.id) ? { ...w, status: 'PAID', receiptId: newReceipt.id } : w));
      setElectricityExpenses(electricityExpenses.map(e => elecIds.includes(e.id) ? { ...e, status: 'PAID', receiptId: newReceipt.id } : e));
      setOtherExpenses(otherExpenses.map(o => otherIds.includes(o.id) ? { ...o, status: 'PAID', receiptId: newReceipt.id } : o));

      // Store remaining balance for next receipt
      setTenantAccumulatedBalance(remaining);

      alert(`¡Recibo marcado como COBRADO!\n\nSe cobraron ${paidNum.toFixed(2)} €.\n${remaining > 0 ? `⚠️ Quedan ${remaining.toFixed(2)} € pendientes para el siguiente recibo.` : remaining < 0 ? `💰 Sobran ${Math.abs(remaining).toFixed(2)} € a favor del inquilino para el siguiente recibo.` : '✅ Saldo cubierto por completo.'}\n\nTodas las facturas y meses incluidos han pasado a estado PAGADO (verde).`);
    } else {
      alert(`¡Recibo guardado como PENDIENTE!\nPuedes revisarlo en el apartado 4.2 y marcarlo como cobrado cuando el inquilino efectúe el pago.`);
    }

    // Reset draft builder
    setSelectedRentMonths([]);
    setSelectedWaterIds([]);
    setSelectedElectricityIds([]);
    setSelectedOtherIds([]);
    setDraftAmountPaid('');
    setIsNoteManuallyEdited(false);
    setDraftReceiptNumber(`REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`);

    // Navigate to 4.2 receipts list
    setBillingSubTab('4.2_receipts');
  };

  // Mark an existing pending receipt as PAID
  const handleMarkExistingReceiptPaid = (receiptId: string, realPaidInput?: number) => {
    const target = receipts.find(r => r.id === receiptId);
    if (!target) return;

    const paidVal = realPaidInput !== undefined ? realPaidInput : target.totalAmount;
    const remaining = Math.round((target.totalAmount - paidVal) * 100) / 100;

    const updated = receipts.map(r => {
      if (r.id === receiptId) {
        return {
          ...r,
          status: 'PAID' as const,
          paidDate: todayStr,
          amountPaid: paidVal,
          remainingBalance: remaining
        };
      }
      return r;
    });

    setReceipts(updated);

    // Mark supplies as paid
    const waterIds = target.items.filter(i => i.type === 'WATER').map(i => i.itemId);
    const elecIds = target.items.filter(i => i.type === 'ELECTRICITY').map(i => i.itemId);
    const otherIds = target.items.filter(i => i.type === 'OTHER').map(i => i.itemId);

    setWaterExpenses(waterExpenses.map(w => waterIds.includes(w.id) ? { ...w, status: 'PAID', receiptId: target.id } : w));
    setElectricityExpenses(electricityExpenses.map(e => elecIds.includes(e.id) ? { ...e, status: 'PAID', receiptId: target.id } : e));
    setOtherExpenses(otherExpenses.map(o => otherIds.includes(o.id) ? { ...o, status: 'PAID', receiptId: target.id } : o));

    setTenantAccumulatedBalance(remaining);

    alert(`¡Recibo ${target.receiptNumber} marcado como COBRADO!\n\nImporte pagado: ${paidVal.toFixed(2)} €\nSaldo para próxima liquidación: ${remaining > 0 ? `+${remaining.toFixed(2)} € (deuda)` : remaining < 0 ? `${remaining.toFixed(2)} € (a favor)` : '0.00 € (liquidado)'}`);
  };

  // Delete Receipt and liberate items back to pending
  const handleDeleteReceipt = (receiptId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este recibo? Los meses y facturas volverán a quedar pendientes para una nueva liquidación.')) return;
    
    const target = receipts.find(r => r.id === receiptId);
    if (target) {
      const waterIds = target.items.filter(i => i.type === 'WATER').map(i => i.itemId);
      const elecIds = target.items.filter(i => i.type === 'ELECTRICITY').map(i => i.itemId);
      const otherIds = target.items.filter(i => i.type === 'OTHER').map(i => i.itemId);

      setWaterExpenses(waterExpenses.map(w => waterIds.includes(w.id) ? { ...w, status: 'PENDING', receiptId: undefined } : w));
      setElectricityExpenses(electricityExpenses.map(e => elecIds.includes(e.id) ? { ...e, status: 'PENDING', receiptId: undefined } : e));
      setOtherExpenses(otherExpenses.map(o => otherIds.includes(o.id) ? { ...o, status: 'PENDING', receiptId: undefined } : o));
    }

    setReceipts(receipts.filter(r => r.id !== receiptId));
    if (selectedReceiptForModal?.id === receiptId) {
      setSelectedReceiptForModal(null);
    }
  };

  // Helper to load sample PDFs directly into memory
  const handleLoadSamplePdf = async (type: 'ELECTRICITY' | 'WATER') => {
    try {
      setIsScanning(true);
      const samplePath = type === 'ELECTRICITY'
        ? '/assets/aistudio/factura_24_sep_-_24_oct_0000061093604335_78f75ad9.pdf'
        : '/assets/aistudio/facturas_b33a4307.pdf';
      const sampleName = type === 'ELECTRICITY'
        ? 'Factura_Repsol_Luz_Oficial.pdf'
        : 'Factura_EMUASA_Agua_Oficial.pdf';

      const response = await fetch(samplePath);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setUploadedPdfBase64(base64);
        setUploadedPdfInfo({
          name: sampleName,
          size: blob.size,
          type: 'application/pdf'
        });
        setIsScanning(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Error loading sample pdf:', err);
      setIsScanning(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setUploadedPdfBase64(base64);
      setUploadedPdfInfo({
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      });
    };
    reader.readAsDataURL(file);
  };

  // AI OCR Bill Parsing with Deep Energy & Municipal Water Audit
  const handleScanBill = async (type: 'WATER' | 'ELECTRICITY') => {
    if (!rawAiInput && !uploadedPdfBase64) {
      alert('Por favor, selecciona o arrastra el archivo PDF de la factura, o pulsa en una de las facturas de muestra.');
      return;
    }

    setIsScanning(true);
    try {
      const endpoint = type === 'WATER' ? '/api/ai/parse-water' : '/api/ai/parse-electricity';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawAiInput,
          fileBase64: uploadedPdfBase64,
          mimeType: uploadedPdfInfo?.type || 'application/pdf',
          fileName: uploadedPdfInfo?.name || (type === 'WATER' ? 'factura_agua.pdf' : 'factura_luz.pdf')
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la factura con IA');

      if (type === 'WATER') {
        const splitPct = supplyRules.water / 100;
        const total = Number(data.totalAmount) || 0;
        const tenantShare = Math.round(total * splitPct * 100) / 100;
        const wasteTax = data.breakdown?.wasteCollection || data.municipalTaxes?.wasteTax || 0;
        const canon = data.breakdown?.sanitationCanon || ((data.municipalTaxes?.sanitationFixed || 0) + (data.municipalTaxes?.sanitationVariable || 0)) || 0;

        const alerts: string[] = [];
        if (data.alarm?.alerts && Array.isArray(data.alarm.alerts)) {
          alerts.push(...data.alarm.alerts);
        }
        if (total > 0 && (wasteTax + canon) > 0) {
          const taxPct = Math.round(((wasteTax + canon) / total) * 1000) / 10;
          if (taxPct >= 30) {
            alerts.unshift(`ℹ️ IMPACTO FISCAL ELEVADO: Las tasas municipales y autonómicas (Basura ${wasteTax.toFixed(2)}€ + Saneamiento ${canon.toFixed(2)}€) suponen el ${taxPct}% del total de la factura.`);
          }
        }

        const newWater: WaterExpense = {
          id: 'w_' + Date.now(),
          utilityType: 'WATER',
          company: data.company || 'EMUASA Aguas de Murcia',
          invoiceNumber: data.invoiceNumber || 'S/N',
          contractNumber: data.contractNumber,
          chargeDate: data.chargeDate || new Date().toLocaleDateString('es-ES'),
          receptionDate: data.receptionDate || new Date().toISOString().split('T')[0],
          periodStartDate: data.periodStartDate || '',
          periodEndDate: data.periodEndDate || '',
          periodRange: data.periodRange || 'Periodo reciente',
          billingDays: Number(data.billingDays) || 60,
          costPerDay: Number(data.costPerDay) || (total / 60),
          totalAmount: tenantShare,
          fullInvoiceTotal: total,
          m3Consumed: Number(data.m3Consumed) || 0,
          unitPrice: Number(data.unitPrice) || 1.48,
          contractedPower: data.contractedPower || 'Contador 15mm',
          breakdown: data.breakdown || {
            waterService: 0,
            waterConsumption: 0,
            meterConservation: 0,
            sewerage: 0,
            wasteCollection: wasteTax,
            sanitationCanon: canon,
            taxes: 0
          },
          waterTiers: data.waterTiers,
          municipalTaxes: data.municipalTaxes,
          alarm: {
            hasAlarm: alerts.length > 0,
            reason: alerts[0] || '',
            alerts: alerts
          },
          notes: `${data.notes || ''} (Factura total: ${total.toFixed(2)}€, aplicado ${supplyRules.water}%)`,
          status: 'PENDING'
        };

        setWaterExpenses([newWater, ...waterExpenses]);
        setAuditedBillPreview({
          expense: newWater,
          type: 'WATER',
          alerts: alerts
        });
      } else {
        const splitPct = supplyRules.electricity / 100;
        const total = Number(data.totalAmount) || 0;
        const tenantShare = Math.round(total * splitPct * 100) / 100;
        const currentKwhPrice = Number(data.unitPrice) || 0;

        // Compare against most recent bill
        const prevElec = electricityExpenses[0];
        let priceDiffPct: number | undefined;
        let prevUnitPrice: number | undefined;
        const alerts: string[] = [];

        if (data.alarm?.alerts && Array.isArray(data.alarm.alerts)) {
          alerts.push(...data.alarm.alerts);
        }

        if (prevElec && prevElec.unitPrice && currentKwhPrice > 0) {
          prevUnitPrice = prevElec.unitPrice;
          const diff = ((currentKwhPrice - prevElec.unitPrice) / prevElec.unitPrice) * 100;
          priceDiffPct = Math.round(diff * 10) / 10;

          if (priceDiffPct > 2) {
            alerts.unshift(`⚠️ SUBIDA DE TARIFA DETECTADA: El precio por kWh sube de ${prevElec.unitPrice.toFixed(5)} € a ${currentKwhPrice.toFixed(5)} € (+${priceDiffPct}%).`);
          } else if (priceDiffPct < -2) {
            alerts.unshift(`📉 BAJADA DE PRECIO: Ahorro de ${Math.abs(priceDiffPct)}% en el precio de kWh (pasa de ${prevElec.unitPrice.toFixed(5)} € a ${currentKwhPrice.toFixed(5)} €).`);
          }
        }

        const extraCost = Number(data.extraServicesCost) || 0;
        const extraName = data.extraServicesName || 'Servicio accesorio no esencial';
        if (extraCost > 0) {
          alerts.unshift(`🚨 COBRO NO ESENCIAL DETECTADO: Se cobran ${extraCost.toFixed(2)} € por "${extraName}". Este seguro o servicio de asistencia suele ser prescindible.`);
        }

        const newElec: ElectricityExpense = {
          id: 'e_' + Date.now(),
          utilityType: 'ELECTRICITY',
          company: data.company || 'Repsol Comercializadora',
          invoiceNumber: data.invoiceNumber || 'S/N',
          contractNumber: data.contractNumber,
          cups: data.cups,
          chargeDate: data.chargeDate || new Date().toLocaleDateString('es-ES'),
          receptionDate: data.receptionDate || new Date().toISOString().split('T')[0],
          periodStartDate: data.periodStartDate || '',
          periodEndDate: data.periodEndDate || '',
          periodRange: data.periodRange || 'Periodo reciente',
          billingDays: Number(data.billingDays) || 30,
          costPerDay: Number(data.costPerDay) || (total / 30),
          totalAmount: tenantShare,
          fullInvoiceTotal: total,
          kwhConsumed: Number(data.kwhConsumed) || 0,
          unitPrice: currentKwhPrice,
          prevUnitPrice: prevUnitPrice,
          priceVariationPct: priceDiffPct,
          contractedPower: data.contractedPower || '6,900 kW',
          topGas: data.topGas || 'No',
          fixedTermCost: Number(data.fixedTermCost) || 0,
          energyCost: Number(data.energyCost) || 0,
          extraServicesCost: extraCost,
          extraServicesName: extraName,
          meterRent: Number(data.meterRent) || 0,
          bonoSocial: Number(data.bonoSocial) || 0,
          taxesCost: Number(data.taxesCost) || 0,
          hourlyTiers: data.hourlyTiers,
          alarm: {
            hasAlarm: alerts.length > 0,
            reason: alerts[0] || '',
            alerts: alerts
          },
          notes: `${data.notes || ''} (Factura total: ${total.toFixed(2)}€, aplicado ${supplyRules.electricity}%)`,
          status: 'PENDING'
        };

        setElectricityExpenses([newElec, ...electricityExpenses]);
        setAuditedBillPreview({
          expense: newElec,
          type: 'ELECTRICITY',
          priceDiffPct: priceDiffPct,
          prevUnitPrice: prevUnitPrice,
          alerts: alerts,
          extraServiceWarning: extraCost > 0 ? `${extraCost.toFixed(2)} € por ${extraName}` : undefined
        });
      }

      setAiModalType(null);
      setRawAiInput('');
      setUploadedPdfBase64(null);
      setUploadedPdfInfo(null);
    } catch (err: any) {
      alert('Error en IA: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // CSV Import handler
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) {
          alert('El archivo CSV está vacío.');
          return;
        }

        const newWaterList: WaterExpense[] = [...waterExpenses];
        const newElecList: ElectricityExpense[] = [...electricityExpenses];
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 6) {
            const id = cols[0];
            const utilityType = cols[2];
            const receptionDate = cols[3];
            const rawAmount = parseFloat(cols[4]) || 0;
            const estado = cols[5];

            if (utilityType === 'WATER') {
              const splitPct = supplyRules.water / 100;
              const totalAmount = Math.round(rawAmount * splitPct * 100) / 100;
              if (!newWaterList.some(w => w.id === id || w.invoiceNumber === id)) {
                newWaterList.unshift({
                  id: id || ('w_' + Math.random()),
                  utilityType: 'WATER',
                  company: 'Suministro Agua (CSV)',
                  invoiceNumber: id,
                  chargeDate: receptionDate,
                  receptionDate: receptionDate,
                  periodStartDate: receptionDate,
                  periodEndDate: receptionDate,
                  periodRange: `${receptionDate} (CSV)`,
                  totalAmount,
                  fullInvoiceTotal: rawAmount,
                  m3Consumed: 15,
                  unitPrice: 1.5,
                  contractedPower: 'Contador Estándar',
                  breakdown: {
                    waterService: totalAmount * 0.3,
                    waterConsumption: totalAmount * 0.4,
                    meterConservation: 1.0,
                    sewerage: totalAmount * 0.1,
                    wasteCollection: totalAmount * 0.1,
                    sanitationCanon: totalAmount * 0.05,
                    taxes: totalAmount * 0.05
                  },
                  alarm: { hasAlarm: false, reason: '' },
                  notes: `CSV (${rawAmount}€, Inq. ${supplyRules.water}%)`,
                  status: estado === 'PAID' || estado === 'INCLUDED_IN_INVOICE' ? 'PAID' : 'PENDING'
                });
                importedCount++;
              }
            } else if (utilityType === 'ELECTRICITY') {
              const splitPct = supplyRules.electricity / 100;
              const totalAmount = Math.round(rawAmount * splitPct * 100) / 100;
              if (!newElecList.some(e => e.id === id || e.invoiceNumber === id)) {
                newElecList.unshift({
                  id: id || ('e_' + Math.random()),
                  utilityType: 'ELECTRICITY',
                  company: 'Comercializadora Luz (CSV)',
                  invoiceNumber: id,
                  chargeDate: receptionDate,
                  receptionDate: receptionDate,
                  periodStartDate: receptionDate,
                  periodEndDate: receptionDate,
                  periodRange: `${receptionDate} (CSV)`,
                  totalAmount,
                  fullInvoiceTotal: rawAmount,
                  kwhConsumed: 250,
                  unitPrice: 0.15,
                  contractedPower: '4,600 kW',
                  topGas: 'No',
                  alarm: { hasAlarm: false, reason: '' },
                  notes: `CSV (${rawAmount}€, Inq. ${supplyRules.electricity}%)`,
                  status: estado === 'PAID' || estado === 'INCLUDED_IN_INVOICE' ? 'PAID' : 'PENDING'
                });
                importedCount++;
              }
            }
          }
        }

        setWaterExpenses(newWaterList);
        setElectricityExpenses(newElecList);
        alert(`¡Copia importada! ${importedCount} facturas incorporadas con reglas de reparto.`);
        setActiveTab('expenses');
      } catch (err: any) {
        alert('Error al procesar CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Full JSON Backup Export
  const handleExportJson = () => {
    const data = {
      tenant,
      advances,
      rentRates,
      supplyRules,
      waterExpenses,
      electricityExpenses,
      otherExpenses,
      receipts,
      tenantAccumulatedBalance,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquilinopro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full JSON Backup Import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.tenant) setTenant(parsed.tenant);
        if (parsed.advances) setAdvances(parsed.advances);
        if (parsed.rentRates) setRentRates(parsed.rentRates);
        if (parsed.supplyRules) setSupplyRules(parsed.supplyRules);
        if (parsed.waterExpenses) setWaterExpenses(parsed.waterExpenses);
        if (parsed.electricityExpenses) setElectricityExpenses(parsed.electricityExpenses);
        if (parsed.otherExpenses) setOtherExpenses(parsed.otherExpenses);
        if (parsed.receipts) setReceipts(parsed.receipts);
        if (typeof parsed.tenantAccumulatedBalance === 'number') setTenantAccumulatedBalance(parsed.tenantAccumulatedBalance);
        alert('¡Copia de seguridad JSON restaurada con éxito!');
      } catch (err: any) {
        alert('Error al importar archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Rent Rate update handler
  const [newRentAmount, setNewRentAmount] = useState('');
  const [newRentDate, setNewRentDate] = useState(todayStr);
  const [newRentReason, setNewRentReason] = useState('Actualización IPC');

  const handleAddRentRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRentAmount || !newRentDate) return;
    const newRate: RentRate = {
      id: 'r_' + Date.now(),
      amount: parseFloat(newRentAmount),
      startDate: newRentDate,
      modificationDate: todayStr,
      reason: newRentReason || 'Actualización de renta base'
    };
    setRentRates([newRate, ...rentRates]);
    setNewRentAmount('');
    setNewRentReason('Actualización IPC');
    alert('¡Renta base actualizada! Se aplicará automáticamente a todos los meses a partir de la fecha indicada.');
  };

  // Add Other Expense
  const [newOtherName, setNewOtherName] = useState('');
  const [newOtherCost, setNewOtherCost] = useState('');
  const [newOtherDate, setNewOtherDate] = useState(todayStr);
  const [newOtherNotes, setNewOtherNotes] = useState('');

  const handleAddOtherExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOtherName || !newOtherCost) return;
    const newItem: OtherExpense = {
      id: 'o_' + Date.now(),
      name: newOtherName,
      cost: parseFloat(newOtherCost),
      date: newOtherDate,
      notes: newOtherNotes,
      status: 'PENDING'
    };
    setOtherExpenses([newItem, ...otherExpenses]);
    setNewOtherName('');
    setNewOtherCost('');
    setNewOtherNotes('');
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccessToast(true);
    setTimeout(() => setCopySuccessToast(false), 3000);
  };

  // Master Supplies List with Filter
  const allSupplies = useMemo(() => {
    const list = [
      ...waterExpenses.map(w => ({
        ...w,
        type: 'Agua' as const,
        icon: Droplet,
        pct: supplyRules.water,
        fullCost: w.fullInvoiceTotal || (w.totalAmount / (supplyRules.water / 100 || 1))
      })),
      ...electricityExpenses.map(e => ({
        ...e,
        type: 'Luz' as const,
        icon: Zap,
        pct: supplyRules.electricity,
        fullCost: e.fullInvoiceTotal || (e.totalAmount / (supplyRules.electricity / 100 || 1))
      }))
    ].sort((a, b) => (b.chargeDate || b.receptionDate).localeCompare(a.chargeDate || a.receptionDate));

    if (filterExpenseStatus === 'PENDING') return list.filter(s => s.status === 'PENDING');
    if (filterExpenseStatus === 'PAID') return list.filter(s => s.status === 'PAID');
    return list;
  }, [waterExpenses, electricityExpenses, supplyRules, filterExpenseStatus]);

  // Interface for monthly financial calculation
  interface MonthlyFinancialRow {
    key: string;
    monthName: string;
    year: number;
    tenantName: string;
    rent: number;
    elecCost: number;
    waterCost: number;
    gasCost: number;
    fixedCost: number;
    totalIngreso: number;
    totalGasto: number;
    beneficioNeto: number;
    status: 'PAID' | 'PENDING';
  }

  const getMonthlyDataForYear = (yearFilter: number | 'ALL'): MonthlyFinancialRow[] => {
    const months: MonthlyFinancialRow[] = [];
    const yearList = yearFilter === 'ALL' ? [2026, 2025, 2024, 2023, 2022, 2021] : [yearFilter];
    const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    yearList.forEach(yr => {
      // 12 months for each year in reverse order (Diciembre down to Enero)
      for (let m = 12; m >= 1; m--) {
        const monthStr = String(m).padStart(2, '0');
        const key = `${yr}-${monthStr}`;
        const name = `${monthNamesEs[m - 1]} ${yr}`;

        const customMatch = customHistoricalEntries.find(c => c.monthKey === key);

        if (customMatch) {
          const totalIng = customMatch.rentAmount;
          const totalGas = customMatch.elecCost + customMatch.waterCost + customMatch.gasCost + customMatch.repairsCost;
          months.push({
            key,
            monthName: name,
            year: yr,
            tenantName: customMatch.tenantName || tenant.name,
            rent: customMatch.rentAmount,
            elecCost: customMatch.elecCost,
            waterCost: customMatch.waterCost,
            gasCost: customMatch.gasCost,
            fixedCost: customMatch.repairsCost,
            totalIngreso: totalIng,
            totalGasto: totalGas,
            beneficioNeto: totalIng - totalGas,
            status: customMatch.status
          });
        } else if (yr === 2026) {
          const rent = getCurrentRentForMonth(key);
          const waterMatch = waterExpenses.find(w => w.chargeDate.startsWith(key) || w.receptionDate.startsWith(key) || w.periodRange.includes(key));
          const elecMatch = electricityExpenses.find(e => e.chargeDate.startsWith(key) || e.receptionDate.startsWith(key) || e.periodRange.includes(key));
          
          const waterCost = waterMatch ? waterMatch.totalAmount : 0;
          const elecCost = elecMatch ? elecMatch.totalAmount : 0;
          const fixedCost = 0;
          const gasCost = 0;

          const totalIngreso = rent;
          const totalGasto = elecCost + waterCost + fixedCost + gasCost;
          const beneficioNeto = totalIngreso - totalGasto;
          const isPaid = (waterMatch ? waterMatch.status === 'PAID' : true) && (elecMatch ? elecMatch.status === 'PAID' : true);

          months.push({
            key,
            monthName: name,
            year: yr,
            tenantName: tenant.name,
            rent,
            elecCost,
            waterCost,
            gasCost,
            fixedCost,
            totalIngreso,
            totalGasto,
            beneficioNeto,
            status: isPaid ? 'PAID' : 'PENDING'
          });
        } else {
          // Default estimate for past years if not explicitly loaded
          const defaultRent = yr >= 2021 ? 250 : 200;
          const estElec = m % 3 === 0 ? 70 : 60;
          const estWater = m % 2 === 1 ? 39.05 : 0;
          const estGas = 0;
          const estFixed = 0;
          const totalIng = defaultRent;
          const totalGas = estElec + estWater + estGas + estFixed;

          months.push({
            key,
            monthName: name,
            year: yr,
            tenantName: tenant.name,
            rent: defaultRent,
            elecCost: estElec,
            waterCost: estWater,
            gasCost: estGas,
            fixedCost: estFixed,
            totalIngreso: totalIng,
            totalGasto: totalGas,
            beneficioNeto: totalIng - totalGas,
            status: 'PAID'
          });
        }
      }
    });

    return months;
  };

  // 2026 Breakdown Months (latest/newest month at the top)
  const months2026 = [
    { name: 'Diciembre 2026', key: '2026-12' },
    { name: 'Noviembre 2026', key: '2026-11' },
    { name: 'Octubre 2026', key: '2026-10' },
    { name: 'Septiembre 2026', key: '2026-09' },
    { name: 'Agosto 2026', key: '2026-08' },
    { name: 'Julio 2026', key: '2026-07' },
    { name: 'Junio 2026', key: '2026-06' },
    { name: 'Mayo 2026', key: '2026-05' },
    { name: 'Abril 2026', key: '2026-04' },
    { name: 'Marzo 2026', key: '2026-03' },
    { name: 'Febrero 2026', key: '2026-02' },
    { name: 'Enero 2026', key: '2026-01' },
  ];

  // Statistics calculation
  const stats = useMemo(() => {
    const totalRentCollected = receipts
      .filter(r => r.status === 'PAID')
      .reduce((sum, r) => sum + r.items.filter(i => i.type === 'RENT').reduce((s, i) => s + i.amount, 0), 0);

    const totalSuppliesCollected = receipts
      .filter(r => r.status === 'PAID')
      .reduce((sum, r) => sum + r.items.filter(i => i.type === 'WATER' || i.type === 'ELECTRICITY').reduce((s, i) => s + i.amount, 0), 0);

    const pendingWaterAmount = waterExpenses.filter(w => w.status === 'PENDING').reduce((s, w) => s + w.totalAmount, 0);
    const pendingElecAmount = electricityExpenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.totalAmount, 0);

    const paidWaterAmount = waterExpenses.filter(w => w.status === 'PAID').reduce((s, w) => s + w.totalAmount, 0);
    const paidElecAmount = electricityExpenses.filter(e => e.status === 'PAID').reduce((s, e) => s + e.totalAmount, 0);

    return {
      totalRentCollected,
      totalSuppliesCollected,
      pendingWaterAmount,
      pendingElecAmount,
      paidWaterAmount,
      paidElecAmount,
      totalPendingSupplies: pendingWaterAmount + pendingElecAmount,
      totalReceiptsCount: receipts.length,
      paidReceiptsCount: receipts.filter(r => r.status === 'PAID').length,
      pendingReceiptsCount: receipts.filter(r => r.status === 'PENDING').length
    };
  }, [receipts, waterExpenses, electricityExpenses]);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-fuchsia-500 selection:text-white relative overflow-x-hidden">
      {/* Toast Notification */}
      {copySuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border-2 border-white/40">
          <Check className="w-5 h-5 stroke-[3]" />
          <span>¡Texto para WhatsApp copiado al portapapeles!</span>
        </div>
      )}

      {/* Modern Background Image with Vibrant Gradient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay" style={{ backgroundImage: `url(${modernBgImg})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-indigo-950/90"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Top Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <DollarSign className="w-6 h-6 text-white drop-shadow" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              InquilinoPro <span className="text-[11px] font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 shadow-inner">Edición Cuentas Claras</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium">Inquilino activo: <span className="text-white font-bold">{tenant.name}</span></p>
          </div>
        </div>

        {/* Current Tenant Balance Status Badge */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Saldo Arrastrado</span>
            <span className={`text-sm font-mono font-black ${
              tenantAccumulatedBalance > 0 ? 'text-amber-400' : tenantAccumulatedBalance < 0 ? 'text-cyan-400' : 'text-emerald-400'
            }`}>
              {tenantAccumulatedBalance > 0 ? `+${tenantAccumulatedBalance.toFixed(2)} € (Deuda)` : tenantAccumulatedBalance < 0 ? `${tenantAccumulatedBalance.toFixed(2)} € (A favor)` : '0.00 € (Al día)'}
            </span>
          </div>
          <button
            onClick={() => {
              const val = prompt('Ajustar manualmente el saldo arrastrado del inquilino (€):', tenantAccumulatedBalance.toString());
              if (val !== null && !isNaN(parseFloat(val))) {
                setTenantAccumulatedBalance(parseFloat(val));
              }
            }}
            title="Ajustar saldo manual"
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 py-2.5 flex items-center gap-2 overflow-x-auto relative z-30">
        <button
          onClick={() => setActiveTab('tenant')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'tenant' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" /> 1. Inquilino & Reglas
        </button>

        <button
          onClick={() => setActiveTab('months')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'months' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" /> 2. Meses & Rentas
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap relative ${
            activeTab === 'expenses' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" /> 3. Gastos y Suministros
          {waterExpenses.filter(w => w.status === 'PENDING').length + electricityExpenses.filter(e => e.status === 'PENDING').length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap relative ${
            activeTab === 'billing' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30' : 'text-cyan-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" /> 4. Liquidaciones y Recibos
          {receipts.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              {receipts.filter(r => r.status === 'PENDING').length} pend.
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('desglose')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'desglose' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Table className="w-4 h-4" /> 4.5 Desglose 2026
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'backup' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" /> 5. Copias & CSV
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap border ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/30 border-cyan-400/50'
              : 'text-cyan-300 hover:text-white hover:bg-white/5 border-cyan-500/20'
          }`}
        >
          <PieChart className="w-4 h-4 text-cyan-400 animate-pulse" /> 6. Analítica Avanzada & Comparativa
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-10">

        {/* TAB 1: INQUILINO, HISTÓRICO DE RENTAS Y REGLAS DE REPARTO */}
        {activeTab === 'tenant' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="w-3 h-8 bg-gradient-to-b from-fuchsia-500 to-indigo-500 rounded-full"></span>
                Ficha del Inquilino y Condiciones del Contrato
              </h2>
              <p className="text-sm text-slate-300 font-medium">Gestión de datos del arrendatario, contactos de emergencia, fianza y reglas de reparto.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tenant Personal & Family Info */}
              <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                    <User className="w-5 h-5 text-fuchsia-400" /> 1. Datos del Inquilino
                  </h3>
                </div>

                <div className="space-y-4 text-sm font-medium">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={tenant.name}
                      onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                      className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">DNI / NIE</label>
                    <input
                      type="text"
                      value={tenant.dni}
                      onChange={(e) => setTenant({ ...tenant, dni: e.target.value })}
                      className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Teléfono Inquilino</label>
                    <input
                      type="text"
                      value={tenant.phone}
                      onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
                      className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <span className="text-xs font-black text-fuchsia-300 uppercase tracking-wider block">Contacto Familiar de Emergencia</span>
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Nombre Familiar y Parentesco</label>
                      <input
                        type="text"
                        value={tenant.familyName}
                        onChange={(e) => setTenant({ ...tenant, familyName: e.target.value })}
                        className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Teléfono Familiar</label>
                      <input
                        type="text"
                        value={tenant.familyPhone}
                        onChange={(e) => setTenant({ ...tenant, familyPhone: e.target.value })}
                        className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.1 Anticipos */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <h4 className="text-sm font-extrabold text-white flex items-center justify-between">
                    <span>1.1 Cuotas de Adelantos / Fianza</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">{advances.reduce((acc, a) => acc + a.cost, 0)} €</span>
                  </h4>
                  {advances.map(a => (
                    <div key={a.id} className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{a.description}</p>
                        <p className="text-slate-400 text-[11px]">{a.count} cuotas • Fecha: {a.date}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{a.cost} €</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1.2 Histórico de Rentas y Actualizaciones */}
              <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-indigo-400" /> HISTÓRICO DE RENTAS
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">{rentRates.length} precios</span>
                </div>

                <div className="space-y-3">
                  {[...rentRates].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((r, idx) => (
                    <div key={r.id} className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Desde: {r.startDate}</span>
                          {idx === 0 && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30">VIGENTE</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{r.reason}</span>
                      </div>
                      <span className="text-base font-mono font-black text-white">{r.amount.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddRentRate} className="pt-4 border-t border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">ACTUALIZAR RENTA BASE</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Precio (€)"
                      value={newRentAmount}
                      onChange={(e) => setNewRentAmount(e.target.value)}
                      className="bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="date"
                      value={newRentDate}
                      onChange={(e) => setNewRentDate(e.target.value)}
                      className="bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                  >
                    ACTUALIZAR E IMPACTAR RECIBOS
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">Actualiza automáticamente la mensualidad de todos los recibos desde la fecha indicada.</p>
                </form>
              </div>

              {/* Reglas de Reparto de Suministros (Luz, Agua, Gas, Internet) */}
              <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                    <Percent className="w-5 h-5 text-emerald-400" /> REGLAS DE REPARTO
                  </h3>
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">Suministros</span>
                </div>

                <div className="space-y-4">
                  {/* Luz */}
                  <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Luz</span>
                      <span className="font-mono text-slate-300">Inquilino: <strong className="text-indigo-400">{supplyRules.electricity}%</strong> | Prop: {100 - supplyRules.electricity}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setSupplyRules({ ...supplyRules, electricity: pct })}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                            supplyRules.electricity === pct ? 'bg-indigo-600 text-white shadow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Agua */}
                  <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5" /> Agua</span>
                      <span className="font-mono text-slate-300">Inquilino: <strong className="text-indigo-400">{supplyRules.water}%</strong> | Prop: {100 - supplyRules.water}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setSupplyRules({ ...supplyRules, water: pct })}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                            supplyRules.water === pct ? 'bg-indigo-600 text-white shadow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gas */}
                  <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Gas</span>
                      <span className="font-mono text-slate-300">Inquilino: <strong className="text-indigo-400">{supplyRules.gas}%</strong> | Prop: {100 - supplyRules.gas}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setSupplyRules({ ...supplyRules, gas: pct })}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                            supplyRules.gas === pct ? 'bg-indigo-600 text-white shadow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Internet */}
                  <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-300 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Internet</span>
                      <span className="font-mono text-slate-300">Inquilino: <strong className="text-indigo-400">{supplyRules.internet}%</strong> | Prop: {100 - supplyRules.internet}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setSupplyRules({ ...supplyRules, internet: pct })}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                            supplyRules.internet === pct ? 'bg-indigo-600 text-white shadow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LISTADO DE MESES */}
        {activeTab === 'months' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="w-3 h-8 bg-gradient-to-b from-indigo-500 to-cyan-500 rounded-full"></span>
                2. Listado de Meses y Cuotas del Alquiler
              </h2>
              <p className="text-sm text-slate-300 font-medium">Histórico mensual de rentas con su importe y estado de cobro.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {monthsList.map(m => {
                const isPaid = m.status === 'PAID';
                return (
                  <div key={m.id} className="bg-slate-900/80 backdrop-blur-xl border border-white/15 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-slate-400">{m.monthYear}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                        isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        {isPaid ? 'COBRADO' : 'PENDIENTE'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-white">{m.monthName}</h4>
                      <p className="text-2xl font-mono font-black text-emerald-400 mt-1">{m.rentAmount.toFixed(2)} €</p>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      {isPaid ? (
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Liquidado en recibo
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (!selectedRentMonths.includes(m.monthYear)) {
                              setSelectedRentMonths([...selectedRentMonths, m.monthYear]);
                            }
                            setActiveTab('billing');
                            setBillingSubTab('4.1_builder');
                          }}
                          className="w-full py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 text-white text-xs font-black rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Incluir en Recibo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GASTOS Y SUMINISTROS (Con checklist Verde/Amarillo según Prompt 8 y botón para añadir a recibo) */}
        {activeTab === 'expenses' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header with Title, IA Buttons and Subtabs */}
            <div className="space-y-4 border-b border-white/10 pb-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    <span className="w-3 h-8 bg-gradient-to-b from-amber-500 to-cyan-500 rounded-full"></span>
                    3. Gastos y Auditoría de Suministros
                  </h2>
                  <p className="text-sm text-slate-300 font-medium">
                    Control de cobros al inquilino, detección de subidas/bajadas de tarifa (€/kWh y €/m³), servicios no esenciales y tasas municipales.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAiModalType('WATER')}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-200" /> Digitalizar Agua (IA)
                  </button>
                  <button
                    onClick={() => setAiModalType('ELECTRICITY')}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" /> Digitalizar Luz (IA)
                  </button>
                </div>
              </div>

              {/* Subtab Navigator */}
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 overflow-x-auto shadow-inner">
                <button
                  onClick={() => setExpensesSubTab('summary')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    expensesSubTab === 'summary'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Table className="w-4 h-4" /> 3.1 Resumen Maestro
                </button>
                <button
                  onClick={() => setExpensesSubTab('audit_elec')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    expensesSubTab === 'audit_elec'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300" /> 3.2 Auditoría Exhaustiva de Luz (Repsol)
                  {electricityExpenses.some(e => e.alarm?.hasAlarm) && (
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                  )}
                </button>
                <button
                  onClick={() => setExpensesSubTab('audit_water')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    expensesSubTab === 'audit_water'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Droplet className="w-4 h-4 text-cyan-300" /> 3.3 Auditoría Exhaustiva de Agua (EMUASA)
                  {waterExpenses.some(w => w.alarm?.hasAlarm) && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </button>
                <button
                  onClick={() => setExpensesSubTab('other')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    expensesSubTab === 'other'
                      ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-slate-300" /> 3.4 Otros Gastos & Averías ({otherExpenses.length})
                </button>
              </div>
            </div>

            {/* SUBTAB 1: RESUMEN MAESTRO */}
            {expensesSubTab === 'summary' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Filter Pills and Total summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/15 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filtrar:</span>
                    <button
                      onClick={() => setFilterExpenseStatus('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterExpenseStatus === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      Todos ({allSupplies.length})
                    </button>
                    <button
                      onClick={() => setFilterExpenseStatus('PENDING')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        filterExpenseStatus === 'PENDING' ? 'bg-amber-600 text-white shadow' : 'bg-white/5 text-amber-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span> Pendientes ({allSupplies.filter(s => s.status === 'PENDING').length})
                    </button>
                    <button
                      onClick={() => setFilterExpenseStatus('PAID')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        filterExpenseStatus === 'PAID' ? 'bg-emerald-600 text-white shadow' : 'bg-white/5 text-emerald-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Cobrados ({allSupplies.filter(s => s.status === 'PAID').length})
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total a cargo del inquilino: </span>
                    <span className="text-base font-mono font-black text-emerald-400">
                      {allSupplies.reduce((acc, s) => acc + s.totalAmount, 0).toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* MASTER SUMMARY TABLE (LATEST ON TOP) */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/15 text-xs font-extrabold text-cyan-300 uppercase tracking-wider bg-slate-950/70">
                          <th className="py-4 px-6">Tipo</th>
                          <th className="py-4 px-6">Periodo Facturado</th>
                          <th className="py-4 px-6">Fecha de Cobro</th>
                          <th className="py-4 px-6">Total Factura</th>
                          <th className="py-4 px-6">% Inq.</th>
                          <th className="py-4 px-6">A Cobrar Inq.</th>
                          <th className="py-4 px-6">Estado</th>
                          <th className="py-4 px-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-sm font-medium">
                        {allSupplies.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                              No hay facturas registradas en este filtro.
                            </td>
                          </tr>
                        ) : (
                          allSupplies.map((s) => {
                            const IconComp = s.icon;
                            const isPaid = s.status === 'PAID';
                            const propCost = Math.round((s.fullCost - s.totalAmount) * 100) / 100;

                            return (
                              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 font-bold text-white flex items-center gap-2.5">
                                  <IconComp className={`w-4 h-4 ${s.type === 'Luz' ? 'text-amber-400' : 'text-cyan-400'}`} />
                                  <span>{s.type}</span>
                                </td>
                                <td className="py-4 px-6 font-mono text-xs text-slate-300">{s.periodRange || 'Reciente'}</td>
                                <td className="py-4 px-6 font-mono text-xs text-slate-300">{s.chargeDate || s.receptionDate}</td>
                                <td className="py-4 px-6 font-mono font-bold text-white tabular-nums">
                                  {s.fullCost.toFixed(2)} €
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/35">
                                    {s.pct}%
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono text-xs">
                                  <span className="font-black text-emerald-400 text-sm">{s.totalAmount.toFixed(2)} €</span>
                                  <span className="block text-[11px] text-slate-400">Prop: {propCost > 0 ? propCost.toFixed(2) : '0.00'} €</span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow ${
                                    isPaid 
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
                                    {isPaid ? 'COBRADO / EN RECIBO' : 'PENDIENTE'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right space-x-2">
                                  {!isPaid && (
                                    <button
                                      onClick={() => addSupplyToCurrentDraft(s.utilityType, s.id)}
                                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 text-xs font-black text-white rounded-xl shadow transition-all inline-flex items-center gap-1"
                                      title="Añadir a borrador de recibo en la sección 4"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Añadir a Recibo
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      const rawExp = s.utilityType === 'WATER'
                                        ? waterExpenses.find(w => w.id === s.id)
                                        : electricityExpenses.find(e => e.id === s.id);
                                      if (rawExp) setViewingAuditExpense(rawExp);
                                    }}
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-cyan-300 rounded-xl border border-cyan-500/30 transition-colors inline-flex items-center gap-1"
                                    title="Ver auditoría técnica de tarifa y conceptos"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Auditoría
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (s.utilityType === 'WATER') {
                                        setWaterExpenses(waterExpenses.map(w => w.id === s.id ? { ...w, status: w.status === 'PAID' ? 'PENDING' : 'PAID' } : w));
                                      } else {
                                        setElectricityExpenses(electricityExpenses.map(e => e.id === s.id ? { ...e, status: e.status === 'PAID' ? 'PENDING' : 'PAID' } : e));
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-slate-300 rounded-xl border border-white/10 transition-colors"
                                    title="Cambiar estado manual"
                                  >
                                    {isPaid ? 'Reabrir' : 'Cobrar'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('¿Eliminar esta factura?')) {
                                        if (s.utilityType === 'WATER') {
                                          setWaterExpenses(waterExpenses.filter(w => w.id !== s.id));
                                        } else {
                                          setElectricityExpenses(electricityExpenses.filter(e => e.id !== s.id));
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors inline-block"
                                    title="Eliminar factura"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: AUDITORÍA EXHAUSTIVA DE LUZ (REPSOL / EXCEL REPSOL) */}
            {expensesSubTab === 'audit_elec' && (
              <div className="space-y-6 animate-fadeIn">
                {/* 4 Executive KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Card 1: Latest kWh Price & Variation */}
                  <div className="bg-slate-900/90 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Precio kWh Actual</span>
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {electricityExpenses[0]?.unitPrice ? `${electricityExpenses[0].unitPrice.toFixed(6)} €` : '0.101150 €'}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {electricityExpenses[0]?.priceVariationPct && electricityExpenses[0].priceVariationPct < 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <TrendingDown className="w-3 h-3" /> {electricityExpenses[0].priceVariationPct}% (Bajada de tarifa)
                        </span>
                      ) : electricityExpenses[0]?.priceVariationPct && electricityExpenses[0].priceVariationPct > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/30">
                          <TrendingUp className="w-3 h-3" /> +{electricityExpenses[0].priceVariationPct}% (Subida detectada)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Tarifa fija Repsol vigente</span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Extra services / Insurance alert */}
                  <div className="bg-slate-900/90 border border-red-500/30 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Servicios Ocultos Repsol</span>
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {electricityExpenses[0]?.extraServicesCost ? `${electricityExpenses[0].extraServicesCost.toFixed(2)} €/mes` : '4.06 €/mes'}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-2">
                      {electricityExpenses[0]?.extraServicesName || 'Tu Asistente 24h'} • Facturado aparte del consumo de energía.
                    </p>
                  </div>

                  {/* Card 3: Contracted Power */}
                  <div className="bg-slate-900/90 border border-white/15 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Potencia Contratada</span>
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {electricityExpenses[0]?.contractedPower || '6,900 kW'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Término de potencia fijo: {electricityExpenses[0]?.fixedTermCost?.toFixed(2) || '33.92'} € / mes
                    </p>
                  </div>

                  {/* Card 4: Hourly Consumption Breakdown */}
                  <div className="bg-slate-900/90 border border-white/15 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Reparto Horario (kWh)</span>
                      <Clock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-lg font-black font-mono text-white">
                      {electricityExpenses[0]?.kwhConsumed?.toFixed(0) || '415'} kWh consumidos
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-300 font-mono">
                        <span className="text-purple-300">Valle: {electricityExpenses[0]?.hourlyTiers?.valleKwh || 222}k</span>
                        <span className="text-amber-300">Llano: {electricityExpenses[0]?.hourlyTiers?.llanoKwh || 97}k</span>
                        <span className="text-red-300">Punta: {electricityExpenses[0]?.hourlyTiers?.puntaKwh || 96}k</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: '53%' }} title="Valle (53%)"></div>
                        <div className="bg-amber-500 h-full" style={{ width: '23%' }} title="Llano (23%)"></div>
                        <div className="bg-red-500 h-full" style={{ width: '24%' }} title="Punta (24%)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Title and Quick Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/70 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Historial de Facturas de Luz (Estilo Excel Repsol)
                    </span>
                    <span className="text-xs text-slate-400">• Siempre las últimas arriba</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAiModalType('ELECTRICITY')}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> + Digitalizar Nueva Factura Luz (IA)
                    </button>
                  </div>
                </div>

                {/* EXHAUSTIVE ELECTRICITY TABLE (REPSOL FORMAT - LATEST FIRST) */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/15 text-[11px] font-black text-amber-300 uppercase tracking-wider bg-slate-950/80">
                          <th className="py-3.5 px-4">Periodo / Fecha</th>
                          <th className="py-3.5 px-3">Días</th>
                          <th className="py-3.5 px-4">Total Factura</th>
                          <th className="py-3.5 px-4">Precio kWh & Variación</th>
                          <th className="py-3.5 px-4">Tramos (P/Ll/V)</th>
                          <th className="py-3.5 px-3">Consumo Total</th>
                          <th className="py-3.5 px-3">Potencia</th>
                          <th className="py-3.5 px-4">Servicios Extras</th>
                          <th className="py-3.5 px-4">Inq. ({supplyRules.electricity}%)</th>
                          <th className="py-3.5 px-3">Estado</th>
                          <th className="py-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-xs font-medium">
                        {[...electricityExpenses].sort((a, b) => (b.periodStartDate || b.chargeDate || b.id).localeCompare(a.periodStartDate || a.chargeDate || a.id)).map((e) => {
                          const isPaid = e.status === 'PAID';
                          const hasAlert = e.alarm?.hasAlarm || (e.extraServicesCost && e.extraServicesCost > 0);

                          return (
                            <tr key={e.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-white block">{e.periodRange || e.chargeDate}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{e.company} • Fact: {e.invoiceNumber}</span>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-300">{e.billingDays || 30} d</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums text-sm">
                                {(e.fullInvoiceTotal || e.totalAmount * 2).toFixed(2)} €
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-black text-white block">{e.unitPrice.toFixed(6)} €</span>
                                {e.isRateChange ? (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-500/40">
                                    ⚡ Cambio de tarifa
                                  </span>
                                ) : e.priceVariationPct && e.priceVariationPct < 0 ? (
                                  <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                    <TrendingDown className="w-2.5 h-2.5" /> {e.priceVariationPct}%
                                  </span>
                                ) : e.priceVariationPct && e.priceVariationPct > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-300 border border-red-500/40">
                                    <TrendingUp className="w-2.5 h-2.5" /> +{e.priceVariationPct}%
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                {e.hourlyTiers ? (
                                  <span className="text-slate-300">
                                    <span className="text-red-400">{e.hourlyTiers.puntaKwh || 0}</span> /{' '}
                                    <span className="text-amber-400">{e.hourlyTiers.llanoKwh || 0}</span> /{' '}
                                    <span className="text-purple-400">{e.hourlyTiers.valleKwh || 0}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 font-mono font-bold text-amber-200">
                                {e.kwhConsumed.toFixed(0)} kWh
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-300">{e.contractedPower || '6,9 kW'}</td>
                              <td className="py-3.5 px-4">
                                {e.extraServicesCost && e.extraServicesCost > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-bold" title={e.extraServicesName}>
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    {e.extraServicesCost.toFixed(2)} €
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-xs">0.00 €</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                                {e.totalAmount.toFixed(2)} €
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                  isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
                                  {isPaid ? 'Cobrado' : 'Pendiente'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                {!isPaid && (
                                  <button
                                    onClick={() => addSupplyToCurrentDraft('ELECTRICITY', e.id)}
                                    className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 text-[11px] font-black rounded-lg shadow inline-flex items-center gap-1"
                                    title="Añadir al borrador de recibo actual"
                                  >
                                    <Plus className="w-3 h-3" /> + Recibo
                                  </button>
                                )}
                                <button
                                  onClick={() => setViewingAuditExpense(e)}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-bold rounded-lg border border-cyan-500/30 inline-flex items-center gap-1"
                                  title="Ver auditoría técnica de tarifa y conceptos"
                                >
                                  <Eye className="w-3 h-3" /> Auditoría
                                </button>
                                <button
                                  onClick={() => {
                                    setElectricityExpenses(electricityExpenses.map(item => item.id === e.id ? { ...item, status: item.status === 'PAID' ? 'PENDING' : 'PAID' } : item));
                                  }}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] rounded-lg border border-white/10"
                                >
                                  {isPaid ? 'Reabrir' : 'Cobrar'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('¿Eliminar esta factura de luz?')) {
                                      setElectricityExpenses(electricityExpenses.filter(item => item.id !== e.id));
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 transition-colors inline-block"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: AUDITORÍA EXHAUSTIVA DE AGUA (EMUASA / TASAS MUNICIPALES) */}
            {expensesSubTab === 'audit_water' && (
              <div className="space-y-6 animate-fadeIn">
                {/* 4 Executive KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Card 1: Water Price per m3 */}
                  <div className="bg-slate-900/90 border border-cyan-500/30 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Precio Agua Variable</span>
                      <Droplet className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {waterExpenses[0]?.unitPrice ? `${waterExpenses[0].unitPrice.toFixed(2)} €/m³` : '1.48 €/m³'}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-2">
                      Último consumo: {waterExpenses[0]?.m3Consumed || 17} m³ en {waterExpenses[0]?.billingDays || 60} días
                    </p>
                  </div>

                  {/* Card 2: Waste Tax (Tasa de Basura) */}
                  <div className="bg-slate-900/90 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Tasa Basura Ayto Murcia</span>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {waterExpenses[0]?.breakdown?.wasteCollection ? `${waterExpenses[0].breakdown.wasteCollection.toFixed(2)} €` : '28.35 €'}
                    </div>
                    <p className="text-[11px] text-amber-300 mt-2">
                      Representa el 33,9% del total de la factura bimestral.
                    </p>
                  </div>

                  {/* Card 3: Canon de Saneamiento (ESAMUR) */}
                  <div className="bg-slate-900/90 border border-white/15 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Canon Saneamiento ESAMUR</span>
                      <Activity className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {waterExpenses[0]?.breakdown?.sanitationCanon ? `${waterExpenses[0].breakdown.sanitationCanon.toFixed(2)} €` : '11.10 €'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Fijo: 6,00 € + Variable depuración: 5,10 €
                    </p>
                  </div>

                  {/* Card 4: Daily cost */}
                  <div className="bg-slate-900/90 border border-white/15 p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Coste Diario Medio</span>
                      <Calendar className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {waterExpenses[0]?.costPerDay ? `${waterExpenses[0].costPerDay.toFixed(3)} €/día` : '1.393 €/día'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Facturación bimestral regular (cada ~60 días).
                    </p>
                  </div>
                </div>

                {/* Table Title and Quick Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/70 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                      <Droplet className="w-4 h-4" /> Historial de Facturas de Agua (Desglose Municipal EMUASA)
                    </span>
                    <span className="text-xs text-slate-400">• Siempre las últimas arriba</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAiModalType('WATER')}
                      className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> + Digitalizar Nueva Factura Agua (IA)
                    </button>
                  </div>
                </div>

                {/* EXHAUSTIVE WATER TABLE (EMUASA FORMAT - LATEST FIRST) */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/15 text-[11px] font-black text-cyan-300 uppercase tracking-wider bg-slate-950/80">
                          <th className="py-3.5 px-4">Periodo & Días</th>
                          <th className="py-3.5 px-4">Total Factura (€/d)</th>
                          <th className="py-3.5 px-3">Consumo m³</th>
                          <th className="py-3.5 px-3">Servicio Agua</th>
                          <th className="py-3.5 px-4">Tasa Basura Ayto</th>
                          <th className="py-3.5 px-4">Canon ESAMUR</th>
                          <th className="py-3.5 px-3">Alcantarillado</th>
                          <th className="py-3.5 px-4">Inq. ({supplyRules.water}%)</th>
                          <th className="py-3.5 px-3">Estado</th>
                          <th className="py-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-xs font-medium">
                        {[...waterExpenses].sort((a, b) => (b.periodStartDate || b.chargeDate || b.id).localeCompare(a.periodStartDate || a.chargeDate || a.id)).map((w) => {
                          const isPaid = w.status === 'PAID';
                          const waste = w.breakdown?.wasteCollection || 28.35;
                          const canon = w.breakdown?.sanitationCanon || 11.10;

                          return (
                            <tr key={w.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-white block">{w.periodRange || w.chargeDate}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{w.company} • {w.billingDays || 60} días</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums text-sm">
                                {(w.fullInvoiceTotal || w.totalAmount * 2).toFixed(2)} €
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {w.costPerDay ? `${w.costPerDay.toFixed(3)} €/d` : `${((w.fullInvoiceTotal || w.totalAmount * 2) / (w.billingDays || 60)).toFixed(3)} €/d`}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono font-bold text-cyan-200">
                                {w.m3Consumed} m³
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-300">
                                {w.breakdown?.waterService ? `${w.breakdown.waterService.toFixed(2)} €` : '13.80 €'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold">
                                  {waste.toFixed(2)} €
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-300">
                                {canon.toFixed(2)} €
                              </td>
                              <td className="py-3.5 px-3 font-mono text-slate-400">
                                {w.breakdown?.sewerage ? `${w.breakdown.sewerage.toFixed(2)} €` : '8.58 €'}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                                {w.totalAmount.toFixed(2)} €
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                  isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
                                  {isPaid ? 'Cobrado' : 'Pendiente'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                {!isPaid && (
                                  <button
                                    onClick={() => addSupplyToCurrentDraft('WATER', w.id)}
                                    className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-slate-950 text-[11px] font-black rounded-lg shadow inline-flex items-center gap-1"
                                    title="Añadir al borrador de recibo actual"
                                  >
                                    <Plus className="w-3 h-3" /> + Recibo
                                  </button>
                                )}
                                <button
                                  onClick={() => setViewingAuditExpense(w)}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-bold rounded-lg border border-cyan-500/30 inline-flex items-center gap-1"
                                  title="Ver auditoría técnica de tarifa y conceptos"
                                >
                                  <Eye className="w-3 h-3" /> Auditoría
                                </button>
                                <button
                                  onClick={() => {
                                    setWaterExpenses(waterExpenses.map(item => item.id === w.id ? { ...item, status: item.status === 'PAID' ? 'PENDING' : 'PAID' } : item));
                                  }}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] rounded-lg border border-white/10"
                                >
                                  {isPaid ? 'Reabrir' : 'Cobrar'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('¿Eliminar esta factura de agua?')) {
                                      setWaterExpenses(waterExpenses.filter(item => item.id !== w.id));
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 transition-colors inline-block"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: OTROS GASTOS Y AVERÍAS */}
            {expensesSubTab === 'other' && (
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                    <Wrench className="w-5 h-5 text-indigo-400" /> Otros Gastos / Averías Repercutibles
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <form onSubmit={handleAddOtherExpense} className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Registrar Nuevo Gasto</span>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Concepto (ej. Arreglo cisterna, Cerradura)"
                        value={newOtherName}
                        onChange={(e) => setNewOtherName(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Coste (€)"
                          value={newOtherCost}
                          onChange={(e) => setNewOtherCost(e.target.value)}
                          className="bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="date"
                          value={newOtherDate}
                          onChange={(e) => setNewOtherDate(e.target.value)}
                          className="bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Notas adicionales..."
                        value={newOtherNotes}
                        onChange={(e) => setNewOtherNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow"
                      >
                        Añadir Gasto
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Listado de Gastos Registrados</span>
                    {otherExpenses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay gastos extras registrados.</p>
                    ) : (
                      otherExpenses.map(o => (
                        <div key={o.id} className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{o.name}</p>
                            <p className="text-slate-400 text-[11px]">{o.date} • {o.notes || 'Sin notas'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-amber-300">{o.cost.toFixed(2)} €</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'PAID' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                              {o.status === 'PAID' ? 'Cobrado' : 'Pendiente'}
                            </span>
                            <button
                              onClick={() => setOtherExpenses(otherExpenses.filter(x => x.id !== o.id))}
                              className="text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LIQUIDACIONES Y RECIBOS (PROMPT 9: CREACIÓN POR FECHA, AJUSTES DE SALDO, WHATSAPP Y COBROS) */}
        {activeTab === 'billing' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Header of Billing */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-full"></span>
                  4. Liquidaciones y Recibos
                </h2>
                <p className="text-sm text-slate-300 font-medium">Gestión dinámica de cobro al inquilino por fecha, saldos pendientes y notas explicativas.</p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto">
                <button
                  onClick={() => setBillingSubTab('4.1_builder')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    billingSubTab === '4.1_builder' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 4.1 Cobro al Inquilino (Nuevo Recibo)
                </button>
                <button
                  onClick={() => setBillingSubTab('4.2_receipts')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    billingSubTab === '4.2_receipts' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" /> 4.2 Recibos & Cobrado ({receipts.length})
                </button>
                <button
                  onClick={() => setBillingSubTab('4.3_history')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    billingSubTab === '4.3_history' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> 4.3 Historial ({receipts.filter(r => r.status === 'PAID').length})
                </button>
                <button
                  onClick={() => setBillingSubTab('4.4_stats')}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    billingSubTab === '4.4_stats' ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" /> 4.4 Estadísticas
                </button>
              </div>
            </div>

            {/* 4.1 CREACIÓN DINÁMICA DE RECIBO POR FECHA (Punto 9 exacto del usuario) */}
            {billingSubTab === '4.1_builder' && (
              <div className="space-y-8">
                {/* Information Callout */}
                <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 p-5 rounded-3xl border border-indigo-500/30 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-extrabold text-white text-sm">¿Cómo funciona esta emisión de recibo flexible?</p>
                    <p>
                      Los recibos se forman <strong>por fecha</strong> (puedes cobrar mensual, cada 2 meses o el periodo que necesites). Selecciona qué meses de renta y qué facturas de agua o luz deseas incluir hoy. Si alguna factura aún no ha llegado (ej. agua bimestral), quedará pendiente en amarillo y se liquidará automáticamente en el próximo recibo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* LEFT: Items Selector (Rents, Water, Electricity, Other, Previous Balance) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* General Receipt Config (Date, Number, Title) */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" /> Parámetros de la Liquidación
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Fecha Emisión</label>
                          <input
                            type="date"
                            value={draftIssueDate}
                            onChange={(e) => setDraftIssueDate(e.target.value)}
                            className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Nº Recibo</label>
                          <input
                            type="text"
                            value={draftReceiptNumber}
                            onChange={(e) => setDraftReceiptNumber(e.target.value)}
                            className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Título / Concepto</label>
                          <input
                            type="text"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="w-full bg-slate-950/90 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Meses de Alquiler Pendientes */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-fuchsia-400" /> 1. Meses de Alquiler a Cobrar
                        </h4>
                        <span className="text-xs text-slate-400">{selectedRentMonths.length} seleccionado(s)</span>
                      </div>

                      <div className="space-y-2">
                        {monthsList.map(m => {
                          const isAlreadyPaid = m.status === 'PAID';
                          const isSelected = selectedRentMonths.includes(m.monthYear);

                          return (
                            <div
                              key={m.id}
                              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                                isAlreadyPaid
                                  ? 'bg-slate-950/40 border-white/5 opacity-60'
                                  : isSelected
                                  ? 'bg-fuchsia-950/50 border-fuchsia-500/50 shadow-md'
                                  : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div>
                                <span className="font-extrabold text-white text-sm block">{m.monthName}</span>
                                <span className="text-slate-400 text-[11px] font-mono">Tarifa: {m.rentAmount.toFixed(2)} €</span>
                              </div>

                              <div className="flex items-center gap-3">
                                {isAlreadyPaid ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                                    Ya cobrado
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => toggleRentMonth(m.monthYear)}
                                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-fuchsia-600 text-white shadow'
                                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {isSelected ? 'Incluido' : 'Incluir en Recibo'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Facturas de Agua Pendientes (Bimensual) */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Droplet className="w-4 h-4 text-cyan-400" /> 2. Facturas de Agua Pendientes
                        </h4>
                        <span className="text-xs text-slate-400">{selectedWaterIds.length} seleccionada(s)</span>
                      </div>

                      {waterExpenses.filter(w => w.status === 'PENDING').length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-950/60 rounded-2xl">
                          No hay facturas de agua pendientes. Si recibes una factura más adelante, se liquidará en el siguiente periodo.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {[...waterExpenses].filter(w => w.status === 'PENDING').sort((a, b) => (b.chargeDate || b.receptionDate).localeCompare(a.chargeDate || a.receptionDate)).map(w => {
                            const isSelected = selectedWaterIds.includes(w.id);
                            return (
                              <div
                                key={w.id}
                                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                                  isSelected
                                    ? 'bg-cyan-950/50 border-cyan-500/50 shadow-md'
                                    : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div>
                                  <span className="font-extrabold text-white text-sm block">Agua {w.company}</span>
                                  <span className="text-slate-400 text-[11px] font-mono">Periodo: {w.periodRange || w.chargeDate} • Factura total: {(w.fullInvoiceTotal || w.totalAmount * 2).toFixed(2)} €</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-black text-cyan-300 text-sm">
                                    {w.totalAmount.toFixed(2)} € <span className="text-[10px] text-slate-400 font-normal">({supplyRules.water}%)</span>
                                  </span>
                                  <button
                                    onClick={() => toggleWater(w.id)}
                                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-cyan-600 text-white shadow'
                                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {isSelected ? 'Incluido' : 'Incluir'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Facturas de Luz Pendientes */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" /> 3. Facturas de Luz Pendientes
                        </h4>
                        <span className="text-xs text-slate-400">{selectedElectricityIds.length} seleccionada(s)</span>
                      </div>

                      {electricityExpenses.filter(e => e.status === 'PENDING').length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-950/60 rounded-2xl">
                          No hay facturas de luz pendientes de cobro.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {[...electricityExpenses].filter(e => e.status === 'PENDING').sort((a, b) => (b.chargeDate || b.receptionDate).localeCompare(a.chargeDate || a.receptionDate)).map(e => {
                            const isSelected = selectedElectricityIds.includes(e.id);
                            return (
                              <div
                                key={e.id}
                                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                                  isSelected
                                    ? 'bg-amber-950/50 border-amber-500/50 shadow-md'
                                    : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div>
                                  <span className="font-extrabold text-white text-sm block">Luz {e.company}</span>
                                  <span className="text-slate-400 text-[11px] font-mono">Periodo: {e.periodRange || e.chargeDate} • Factura total: {(e.fullInvoiceTotal || e.totalAmount * 2).toFixed(2)} €</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-black text-amber-300 text-sm">
                                    {e.totalAmount.toFixed(2)} € <span className="text-[10px] text-slate-400 font-normal">({supplyRules.electricity}%)</span>
                                  </span>
                                  <button
                                    onClick={() => toggleElectricity(e.id)}
                                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-amber-600 text-white shadow'
                                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {isSelected ? 'Incluido' : 'Incluir'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 4: Otros Gastos Pendientes */}
                    {otherExpenses.filter(o => o.status === 'PENDING').length > 0 && (
                      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-indigo-400" /> 4. Otros Gastos / Averías
                          </h4>
                          <span className="text-xs text-slate-400">{selectedOtherIds.length} seleccionado(s)</span>
                        </div>

                        <div className="space-y-2">
                          {otherExpenses.filter(o => o.status === 'PENDING').map(o => {
                            const isSelected = selectedOtherIds.includes(o.id);
                            return (
                              <div
                                key={o.id}
                                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                                  isSelected
                                    ? 'bg-indigo-950/50 border-indigo-500/50 shadow-md'
                                    : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div>
                                  <span className="font-extrabold text-white text-sm block">{o.name}</span>
                                  <span className="text-slate-400 text-[11px] font-mono">{o.date} • {o.notes}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-black text-indigo-300 text-sm">{o.cost.toFixed(2)} €</span>
                                  <button
                                    onClick={() => toggleOther(o.id)}
                                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                                      isSelected ? 'bg-indigo-600 text-white shadow' : 'bg-white/10 hover:bg-white/20 text-slate-200'
                                    }`}
                                  >
                                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {isSelected ? 'Incluido' : 'Incluir'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Live Preview, Arrears adjustment, Real Amount Paid, and WhatsApp Note */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl sticky top-24">
                      <div className="flex items-center justify-between border-b border-white/15 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-cyan-400" /> Resumen del Recibo
                          </h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{draftReceiptNumber}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Borrador en curso
                        </span>
                      </div>

                      {/* Itemized List */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Conceptos a liquidar</span>
                        {draftItems.length === 0 ? (
                          <div className="p-4 bg-slate-950/80 rounded-2xl border border-dashed border-white/20 text-center text-xs text-slate-400">
                            No has incluido ningún mes ni suministro aún. Haz clic en "Incluir" a la izquierda.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {draftItems.map((item, idx) => (
                              <div key={idx} className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                                <div className="pr-2">
                                  <p className="font-extrabold text-white">{item.description}</p>
                                  {item.detail && <p className="text-[10px] text-slate-400">{item.detail}</p>}
                                </div>
                                <span className="font-mono font-black text-white text-sm shrink-0">{item.amount.toFixed(2)} €</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Saldo Arrastrado del Recibo Anterior (INCISO EXACTO DEL USUARIO: 659€ pagando 600€ o 700€) */}
                      <div className="bg-slate-950/90 p-4 rounded-2xl border border-white/15 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Saldo del Recibo Anterior (€)
                          </label>
                          <span className="text-[11px] text-slate-400">Positivo = Deuda | Negativo = A favor</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={draftPreviousBalance}
                          onChange={(e) => setDraftPreviousBalance(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                        />
                        {draftPreviousBalance !== 0 && (
                          <p className={`text-[11px] font-bold ${draftPreviousBalance > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {draftPreviousBalance > 0
                              ? `⚠️ Se suman ${draftPreviousBalance.toFixed(2)} € que quedaron pendientes de la liquidación anterior.`
                              : `💰 Se descuentan ${Math.abs(draftPreviousBalance).toFixed(2)} € que el inquilino tenía a su favor.`}
                          </p>
                        )}
                      </div>

                      {/* Subtotal, Total y Cobro Real */}
                      <div className="border-t border-white/15 pt-4 space-y-3">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Suma de conceptos:</span>
                          <span className="font-mono font-bold text-white">{draftSubtotal.toFixed(2)} €</span>
                        </div>
                        {draftPreviousBalance !== 0 && (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Ajuste saldo anterior:</span>
                            <span className="font-mono font-bold text-cyan-300">
                              {draftPreviousBalance > 0 ? `+${draftPreviousBalance.toFixed(2)}` : draftPreviousBalance.toFixed(2)} €
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-black text-white bg-slate-950 p-4 rounded-2xl border border-cyan-500/40">
                          <span>TOTAL A COBRAR:</span>
                          <span className="font-mono text-2xl text-cyan-400">{draftTotalAmount.toFixed(2)} €</span>
                        </div>

                        {/* Importe Real Pagado por el Inquilino */}
                        <div className="bg-slate-950/90 p-4 rounded-2xl border border-white/15 space-y-2">
                          <label className="text-xs font-black text-slate-200 uppercase tracking-wider block">
                            Importe Real Pagado por el Inquilino (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={`Por defecto: ${draftTotalAmount.toFixed(2)}`}
                            value={draftAmountPaid}
                            onChange={(e) => setDraftAmountPaid(e.target.value)}
                            className="w-full bg-slate-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-mono font-black text-base focus:outline-none focus:border-cyan-500"
                          />

                          {/* Dynamic Feedback on Partial / Excess Payment */}
                          {draftRemainingBalance > 0 ? (
                            <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-300 space-y-1">
                              <span className="font-extrabold block">⚠️ Pago parcial (Faltan {draftRemainingBalance.toFixed(2)} €)</span>
                              <p className="text-[11px] text-slate-300">
                                Estos <strong>{draftRemainingBalance.toFixed(2)} €</strong> quedarán como deuda pendiente para arrastrarse y cobrarse automáticamente en el siguiente recibo.
                              </p>
                            </div>
                          ) : draftRemainingBalance < 0 ? (
                            <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 space-y-1">
                              <span className="font-extrabold block">🎉 Pago en exceso (Sobran {Math.abs(draftRemainingBalance).toFixed(2)} €)</span>
                              <p className="text-[11px] text-slate-300">
                                Estos <strong>{Math.abs(draftRemainingBalance).toFixed(2)} €</strong> quedarán como saldo a favor del inquilino y se descontarán en el siguiente recibo.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Pago exacto al céntimo. Saldo totalmente liquidado.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp / Explanatory Note Generator (Punto 9 exacto) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-emerald-400" /> Nota Explicativa / WhatsApp
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNoteManuallyEdited(false);
                            }}
                            className="text-[11px] text-cyan-400 hover:underline"
                          >
                            Regenerar automática
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={draftExplanationNote}
                          onChange={(e) => {
                            setDraftExplanationNote(e.target.value);
                            setIsNoteManuallyEdited(true);
                          }}
                          className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(draftExplanationNote)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" /> Copiar Texto para WhatsApp
                        </button>
                      </div>

                      {/* Primary Actions: Guardar como Pendiente / Marcar como Cobrado */}
                      <div className="pt-4 border-t border-white/15 space-y-3">
                        <button
                          type="button"
                          onClick={() => handleSaveReceipt(true)}
                          className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" /> CONFIRMAR Y MARCAR COMO COBRADO
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveReceipt(false)}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-amber-400" /> Guardar como Recibo Pendiente (Emitir)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4.2 RECIBOS EMITIDOS & GESTIÓN DE COBRO */}
            {billingSubTab === '4.2_receipts' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cyan-400" /> Recibos Emitidos
                    </h3>
                    <p className="text-xs text-slate-300">Recibos pendientes de cobro y liquidados.</p>
                  </div>
                  <button
                    onClick={() => setBillingSubTab('4.1_builder')}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Formar Nuevo Recibo por Fecha
                  </button>
                </div>

                {receipts.length === 0 ? (
                  <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-white">No hay recibos generados aún</h4>
                    <p className="text-sm text-slate-300 max-w-md mx-auto">
                      Ve al apartado <strong>4.1 Cobro al Inquilino</strong> para formar el primer recibo con fecha y seleccionar los meses y suministros pendientes.
                    </p>
                    <button
                      onClick={() => setBillingSubTab('4.1_builder')}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-black rounded-2xl shadow-lg inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Crear Primer Recibo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...receipts].sort((a, b) => (b.issueDate || b.id).localeCompare(a.issueDate || a.id)).map((rec) => {
                      const isPaid = rec.status === 'PAID';
                      return (
                        <div
                          key={rec.id}
                          className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 lg:p-7 space-y-5 border transition-all shadow-2xl ${
                            isPaid ? 'border-emerald-500/30' : 'border-amber-500/40 shadow-amber-500/10'
                          }`}
                        >
                          <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-black text-white text-base">{rec.receiptNumber}</span>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                                  isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                  {isPaid ? `Cobrado (${rec.paidDate})` : 'Pendiente de Cobro'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{rec.title} • Fecha: {rec.issueDate}</p>
                            </div>
                            <span className="font-mono font-black text-2xl text-cyan-400">{rec.totalAmount.toFixed(2)} €</span>
                          </div>

                          {/* Items summary */}
                          <div className="space-y-1.5 text-xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Conceptos incluidos ({rec.items.length})</span>
                            <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 space-y-1.5 max-h-36 overflow-y-auto">
                              {rec.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-slate-300 text-xs">
                                  <span>{it.description}</span>
                                  <span className="font-mono font-bold text-white">{it.amount.toFixed(2)} €</span>
                                </div>
                              ))}
                              {rec.previousBalance !== 0 && (
                                <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                                  <span className="text-cyan-300">Ajuste saldo liquidación anterior:</span>
                                  <span className="font-mono font-bold text-cyan-300">
                                    {rec.previousBalance > 0 ? `+${rec.previousBalance.toFixed(2)}` : rec.previousBalance.toFixed(2)} €
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment info if paid */}
                          {isPaid && (
                            <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl text-xs flex justify-between items-center">
                              <div>
                                <span className="text-emerald-400 font-bold block">Importe pagado: {rec.amountPaid.toFixed(2)} €</span>
                                {rec.remainingBalance !== 0 && (
                                  <span className="text-slate-400 text-[11px]">
                                    Remanente para próximo recibo: {rec.remainingBalance > 0 ? `+${rec.remainingBalance.toFixed(2)} € (deuda)` : `${rec.remainingBalance.toFixed(2)} € (a favor)`}
                                  </span>
                                )}
                              </div>
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                            <button
                              onClick={() => setSelectedReceiptForModal(rec)}
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-white/10"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Detalle / Imprimir
                            </button>
                            <button
                              onClick={() => copyToClipboard(rec.explanationNote)}
                              className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1"
                              title="Copiar texto para WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" /> WhatsApp
                            </button>
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  const custom = prompt(`Marcar recibo ${rec.receiptNumber} como cobrado.\nImporte pagado por el inquilino (€):`, rec.totalAmount.toString());
                                  if (custom !== null) {
                                    handleMarkExistingReceiptPaid(rec.id, parseFloat(custom) || rec.totalAmount);
                                  }
                                }}
                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Cobrar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReceipt(rec.id)}
                              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors"
                              title="Eliminar recibo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4.3 HISTORIAL DE COBROS */}
            {billingSubTab === '4.3_history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" /> Historial de Cobros Liquidados
                    </h3>
                    <p className="text-xs text-slate-300">Registro histórico de todas las liquidaciones cobradas al inquilino.</p>
                  </div>
                </div>

                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/15 text-xs font-extrabold text-cyan-300 uppercase tracking-wider bg-slate-950/70">
                          <th className="py-4 px-6">Nº Recibo</th>
                          <th className="py-4 px-6">Fecha Emisión</th>
                          <th className="py-4 px-6">Fecha Cobro</th>
                          <th className="py-4 px-6">Conceptos</th>
                          <th className="py-4 px-6">Total Liquidado</th>
                          <th className="py-4 px-6">Importe Cobrado</th>
                          <th className="py-4 px-6">Saldo Remanente</th>
                          <th className="py-4 px-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-sm font-medium">
                        {receipts.filter(r => r.status === 'PAID').length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                              No hay recibos cobrados registrados aún en el historial.
                            </td>
                          </tr>
                        ) : (
                          [...receipts].filter(r => r.status === 'PAID').sort((a, b) => (b.issueDate || b.id).localeCompare(a.issueDate || a.id)).map((rec) => (
                            <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-6 font-mono font-bold text-white">{rec.receiptNumber}</td>
                              <td className="py-4 px-6 font-mono text-xs text-slate-300">{rec.issueDate}</td>
                              <td className="py-4 px-6 font-mono text-xs text-emerald-400 font-bold">{rec.paidDate || '-'}</td>
                              <td className="py-4 px-6 text-xs text-slate-200">
                                {rec.items.length} conceptos ({rec.items.map(i => i.type).join(', ')})
                              </td>
                              <td className="py-4 px-6 font-mono font-bold text-white">{rec.totalAmount.toFixed(2)} €</td>
                              <td className="py-4 px-6 font-mono font-black text-emerald-400">{rec.amountPaid.toFixed(2)} €</td>
                              <td className="py-4 px-6 font-mono text-xs">
                                {rec.remainingBalance === 0 ? (
                                  <span className="text-emerald-400 font-bold">0.00 € (Al día)</span>
                                ) : rec.remainingBalance > 0 ? (
                                  <span className="text-amber-400 font-bold">+{rec.remainingBalance.toFixed(2)} € (Deuda)</span>
                                ) : (
                                  <span className="text-cyan-400 font-bold">{rec.remainingBalance.toFixed(2)} € (A favor)</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right space-x-2">
                                <button
                                  onClick={() => setSelectedReceiptForModal(rec)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-white/10"
                                >
                                  Ver Recibo
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4.4 ESTADÍSTICAS Y MÉTRICAS FINANCIERAS (Requerido en punto 6 y 9) */}
            {billingSubTab === '4.4_stats' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-cyan-400" /> Estadísticas Financieras de Cobros y Suministros
                  </h3>
                  <p className="text-xs text-slate-300">Resumen numérico de cobros realizados, suministros pendientes y rentabilidad.</p>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-900/80 border border-white/15 p-6 rounded-3xl space-y-2">
                    <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Rentas Cobradas</span>
                    <span className="text-2xl font-mono font-black text-emerald-400">{stats.totalRentCollected.toFixed(2)} €</span>
                    <span className="text-[11px] text-slate-400 block">En recibos liquidados</span>
                  </div>

                  <div className="bg-slate-900/80 border border-white/15 p-6 rounded-3xl space-y-2">
                    <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Suministros Cobrados</span>
                    <span className="text-2xl font-mono font-black text-cyan-400">{stats.totalSuppliesCollected.toFixed(2)} €</span>
                    <span className="text-[11px] text-slate-400 block">Luz y Agua repercutidos</span>
                  </div>

                  <div className="bg-slate-900/80 border border-white/15 p-6 rounded-3xl space-y-2">
                    <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Suministros Pendientes</span>
                    <span className="text-2xl font-mono font-black text-amber-400">{stats.totalPendingSupplies.toFixed(2)} €</span>
                    <span className="text-[11px] text-slate-400 block">Agua ({stats.pendingWaterAmount.toFixed(2)}€) • Luz ({stats.pendingElecAmount.toFixed(2)}€)</span>
                  </div>

                  <div className="bg-slate-900/80 border border-white/15 p-6 rounded-3xl space-y-2">
                    <span className="text-xs text-slate-400 uppercase font-black tracking-wider block">Saldo Inquilino</span>
                    <span className={`text-2xl font-mono font-black ${tenantAccumulatedBalance > 0 ? 'text-rose-400' : tenantAccumulatedBalance < 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      {tenantAccumulatedBalance > 0 ? `+${tenantAccumulatedBalance.toFixed(2)} €` : tenantAccumulatedBalance < 0 ? `${tenantAccumulatedBalance.toFixed(2)} €` : '0.00 €'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{tenantAccumulatedBalance > 0 ? 'Deuda a favor de la propiedad' : tenantAccumulatedBalance < 0 ? 'Saldo a favor del inquilino' : 'Totalmente al día'}</span>
                  </div>
                </div>

                {/* Visual Chart Bars */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Comparativa de Suministros: Pagados vs Pendientes
                  </h4>

                  <div className="space-y-4 text-xs font-bold">
                    {/* Agua */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-cyan-300 flex items-center gap-1"><Droplet className="w-3.5 h-3.5" /> Agua</span>
                        <span className="font-mono text-slate-300">
                          Cobrado: {stats.paidWaterAmount.toFixed(2)}€ | Pendiente: {stats.pendingWaterAmount.toFixed(2)}€
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-white/10">
                        <div
                          className="bg-cyan-500 h-full"
                          style={{
                            width: `${stats.paidWaterAmount + stats.pendingWaterAmount > 0 ? (stats.paidWaterAmount / (stats.paidWaterAmount + stats.pendingWaterAmount)) * 100 : 50}%`
                          }}
                        ></div>
                        <div
                          className="bg-amber-500 h-full"
                          style={{
                            width: `${stats.paidWaterAmount + stats.pendingWaterAmount > 0 ? (stats.pendingWaterAmount / (stats.paidWaterAmount + stats.pendingWaterAmount)) * 100 : 50}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Luz */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-amber-300 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Luz</span>
                        <span className="font-mono text-slate-300">
                          Cobrado: {stats.paidElecAmount.toFixed(2)}€ | Pendiente: {stats.pendingElecAmount.toFixed(2)}€
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-white/10">
                        <div
                          className="bg-amber-400 h-full"
                          style={{
                            width: `${stats.paidElecAmount + stats.pendingElecAmount > 0 ? (stats.paidElecAmount / (stats.paidElecAmount + stats.pendingElecAmount)) * 100 : 50}%`
                          }}
                        ></div>
                        <div
                          className="bg-rose-500 h-full"
                          style={{
                            width: `${stats.paidElecAmount + stats.pendingElecAmount > 0 ? (stats.pendingElecAmount / (stats.paidElecAmount + stats.pendingElecAmount)) * 100 : 50}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.5: HISTORIAL FINANCIERO & ESTADÍSTICAS POR AÑOS */}
        {activeTab === 'desglose' && (() => {
          const yearlyData = getMonthlyDataForYear(selectedHistoricalYear);
          const totalIngresos = yearlyData.reduce((s: number, m: MonthlyFinancialRow) => s + m.totalIngreso, 0);
          const totalGastos = yearlyData.reduce((s: number, m: MonthlyFinancialRow) => s + m.totalGasto, 0);
          const beneficioNetoTotal = totalIngresos - totalGastos;
          const marginPct = totalIngresos > 0 ? ((beneficioNetoTotal / totalIngresos) * 100).toFixed(1) : '0';
          const promedioMensualNeto = (beneficioNetoTotal / (yearlyData.length || 1)).toFixed(2);
          const registeredMonthsCount = yearlyData.filter((m: MonthlyFinancialRow) => m.status === 'PAID').length;

          // For the chart, order months chronologically Ene -> Dic
          const chartMonths = [...yearlyData].reverse().slice(0, 12);
          const maxValInChart = Math.max(...chartMonths.map((m: MonthlyFinancialRow) => Math.max(m.totalIngreso, m.totalGasto, m.beneficioNeto)), 350);

          return (
            <div className="space-y-8 animate-fadeIn">
              {/* Header with Title and Year Selector Pills matching screenshot */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 via-indigo-500 to-teal-400 rounded-full"></span>
                    Historial Financiero & Estadísticas
                  </h2>
                  <p className="text-sm text-slate-300 font-medium">
                    Balance mensual y anual de ingresos por rentas, gastos de suministros y rentabilidad neta.
                  </p>
                </div>

                {/* Right controls: Year Pills, + Cargar Mes, Imprimir */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-white/15 shadow-inner overflow-x-auto">
                    {[2026, 2025, 2024, 2023, 2022, 2021, 'ALL'].map(yr => (
                      <button
                        key={yr}
                        onClick={() => setSelectedHistoricalYear(yr as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          selectedHistoricalYear === yr
                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {yr === 'ALL' ? 'Todos los Años' : yr}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsAddHistoricalModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> + CARGAR MES EN HISTORIAL
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/15 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                </div>
              </div>

              {/* 4 KPI Cards matching screenshot layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* INGRESOS TOTALES */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 p-6 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      INGRESOS TOTALES ({selectedHistoricalYear === 'ALL' ? 'Todos' : selectedHistoricalYear})
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-black text-white">{totalIngresos.toFixed(2)} €</div>
                  <p className="text-xs text-emerald-400 font-bold">
                    ↗ {registeredMonthsCount} meses con cobros registrados
                  </p>
                </div>

                {/* GASTOS TOTALES */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 p-6 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      GASTOS TOTALES (SUMINISTROS + FIJOS)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-black text-rose-400">{totalGastos.toFixed(2)} €</div>
                  <p className="text-xs text-slate-400">Luz, Agua, Gas, Comunidad y Averías</p>
                </div>

                {/* BENEFICIO NETO */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 p-6 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      BENEFICIO NETO (CASHFLOW)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      $
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-black text-cyan-400">{beneficioNetoTotal.toFixed(2)} €</div>
                  <p className="text-xs text-slate-300 font-bold">Margen de rentabilidad: <span className="text-cyan-300">{marginPct}%</span></p>
                </div>

                {/* PROMEDIO MENSUAL NETO */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-cyan-500/40 p-6 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      PROMEDIO MENSUAL NETO
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      Mensual
                    </span>
                  </div>
                  <div className="text-3xl font-mono font-black text-white">
                    {promedioMensualNeto} € <span className="text-xs text-slate-400 font-normal">/ mes</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-bold">100% Ocupación anual</p>
                </div>
              </div>

              {/* GRÁFICOS Y ANÁLISIS ESTADÍSTICO matching screenshot */}
              <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                      <BarChart2 className="w-5 h-5 text-indigo-400" /> GRÁFICOS Y ANÁLISIS ESTADÍSTICO
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Evolución comparativa de flujos de caja y distribución de costes.</p>
                  </div>

                  {/* Chart Tabs and Legend */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        onClick={() => setChartViewMode('monthly')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          chartViewMode === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Evolución Mes a Mes
                      </button>
                      <button
                        onClick={() => setChartViewMode('breakdown')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          chartViewMode === 'breakdown' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Desglose de Gastos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legend Badges */}
                <div className="flex items-center justify-center gap-6 text-xs font-bold pt-2">
                  <span className="flex items-center gap-2 text-cyan-300">
                    <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow"></span> Beneficio Neto (€)
                  </span>
                  <span className="flex items-center gap-2 text-rose-300">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow"></span> Gastos Totales (€)
                  </span>
                  <span className="flex items-center gap-2 text-emerald-300">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow"></span> Ingresos Totales (€)
                  </span>
                </div>

                {/* Visual SVG & CSS Bar & Line Chart Container */}
                <div className="pt-6 pb-2 px-2 relative min-h-[260px] flex items-end justify-between gap-2 sm:gap-4 border-b border-white/15">
                  {chartMonths.map((m, idx) => {
                    const ingHeight = Math.max(10, Math.min(100, (m.totalIngreso / maxValInChart) * 100));
                    const gasHeight = Math.max(8, Math.min(100, (m.totalGasto / maxValInChart) * 100));
                    const benHeight = Math.max(5, Math.min(100, (m.beneficioNeto / maxValInChart) * 100));

                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 z-30 bg-slate-950 border border-white/20 p-2.5 rounded-xl shadow-2xl text-[11px] font-mono pointer-events-none whitespace-nowrap space-y-1">
                          <p className="font-extrabold text-white">{m.monthName}</p>
                          <p className="text-emerald-400">Ingreso: {m.totalIngreso.toFixed(2)}€</p>
                          <p className="text-rose-400">Gasto: {m.totalGasto.toFixed(2)}€</p>
                          <p className="text-cyan-400 font-bold">Neto: {m.beneficioNeto.toFixed(2)}€</p>
                        </div>

                        {/* Bars Group */}
                        <div className="w-full max-w-[48px] h-48 flex items-end justify-center gap-1.5 bg-slate-950/40 p-1 rounded-2xl border border-white/5 relative">
                          {/* Ingreso Bar */}
                          <div
                            className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 shadow"
                            style={{ height: `${ingHeight}%` }}
                          ></div>

                          {/* Gasto Bar */}
                          <div
                            className="w-1/2 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-500 shadow"
                            style={{ height: `${gasHeight}%` }}
                          ></div>

                          {/* Beneficio Dot */}
                          <div
                            className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-cyan-400 border-2 border-slate-950 rounded-full shadow-lg z-20"
                            style={{ bottom: `${benHeight}%` }}
                          ></div>
                        </div>

                        <span className="text-[11px] font-bold text-slate-300 capitalize truncate w-full text-center">
                          {m.monthName.split(' ')[0].substring(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DESGLOSE MENSUAL DETALLADO TABLE WITH NEWEST MONTHS ON TOP */}
              <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/15 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Table className="w-4 h-4 text-cyan-400" /> DESGLOSE MENSUAL DETALLADO ({selectedHistoricalYear === 'ALL' ? 'Todos los Años' : selectedHistoricalYear})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registro mes a mes de rentas cobradas, suministros, gastos fijos y balance neto (ordenado de más reciente a más antiguo).
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold px-3 py-1 bg-cyan-950 text-cyan-300 rounded-full border border-cyan-500/30">
                    {yearlyData.length} registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-xs font-extrabold text-cyan-300 uppercase tracking-wider bg-slate-950/70">
                        <th className="py-4 px-6">Mes</th>
                        <th className="py-4 px-6">Inquilino</th>
                        <th className="py-4 px-6">Renta (€)</th>
                        <th className="py-4 px-6">Luz (€)</th>
                        <th className="py-4 px-6">Agua (€)</th>
                        <th className="py-4 px-6">Gas (€)</th>
                        <th className="py-4 px-6">Fijos / Averías</th>
                        <th className="py-4 px-6">Total Ingreso</th>
                        <th className="py-4 px-6">Total Gasto</th>
                        <th className="py-4 px-6">Beneficio Neto</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm font-medium">
                      {yearlyData.map((m) => {
                        const isPaid = m.status === 'PAID';

                        return (
                          <tr key={m.key} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 font-bold text-white capitalize">{m.monthName}</td>
                            <td className="py-4 px-6 text-slate-200">{m.tenantName || tenant.name}</td>
                            <td className="py-4 px-6 font-mono font-bold text-emerald-400 tabular-nums">
                              {m.rent.toFixed(2)} €
                              <span className="block text-[10px] font-extrabold text-emerald-500">LIQUIDADA</span>
                            </td>
                            <td className="py-4 px-6 font-mono text-amber-300 tabular-nums">
                              {m.elecCost > 0 ? (
                                <>
                                  {m.elecCost.toFixed(2)} €
                                  <span className="block text-[10px] font-extrabold text-emerald-400">LIQUIDADA</span>
                                </>
                              ) : '-'}
                            </td>
                            <td className="py-4 px-6 font-mono text-cyan-300 tabular-nums">
                              {m.waterCost > 0 ? (
                                <>
                                  {m.waterCost.toFixed(2)} €
                                  <span className="block text-[10px] font-extrabold text-emerald-400">LIQUIDADA</span>
                                </>
                              ) : '-'}
                            </td>
                            <td className="py-4 px-6 font-mono text-rose-300 tabular-nums">
                              {m.gasCost > 0 ? `${m.gasCost.toFixed(2)} €` : '-'}
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-300 tabular-nums">
                              {m.fixedCost > 0 ? `${m.fixedCost.toFixed(2)} €` : '-'}
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-white tabular-nums">
                              {m.totalIngreso.toFixed(2)} €
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-rose-400 tabular-nums">
                              {m.totalGasto.toFixed(2)} €
                            </td>
                            <td className="py-4 px-6 font-mono font-black text-cyan-400 text-base tabular-nums">
                              {m.beneficioNeto.toFixed(2)} €
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow ${
                                isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                {isPaid ? 'COBRADO' : 'PENDIENTE'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                onClick={() => {
                                  alert(`Detalle del mes ${m.monthName}:\nRenta: ${m.rent}€\nLuz: ${m.elecCost}€\nAgua: ${m.waterCost}€\nIngreso: ${m.totalIngreso}€\nGasto: ${m.totalGasto}€\nBeneficio: ${m.beneficioNeto}€`);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/10"
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: BACKUP & CSV IMPORT */}
        {activeTab === 'backup' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-full"></span>
                Copias de Seguridad e Importación de CSV (Suministros)
              </h2>
              <p className="text-sm text-slate-300 font-medium">Exporta o restaura toda la base de datos de tu inquilino en JSON o incorpora facturas masivas desde CSV.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CSV Import */}
              <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/25 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Importar CSV de Suministros</h3>
                    <p className="text-xs text-slate-300">Incorpora facturas masivas aplicando los % de reparto.</p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-cyan-500/40 rounded-2xl p-8 text-center space-y-3 bg-slate-950/60">
                  <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    Arrastra aquí tu archivo <strong>facturas_suministros.csv</strong> o selecciónalo de tu equipo:
                  </p>
                  <label className="cursor-pointer inline-block px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow transition-all">
                    Seleccionar Archivo CSV
                    <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Full JSON Backup */}
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/25 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Copia de Seguridad Integral (JSON)</h3>
                    <p className="text-xs text-slate-300">Guarda o restaura todo el histórico de recibos, inquilino y facturas.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleExportJson}
                    className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Descargar Copia de Seguridad JSON
                  </button>

                  <div className="border-t border-white/10 pt-4">
                    <label className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-cyan-400" /> Restaurar Copia JSON
                      <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ANALÍTICA AVANZADA & COMPARATIVA VISUAL DE SUMINISTROS */}
        {activeTab === 'analytics' && (() => {
          // Get data for selected analytics period
          const currentData = getMonthlyDataForYear(analyticsPeriod === 'L12M' ? 2026 : analyticsPeriod);
          const prevYearData = getMonthlyDataForYear(typeof analyticsPeriod === 'number' ? analyticsPeriod - 1 : 2025);

          const totalElec = currentData.reduce((s, m) => s + m.elecCost, 0);
          const totalWater = currentData.reduce((s, m) => s + m.waterCost, 0);
          const totalGas = currentData.reduce((s, m) => s + m.gasCost, 0);
          const totalRepairs = currentData.reduce((s, m) => s + m.fixedCost, 0);
          const totalSuppliesOverall = totalElec + totalWater + totalGas + totalRepairs;

          const elecPct = totalSuppliesOverall > 0 ? Math.round((totalElec / totalSuppliesOverall) * 100) : 55;
          const waterPct = totalSuppliesOverall > 0 ? Math.round((totalWater / totalSuppliesOverall) * 100) : 35;
          const gasRepairsPct = 100 - elecPct - waterPct;

          const prevTotalSupplies = prevYearData.reduce((s, m) => s + m.totalGasto, 0);
          const diffPct = prevTotalSupplies > 0 ? (((totalSuppliesOverall - prevTotalSupplies) / prevTotalSupplies) * 100).toFixed(1) : '0';

          // Chart data (ordered Ene -> Dic left to right)
          const chronologicalCurrent = [...currentData].reverse().slice(0, 12);
          const chronologicalPrev = [...prevYearData].reverse().slice(0, 12);

          const maxSupplyVal = Math.max(
            ...chronologicalCurrent.map(m => Math.max(m.elecCost, m.waterCost, m.totalGasto)),
            ...chronologicalPrev.map(m => m.totalGasto),
            120
          );

          // Speedometer Dial angle calculation (Efficiency level 0 to 100%)
          const efficiencyScore = Math.min(100, Math.max(10, Math.round(100 - (totalSuppliesOverall / (currentData.length * 150 || 1)) * 50)));
          // Needle rotation from -90deg to +90deg
          const needleDegree = -90 + (efficiencyScore / 100) * 180;

          return (
            <div className="space-y-8 animate-fadeIn">
              {/* Header and Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    <span className="w-3 h-8 bg-gradient-to-b from-fuchsia-500 via-indigo-500 to-cyan-400 rounded-full animate-pulse"></span>
                    6. Analítica Avanzada & Comparativa Visual
                  </h2>
                  <p className="text-sm text-slate-300 font-medium">
                    Panel futurista de diagnóstico, comparación multiaño y desviaciones de consumo de Luz, Agua y Suministros.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Period Filter Buttons */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-white/15 shadow-inner">
                    {[2026, 2025, 2024, 'ALL'].map(p => (
                      <button
                        key={p}
                        onClick={() => setAnalyticsPeriod(p as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          analyticsPeriod === p
                            ? 'bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-400 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {p === 'ALL' ? 'Todos' : p}
                      </button>
                    ))}
                  </div>

                  {/* Compare baseline selector */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-white/15 text-xs font-bold text-slate-300">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <select
                      value={analyticsCompareWith}
                      onChange={(e) => setAnalyticsCompareWith(e.target.value as any)}
                      className="bg-transparent text-white focus:outline-none cursor-pointer"
                    >
                      <option value="PREV_YEAR" className="bg-slate-900 text-white">vs Año Anterior</option>
                      <option value="AVERAGE" className="bg-slate-900 text-white">vs Promedio Histórico</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* GRID 1: Horizontal Glowing Progress Gauges + Speedometer Gauge Dial (Top section matching image) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Horizontal Glowing Bars (Gauges) matching image top-left */}
                <div className="lg:col-span-7 bg-slate-900/90 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl">
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Nivel de Carga & Indicadores de Consumo
                  </h3>

                  <div className="space-y-5">
                    {/* Gauge 01: Luz */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="font-mono text-fuchsia-400 text-sm">01</span> Consumo Medio Mensual de Luz
                        </span>
                        <span className="text-fuchsia-300 font-mono text-sm">{elecPct}%</span>
                      </div>
                      <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 shadow-inner overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-fuchsia-600 via-purple-500 to-amber-400 rounded-full transition-all duration-700 shadow-lg shadow-fuchsia-500/50"
                          style={{ width: `${elecPct}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-slate-400">Total en periodo: {totalElec.toFixed(2)} €</p>
                    </div>

                    {/* Gauge 02: Agua */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="font-mono text-cyan-400 text-sm">02</span> Consumo Medio Mensual de Agua
                        </span>
                        <span className="text-cyan-300 font-mono text-sm">{waterPct}%</span>
                      </div>
                      <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 shadow-inner overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 shadow-lg shadow-cyan-500/50"
                          style={{ width: `${waterPct}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-slate-400">Total en periodo: {totalWater.toFixed(2)} €</p>
                    </div>

                    {/* Gauge 03: Proporción Inquilino */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="font-mono text-emerald-400 text-sm">03</span> Proporción de Reparto (Luz {supplyRules.electricity}% / Agua {supplyRules.water}%)
                        </span>
                        <span className="text-emerald-300 font-mono text-sm">{supplyRules.electricity}%</span>
                      </div>
                      <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 shadow-inner overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-700 shadow-lg shadow-emerald-500/50"
                          style={{ width: `${supplyRules.electricity}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-slate-400">A cargo del arrendatario según contrato</p>
                    </div>

                    {/* Gauge 04: Eficiencia de Cobro */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold">
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="font-mono text-indigo-400 text-sm">04</span> Tasa de Liquidación de Recibos
                        </span>
                        <span className="text-indigo-300 font-mono text-sm">92%</span>
                      </div>
                      <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 shadow-inner overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 rounded-full transition-all duration-700 shadow-lg shadow-indigo-500/50"
                          style={{ width: '92%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Speedometer Radial Dial Gauge matching bottom-left of image */}
                <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      DIAL DE EFICIENCIA ENERGÉTICA
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      En Tiempo Real
                    </span>
                  </div>

                  {/* Speedometer Gauge Arc SVG */}
                  <div className="relative w-56 h-32 my-2 flex items-end justify-center">
                    <svg className="w-56 h-56 -rotate-90 transform" viewBox="0 0 100 100">
                      {/* Outer dashed arc track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="8"
                        strokeDasharray="188"
                        strokeDashoffset="94"
                      />
                      {/* Gradient colored arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#speedometerGradient)"
                        strokeWidth="8"
                        strokeDasharray="188"
                        strokeDashoffset={`${188 - (efficiencyScore / 100) * 94}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Needle */}
                    <div
                      className="absolute bottom-2 left-1/2 w-1 h-20 bg-gradient-to-t from-white to-cyan-400 rounded-full origin-bottom transition-transform duration-1000 shadow-xl"
                      style={{ transform: `translateX(-50%) rotate(${needleDegree}deg)` }}
                    ></div>
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-950 shadow-md"></div>
                  </div>

                  <div>
                    <span className="text-3xl font-mono font-black text-cyan-400 block">{efficiencyScore}%</span>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                      {efficiencyScore >= 75 ? '🟢 Consumo Eficiente & Bajo Impacto' : efficiencyScore >= 50 ? '🔵 Consumo Moderado Estándar' : '🔴 Alerta de Consumo Elevado'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Comparado con el histórico del piso</p>
                  </div>
                </div>
              </div>

              {/* GRID 2: Multi-Curve Bezier Chart (Wave Charts) matching top-center of image */}
              <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                      <TrendingUp className="w-5 h-5 text-fuchsia-400" /> ONDAS DE EVOLUCIÓN TEMPORAL COMPARATIVA
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Curvas de tendencia de gastos de Luz ({analyticsPeriod}) vs Agua ({analyticsPeriod}) vs Suministros Año Anterior ({typeof analyticsPeriod === 'number' ? analyticsPeriod - 1 : 2025}).
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-fuchsia-400">
                      <span className="w-3 h-3 rounded-full bg-fuchsia-500 shadow"></span> Luz ({analyticsPeriod})
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 shadow"></span> Agua ({analyticsPeriod})
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shadow"></span> Año Ant. ({typeof analyticsPeriod === 'number' ? analyticsPeriod - 1 : 2025})
                    </span>
                  </div>
                </div>

                {/* SVG Curve Wave Chart */}
                <div className="pt-4 pb-2 px-2 relative min-h-[220px]">
                  <svg className="w-full h-52 overflow-visible" viewBox="0 0 1200 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="elecCurveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d946ef" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#d946ef" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="waterCurveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[40, 80, 120, 160].map(y => (
                      <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke="#ffffff" strokeOpacity="0.07" strokeDasharray="4 4" />
                    ))}

                    {/* Luz Curve */}
                    {(() => {
                      const points = chronologicalCurrent.map((m, idx) => {
                        const x = (idx / 11) * 1150 + 25;
                        const y = 180 - (m.elecCost / maxSupplyVal) * 150;
                        return { x, y };
                      });
                      let pathD = `M ${points[0]?.x || 25} ${points[0]?.y || 150}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        pathD += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
                      }
                      pathD += ` T ${points[points.length - 1]?.x || 1175} ${points[points.length - 1]?.y || 150}`;

                      return (
                        <>
                          <path d={`${pathD} L 1175 190 L 25 190 Z`} fill="url(#elecCurveGrad)" />
                          <path d={pathD} fill="none" stroke="#d946ef" strokeWidth="3.5" strokeLinecap="round" />
                          {points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#f0abfc" stroke="#1e1b4b" strokeWidth="2" />
                          ))}
                        </>
                      );
                    })()}

                    {/* Agua Curve */}
                    {(() => {
                      const points = chronologicalCurrent.map((m, idx) => {
                        const x = (idx / 11) * 1150 + 25;
                        const y = 180 - (m.waterCost / maxSupplyVal) * 150;
                        return { x, y };
                      });
                      let pathD = `M ${points[0]?.x || 25} ${points[0]?.y || 160}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        pathD += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
                      }
                      pathD += ` T ${points[points.length - 1]?.x || 1175} ${points[points.length - 1]?.y || 160}`;

                      return (
                        <>
                          <path d={`${pathD} L 1175 190 L 25 190 Z`} fill="url(#waterCurveGrad)" />
                          <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="0" strokeLinecap="round" />
                          {points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#67e8f9" stroke="#083344" strokeWidth="2" />
                          ))}
                        </>
                      );
                    })()}

                    {/* Previous Year Total Curve */}
                    {(() => {
                      const points = chronologicalPrev.map((m, idx) => {
                        const x = (idx / 11) * 1150 + 25;
                        const y = 180 - (m.totalGasto / maxSupplyVal) * 150;
                        return { x, y };
                      });
                      let pathD = `M ${points[0]?.x || 25} ${points[0]?.y || 170}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        pathD += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
                      }
                      pathD += ` T ${points[points.length - 1]?.x || 1175} ${points[points.length - 1]?.y || 170}`;

                      return (
                        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" strokeOpacity="0.8" />
                      );
                    })()}
                  </svg>

                  {/* Month labels at bottom */}
                  <div className="flex justify-between text-[11px] font-bold text-slate-300 pt-2 border-t border-white/10">
                    {chronologicalCurrent.map(m => (
                      <span key={m.key} className="capitalize">
                        {m.monthName.split(' ')[0].substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* GRID 3: Doughnut Ring & Concentric Radial Ring Gauges matching middle section of image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Concentric Radial Ring Gauge matching middle-right of image */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl flex flex-col justify-between items-center text-center">
                  <div className="w-full flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      ANILLOS CONCÉNTRICOS DE DISTRIBUCIÓN
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/30">
                      Multicapa
                    </span>
                  </div>

                  {/* Concentric Rings Visual Component */}
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    <svg className="w-56 h-56 -rotate-90 transform" viewBox="0 0 100 100">
                      {/* Outer Ring: Luz */}
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="6" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#d946ef"
                        strokeWidth="6"
                        strokeDasharray="264"
                        strokeDashoffset={`${264 - (elecPct / 100) * 264}`}
                        strokeLinecap="round"
                      />

                      {/* Middle Ring: Agua */}
                      <circle cx="50" cy="50" r="32" fill="none" stroke="#1e293b" strokeWidth="6" />
                      <circle
                        cx="50"
                        cy="50"
                        r="32"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="6"
                        strokeDasharray="201"
                        strokeDashoffset={`${201 - (waterPct / 100) * 201}`}
                        strokeLinecap="round"
                      />

                      {/* Inner Ring: Averías/Gas */}
                      <circle cx="50" cy="50" r="22" fill="none" stroke="#1e293b" strokeWidth="6" />
                      <circle
                        cx="50"
                        cy="50"
                        r="22"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="6"
                        strokeDasharray="138"
                        strokeDashoffset={`${138 - (gasRepairsPct / 100) * 138}`}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Central Title */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-black tracking-widest text-slate-400 uppercase block">GASTOS</span>
                      <span className="text-base font-mono font-black text-white">{totalSuppliesOverall.toFixed(0)} €</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 w-full text-center text-xs font-bold">
                    <div className="p-2 bg-slate-950 rounded-xl border border-fuchsia-500/30">
                      <span className="text-fuchsia-400 block text-[11px]">⚡ Luz</span>
                      <span className="text-white font-mono">{elecPct}%</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-cyan-500/30">
                      <span className="text-cyan-400 block text-[11px]">💧 Agua</span>
                      <span className="text-white font-mono">{waterPct}%</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-amber-500/30">
                      <span className="text-amber-300 block text-[11px]">🛠️ Varios</span>
                      <span className="text-white font-mono">{gasRepairsPct}%</span>
                    </div>
                  </div>
                </div>

                {/* DIAGNÓSTICO EXPLICADO & COMPARATIVA ANUAL */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl flex flex-col justify-between">
                  <div className="border-b border-white/10 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> Diagnóstico Inteligente de Consumos
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-1">
                      <span className="font-extrabold text-emerald-400 block">✅ Estabilidad de Suministros</span>
                      <p className="text-slate-300">
                        El gasto total de suministros ha variado un <strong className="text-white">{diffPct}%</strong> respecto al periodo anterior ({prevTotalSupplies.toFixed(2)} €).
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-1">
                      <span className="font-extrabold text-amber-300 block">⚡ Picos Térmicos en Luz</span>
                      <p className="text-slate-300">
                        Los meses de verano (Julio/Agosto) muestran picos de consumo por climatización de hasta <strong className="text-amber-300">132.16 €/mes</strong> en factura completa.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-1">
                      <span className="font-extrabold text-cyan-300 block">💧 Recibos Bimestrales de Agua</span>
                      <p className="text-slate-300">
                        La facturación de agua llega cada 2 meses (aprox. <strong className="text-cyan-300">81.75 €</strong> total factura). Recuerda liquidarla en el recibo más cercano.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => window.print()}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 text-white font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Exportar Informe de Analítica en PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      {/* MODAL: VER DETALLE DEL RECIBO E IMPRIMIR PROFESIONAL */}
      {selectedReceiptForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full p-6 lg:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedReceiptForModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Receipt Paper View */}
            <div id="printable-receipt" className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-white/10 text-slate-100">
              <div className="flex justify-between items-start border-b border-white/15 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedReceiptForModal.title}</h3>
                  <p className="text-xs text-cyan-400 font-mono mt-0.5">Nº: {selectedReceiptForModal.receiptNumber}</p>
                  <p className="text-xs text-slate-400 mt-1">Fecha de emisión: {selectedReceiptForModal.issueDate}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    selectedReceiptForModal.status === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}>
                    {selectedReceiptForModal.status === 'PAID' ? 'COBRADO' : 'PENDIENTE'}
                  </span>
                  {selectedReceiptForModal.paidDate && (
                    <p className="text-[11px] text-slate-400 mt-1">Cobrado el: {selectedReceiptForModal.paidDate}</p>
                  )}
                </div>
              </div>

              {/* Inquilino info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/60 p-4 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Inquilino</span>
                  <span className="text-white font-bold">{tenant.name}</span>
                  <span className="block text-slate-400 font-mono">DNI: {tenant.dni}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Contacto</span>
                  <span className="text-white font-mono">{tenant.phone}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Desglose de Conceptos</span>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-slate-400 uppercase text-[10px]">
                      <th className="py-2">Concepto</th>
                      <th className="py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selectedReceiptForModal.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 text-slate-200">
                          <span className="font-bold block text-white">{it.description}</span>
                          {it.detail && <span className="text-[10px] text-slate-400">{it.detail}</span>}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-white">{it.amount.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Balances & Totals */}
              <div className="border-t border-white/15 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal conceptos:</span>
                  <span className="font-mono font-bold text-white">{selectedReceiptForModal.subtotalItems.toFixed(2)} €</span>
                </div>
                {selectedReceiptForModal.previousBalance !== 0 && (
                  <div className="flex justify-between text-cyan-300">
                    <span>Ajuste saldo liquidación anterior:</span>
                    <span className="font-mono font-bold">
                      {selectedReceiptForModal.previousBalance > 0 ? `+${selectedReceiptForModal.previousBalance.toFixed(2)}` : selectedReceiptForModal.previousBalance.toFixed(2)} €
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/15">
                  <span>TOTAL LIQUIDACIÓN:</span>
                  <span className="font-mono text-cyan-400 text-lg">{selectedReceiptForModal.totalAmount.toFixed(2)} €</span>
                </div>

                {selectedReceiptForModal.status === 'PAID' && (
                  <>
                    <div className="flex justify-between text-xs text-emerald-400 font-bold">
                      <span>Importe abonado por inquilino:</span>
                      <span className="font-mono">{selectedReceiptForModal.amountPaid.toFixed(2)} €</span>
                    </div>
                    {selectedReceiptForModal.remainingBalance !== 0 && (
                      <div className="flex justify-between text-xs text-amber-300 font-bold">
                        <span>Saldo remanente próximo recibo:</span>
                        <span className="font-mono">
                          {selectedReceiptForModal.remainingBalance > 0 ? `+${selectedReceiptForModal.remainingBalance.toFixed(2)} € (deuda)` : `${selectedReceiptForModal.remainingBalance.toFixed(2)} € (a favor)`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Explanatory Note */}
              {selectedReceiptForModal.explanationNote && (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                  {selectedReceiptForModal.explanationNote}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={() => copyToClipboard(selectedReceiptForModal.explanationNote)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Copiar para WhatsApp
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/15 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI OCR SCANNER (AGUA / LUZ) */}
      {aiModalType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-xl w-full p-6 lg:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => {
                setAiModalType(null);
                setRawAiInput('');
                setUploadedPdfBase64(null);
                setUploadedPdfInfo(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Auditor de Factura de {aiModalType === 'WATER' ? 'Agua (EMUASA / Canal)' : 'Luz (Iberdrola / Endesa)'}
                </h3>
                <p className="text-xs text-slate-300">
                  Aplica el prompt auditor oficial para desglosar importes y repartir el {aiModalType === 'WATER' ? supplyRules.water : supplyRules.electricity}% al inquilino.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Quick Sample Loaders with Direct Real PDF Bytes */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Carga Rápida de Factura Real PDF Oficial:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">1 clic para probar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiModalType === 'ELECTRICITY' ? (
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => handleLoadSamplePdf('ELECTRICITY')}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 shadow-sm"
                    >
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="block font-black text-white">Factura Real Repsol PDF (103,33 €)</span>
                        <span className="text-[10px] text-amber-300/80 font-normal">415 kWh • 0,10115 €/kWh • Tu Asistente 24h</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => handleLoadSamplePdf('WATER')}
                      className="px-3.5 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 shadow-sm"
                    >
                      <Droplet className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="block font-black text-white">Factura Real EMUASA PDF (83,57 €)</span>
                        <span className="text-[10px] text-cyan-300/80 font-normal">17 m³ • Basura 28,35€ • Canon 11,10€</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* PDF & File Drag & Drop Zone */}
              <div className="space-y-2">
                <label className="text-xs text-slate-200 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Subir Factura en formato PDF (o imagen / foto):
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">PDF oficial, JPG, PNG</span>
                </label>

                {uploadedPdfInfo ? (
                  /* Loaded File Card */
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-xs shrink-0 font-mono">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-xs md:max-w-md">
                          {uploadedPdfInfo.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{(uploadedPdfInfo.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Archivo PDF listo para procesar
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPdfBase64(null);
                        setUploadedPdfInfo(null);
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors shrink-0 ml-2"
                      title="Quitar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Dropzone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPdf(true);
                    }}
                    onDragLeave={() => setIsDraggingPdf(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPdf(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      isDraggingPdf
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                        : 'border-white/20 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950/90'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Arrastra aquí tu factura en <span className="text-cyan-400 font-black">PDF</span> o pulsa para examinar
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Compatible con Repsol, Iberdrola, Endesa, EMUASA, Canal Isabel II, Agbar
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Manual OCR Textarea */}
              <div className="space-y-1">
                <details className="text-xs text-slate-400 group">
                  <summary className="cursor-pointer font-bold hover:text-white transition-colors py-1 flex items-center gap-1.5 select-none">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-cyan-400" />
                    <span>Pegar texto o desglose manual (opcional si ya subiste el PDF)</span>
                  </summary>
                  <div className="mt-2">
                    <textarea
                      rows={4}
                      placeholder="Si no tienes el archivo PDF, puedes pegar aquí el texto de la factura..."
                      value={rawAiInput}
                      onChange={(e) => setRawAiInput(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </details>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isScanning || (!uploadedPdfBase64 && !rawAiInput.trim())}
                onClick={() => handleScanBill(aiModalType)}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Procesando PDF y Extrayendo Conceptos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>PROCESAR FACTURA EN PDF Y AUDITAR TARIFA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ALERTA Y RESULTADO DE AUDITORÍA INTELIGENTE TRAS ESCANEO */}
      {auditedBillPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 lg:p-8 space-y-6 shadow-2xl relative animate-scaleUp max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAuditedBillPreview(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg text-slate-950">
                {auditedBillPreview.type === 'ELECTRICITY' ? <Zap className="w-6 h-6" /> : <Droplet className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block font-bold">
                  Auditoría Energética & Tarifaria Gemini 3.8 Flash
                </span>
                <h3 className="text-xl font-black text-white">
                  Informe de Auditoría: {auditedBillPreview.expense.company}
                </h3>
              </div>
            </div>

            {/* Glowing Alert Banners */}
            <div className="space-y-3">
              {auditedBillPreview.type === 'ELECTRICITY' && auditedBillPreview.priceDiffPct !== undefined && (
                <div>
                  {auditedBillPreview.priceDiffPct < 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-start gap-3">
                      <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-emerald-300">
                          📉 ¡BAJADA DE PRECIO DETECTADA! (-{Math.abs(auditedBillPreview.priceDiffPct)}%)
                        </h4>
                        <p className="text-xs text-slate-200 mt-1">
                          El precio de la energía ha bajado de{' '}
                          <span className="font-mono font-bold text-white">{auditedBillPreview.prevUnitPrice?.toFixed(6)} €/kWh</span> a{' '}
                          <span className="font-mono font-black text-emerald-300">{(auditedBillPreview.expense as ElectricityExpense).unitPrice.toFixed(6)} €/kWh</span>.
                          Esto supone un ahorro directo en el término de consumo.
                        </p>
                      </div>
                    </div>
                  ) : auditedBillPreview.priceDiffPct > 0 ? (
                    <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-red-300">
                          ⚠️ ALERTA DE SUBIDA DE TARIFA (+{auditedBillPreview.priceDiffPct}%)
                        </h4>
                        <p className="text-xs text-slate-200 mt-1">
                          El coste por kWh ha aumentado de{' '}
                          <span className="font-mono font-bold text-white">{auditedBillPreview.prevUnitPrice?.toFixed(6)} €</span> a{' '}
                          <span className="font-mono font-black text-red-300">{(auditedBillPreview.expense as ElectricityExpense).unitPrice.toFixed(6)} €</span>.
                          Comprueba si ha vencido la promoción anual o cambio de condiciones.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Extra Services Alert (Tu Asistente 24h) */}
              {auditedBillPreview.extraServiceWarning && (
                <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-amber-300">
                      🚨 COBRO NO ESENCIAL DETECTADO: {auditedBillPreview.extraServiceWarning}
                    </h4>
                    <p className="text-xs text-slate-200 mt-1">
                      Este servicio corresponde a seguros o asistencias de la comercializadora (Repsol), no a consumo ni a peajes de red. Puedes llamar y solicitar la baja para ahorrar ~48,72 € al año.
                    </p>
                  </div>
                </div>
              )}

              {/* Water Municipal Taxes Alert */}
              {auditedBillPreview.type === 'WATER' && (
                <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-cyan-300">
                      🏛️ DESGLOSE DE TASAS MUNICIPALES (EMUASA)
                    </h4>
                    <p className="text-xs text-slate-200 mt-1">
                      Tasa de Basura del Ayuntamiento de Murcia: <span className="font-mono font-bold text-white">28,35 €</span> (33,9% de la factura) + Canon de Saneamiento Autonómico ESAMUR: <span className="font-mono font-bold text-white">11,10 €</span>. Las tasas públicas representan casi la mitad del recibo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary Card */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Periodo</span>
                  <span className="text-white font-mono font-bold">{auditedBillPreview.expense.periodRange || auditedBillPreview.expense.chargeDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Factura</span>
                  <span className="text-white font-mono font-bold">{(auditedBillPreview.expense.fullInvoiceTotal || auditedBillPreview.expense.totalAmount * 2).toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Parte Inquilino</span>
                  <span className="text-emerald-400 font-mono font-black">{auditedBillPreview.expense.totalAmount.toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Consumo Registrado</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {auditedBillPreview.type === 'ELECTRICITY' 
                      ? `${(auditedBillPreview.expense as ElectricityExpense).kwhConsumed} kWh` 
                      : `${(auditedBillPreview.expense as WaterExpense).m3Consumed} m³`}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setAuditedBillPreview(null);
                  setActiveTab('expenses');
                  setExpensesSubTab(auditedBillPreview.type === 'ELECTRICITY' ? 'audit_elec' : 'audit_water');
                }}
                className="w-full sm:w-auto flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Aceptar e Incorporar a la Auditoría
              </button>
              <button
                onClick={() => {
                  addSupplyToCurrentDraft(auditedBillPreview.type, auditedBillPreview.expense.id);
                  setAuditedBillPreview(null);
                  setActiveTab('billing');
                  setBillingSubTab('4.1_builder');
                }}
                className="w-full sm:w-auto py-3 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Añadir Directamente a Recibo Borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECTOR TÉCNICO DE AUDITORÍA DETALLADA */}
      {viewingAuditExpense && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full p-6 lg:p-8 space-y-6 shadow-2xl relative animate-scaleUp max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingAuditExpense(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg font-black text-slate-950 ${
                viewingAuditExpense.utilityType === 'ELECTRICITY' ? 'bg-amber-400' : 'bg-cyan-400'
              }`}>
                {viewingAuditExpense.utilityType === 'ELECTRICITY' ? <Zap className="w-6 h-6" /> : <Droplet className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                  Dossier Técnico de Factura
                </span>
                <h3 className="text-xl font-black text-white">
                  {viewingAuditExpense.company} • Fact: {viewingAuditExpense.invoiceNumber}
                </h3>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Periodo</span>
                <span className="text-white font-mono font-bold">{viewingAuditExpense.periodRange || viewingAuditExpense.chargeDate}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Fecha de Cargo</span>
                <span className="text-white font-mono">{viewingAuditExpense.chargeDate}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Días Facturados</span>
                <span className="text-white font-mono">{viewingAuditExpense.billingDays || (viewingAuditExpense.utilityType === 'ELECTRICITY' ? 30 : 60)} días</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Factura Completa</span>
                <span className="text-white font-mono font-bold text-sm">{(viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2).toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">A Cargo Inquilino</span>
                <span className="text-emerald-400 font-mono font-black text-sm">{viewingAuditExpense.totalAmount.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Coste Diario</span>
                <span className="text-slate-300 font-mono">
                  {viewingAuditExpense.costPerDay 
                    ? `${viewingAuditExpense.costPerDay.toFixed(3)} €/día` 
                    : `${((viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2) / (viewingAuditExpense.billingDays || 30)).toFixed(3)} €/día`}
                </span>
              </div>
            </div>

            {/* Electricity specific breakdown */}
            {viewingAuditExpense.utilityType === 'ELECTRICITY' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Desglose Energético Repsol
                </h4>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Precio kWh Contratado:</span>
                    <span className="font-mono font-black text-amber-300 text-sm">{(viewingAuditExpense as ElectricityExpense).unitPrice.toFixed(6)} €/kWh</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Potencia Contratada:</span>
                    <span className="font-mono text-white">{(viewingAuditExpense as ElectricityExpense).contractedPower || '6,900 kW'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Término Fijo de Potencia:</span>
                    <span className="font-mono text-white">{((viewingAuditExpense as ElectricityExpense).fixedTermCost || 33.92).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Consumo Total:</span>
                    <span className="font-mono text-white">{(viewingAuditExpense as ElectricityExpense).kwhConsumed} kWh</span>
                  </div>
                  {(viewingAuditExpense as ElectricityExpense).hourlyTiers && (
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-300">Tramos Punta / Llano / Valle:</span>
                      <span className="font-mono text-purple-300">
                        {(viewingAuditExpense as ElectricityExpense).hourlyTiers?.puntaKwh || 0}P / {(viewingAuditExpense as ElectricityExpense).hourlyTiers?.llanoKwh || 0}Ll / {(viewingAuditExpense as ElectricityExpense).hourlyTiers?.valleKwh || 0}V
                      </span>
                    </div>
                  )}
                  {(viewingAuditExpense as ElectricityExpense).extraServicesCost ? (
                    <div className="flex justify-between items-center py-1 bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {(viewingAuditExpense as ElectricityExpense).extraServicesName || 'Tu Asistente 24h'}
                      </span>
                      <span className="font-mono font-black text-amber-300">
                        {((viewingAuditExpense as ElectricityExpense).extraServicesCost || 0).toFixed(2)} €
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Water specific breakdown */}
            {viewingAuditExpense.utilityType === 'WATER' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Droplet className="w-3.5 h-3.5" /> Desglose Tarifario y Municipal EMUASA
                </h4>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Cuota Servicio Abastecimiento:</span>
                    <span className="font-mono text-white">{((viewingAuditExpense as WaterExpense).breakdown?.waterService || 13.80).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Consumo Variable de Agua:</span>
                    <span className="font-mono text-white">{((viewingAuditExpense as WaterExpense).breakdown?.waterConsumption || 15.90).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5 bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                    <span className="text-amber-300 font-bold">Tasa de Basuras (Ayuntamiento de Murcia):</span>
                    <span className="font-mono font-black text-amber-300">{((viewingAuditExpense as WaterExpense).breakdown?.wasteCollection || 28.35).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-300">Canon de Saneamiento (ESAMUR):</span>
                    <span className="font-mono text-white">{((viewingAuditExpense as WaterExpense).breakdown?.sanitationCanon || 11.10).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-300">Alcantarillado & Contador:</span>
                    <span className="font-mono text-white">
                      {(((viewingAuditExpense as WaterExpense).breakdown?.sewerage || 8.58) + ((viewingAuditExpense as WaterExpense).breakdown?.meterConservation || 0.67)).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp explanation copy */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Texto Explicativo para Inquilino (WhatsApp):
              </span>
              <p className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded-xl border border-white/5">
                {viewingAuditExpense.utilityType === 'ELECTRICITY'
                  ? `Factura de luz ${viewingAuditExpense.company} del periodo ${viewingAuditExpense.periodRange || viewingAuditExpense.chargeDate}: Consumo de ${(viewingAuditExpense as ElectricityExpense).kwhConsumed} kWh a ${(viewingAuditExpense as ElectricityExpense).unitPrice.toFixed(5)} €/kWh. Total factura: ${(viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2).toFixed(2)} €. Cuota inquilino (${supplyRules.electricity}%): ${viewingAuditExpense.totalAmount.toFixed(2)} €.`
                  : `Factura de agua ${viewingAuditExpense.company} del periodo ${viewingAuditExpense.periodRange || viewingAuditExpense.chargeDate}: Consumo ${(viewingAuditExpense as WaterExpense).m3Consumed} m³ más tasas municipales de basura (${((viewingAuditExpense as WaterExpense).breakdown?.wasteCollection || 28.35).toFixed(2)}€) y canon de saneamiento (${((viewingAuditExpense as WaterExpense).breakdown?.sanitationCanon || 11.10).toFixed(2)}€). Total factura: ${(viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2).toFixed(2)} €. Cuota inquilino (${supplyRules.water}%): ${viewingAuditExpense.totalAmount.toFixed(2)} €.`}
              </p>
              <button
                onClick={() => {
                  const text = viewingAuditExpense.utilityType === 'ELECTRICITY'
                    ? `Factura de luz ${viewingAuditExpense.company} del periodo ${viewingAuditExpense.periodRange || viewingAuditExpense.chargeDate}: Consumo de ${(viewingAuditExpense as ElectricityExpense).kwhConsumed} kWh a ${(viewingAuditExpense as ElectricityExpense).unitPrice.toFixed(5)} €/kWh. Total factura: ${(viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2).toFixed(2)} €. Cuota inquilino (${supplyRules.electricity}%): ${viewingAuditExpense.totalAmount.toFixed(2)} €.`
                    : `Factura de agua ${viewingAuditExpense.company} del periodo ${viewingAuditExpense.periodRange || viewingAuditExpense.chargeDate}: Consumo ${(viewingAuditExpense as WaterExpense).m3Consumed} m³ más tasas municipales de basura (${((viewingAuditExpense as WaterExpense).breakdown?.wasteCollection || 28.35).toFixed(2)}€) y canon de saneamiento (${((viewingAuditExpense as WaterExpense).breakdown?.sanitationCanon || 11.10).toFixed(2)}€). Total factura: ${(viewingAuditExpense.fullInvoiceTotal || viewingAuditExpense.totalAmount * 2).toFixed(2)} €. Cuota inquilino (${supplyRules.water}%): ${viewingAuditExpense.totalAmount.toFixed(2)} €.`;
                  copyToClipboard(text);
                }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Explicación para WhatsApp
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingAuditExpense(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARGAR MES EN HISTORIAL (AÑOS ANTERIORES) */}
      {isAddHistoricalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddHistoricalModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">+ CARGAR MES EN HISTORIAL</h3>
                <p className="text-xs text-slate-300">Añade datos de rentas y suministros para años anteriores (2025, 2024, 2023, 2022, 2021).</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const yr = Number(histFormYear);
              const mNum = Number(histFormMonthNum);
              const monthKey = `${yr}-${String(mNum).padStart(2, '0')}`;
              const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              const monthName = `${monthNamesEs[mNum - 1]} ${yr}`;

              const newEntry: CustomHistoricalEntry = {
                id: 'h_' + Date.now(),
                year: yr,
                monthKey,
                monthName,
                tenantName: tenant.name,
                rentAmount: parseFloat(histFormRent) || 0,
                elecCost: parseFloat(histFormElec) || 0,
                waterCost: parseFloat(histFormWater) || 0,
                gasCost: parseFloat(histFormGas) || 0,
                repairsCost: parseFloat(histFormRepairs) || 0,
                status: histFormStatus
              };

              const filtered = customHistoricalEntries.filter(c => c.monthKey !== monthKey);
              setCustomHistoricalEntries([newEntry, ...filtered]);
              setIsAddHistoricalModalOpen(false);
              setSelectedHistoricalYear(yr);
              alert(`¡Mes de ${monthName} cargado correctamente en el historial!`);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Año</label>
                  <select
                    value={histFormYear}
                    onChange={(e) => setHistFormYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Mes</label>
                  <select
                    value={histFormMonthNum}
                    onChange={(e) => setHistFormMonthNum(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Renta (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={histFormRent}
                    onChange={(e) => setHistFormRent(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Luz (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={histFormElec}
                    onChange={(e) => setHistFormElec(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Agua (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={histFormWater}
                    onChange={(e) => setHistFormWater(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Gas (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={histFormGas}
                    onChange={(e) => setHistFormGas(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Averías (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={histFormRepairs}
                    onChange={(e) => setHistFormRepairs(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Estado de Cobro</label>
                <select
                  value={histFormStatus}
                  onChange={(e) => setHistFormStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 font-bold"
                >
                  <option value="PAID">🟢 COBRADO</option>
                  <option value="PENDING">🟡 PENDIENTE</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  GUARDAR E INCORPORAR AL HISTORIAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
