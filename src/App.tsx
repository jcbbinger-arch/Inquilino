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
  Info
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
  chargeDate: string;
  receptionDate: string; // YYYY-MM-DD
  periodStartDate: string;
  periodEndDate: string;
  periodRange: string;
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
  alarm: {
    hasAlarm: boolean;
    reason: string;
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
  chargeDate: string;
  receptionDate: string; // YYYY-MM-DD
  periodStartDate: string;
  periodEndDate: string;
  periodRange: string;
  totalAmount: number; // Parte del inquilino
  fullInvoiceTotal?: number; // Total de la factura completa
  kwhConsumed: number;
  unitPrice: number;
  contractedPower: string;
  topGas: string;
  alarm: {
    hasAlarm: boolean;
    reason: string;
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'months' | 'expenses' | 'billing' | 'desglose' | 'stats' | 'backup'>('tenant');
  const [expensesSubTab, setExpensesSubTab] = useState<'summary' | 'water' | 'electricity' | 'other'>('summary');
  const [billingSubTab, setBillingSubTab] = useState<'4.1_builder' | '4.2_receipts' | '4.3_history' | '4.4_stats'>('4.1_builder');
  const [filterExpenseStatus, setFilterExpenseStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

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

  // Water expenses
  const [waterExpenses, setWaterExpenses] = useState<WaterExpense[]>(() => {
    const saved = localStorage.getItem('inquilinopro_water');
    return saved ? JSON.parse(saved) : [
      { id: 'w_jan', utilityType: 'WATER', company: 'EMUASA', invoiceNumber: 'W-01', chargeDate: '2026-01-12', receptionDate: '2026-01-12', periodStartDate: '2025-11-01', periodEndDate: '2026-01-01', periodRange: '11/01/2026 - 11/03/2026', totalAmount: 81.75, fullInvoiceTotal: 163.50, m3Consumed: 12, unitPrice: 1.8, contractedPower: '15mm', breakdown: { waterService: 20, waterConsumption: 25, meterConservation: 1, sewerage: 15, wasteCollection: 15, sanitationCanon: 3, taxes: 2.75 }, alarm: { hasAlarm: false, reason: '' }, notes: '', status: 'PAID' },
      { id: 'w_mar', utilityType: 'WATER', company: 'EMUASA', invoiceNumber: 'W-03', chargeDate: '2026-03-11', receptionDate: '2026-03-11', periodStartDate: '2026-01-01', periodEndDate: '2026-03-01', periodRange: '11/03/2026 - 11/05/2026', totalAmount: 81.75, fullInvoiceTotal: 163.50, m3Consumed: 12, unitPrice: 1.8, contractedPower: '15mm', breakdown: { waterService: 20, waterConsumption: 25, meterConservation: 1, sewerage: 15, wasteCollection: 15, sanitationCanon: 3, taxes: 2.75 }, alarm: { hasAlarm: false, reason: '' }, notes: '', status: 'PAID' },
      { id: 'w_jul', utilityType: 'WATER', company: 'EMUASA', invoiceNumber: 'W-07', chargeDate: '2026-07-13', receptionDate: '2026-07-13', periodStartDate: '2026-05-01', periodEndDate: '2026-07-01', periodRange: '10/07/2026 - 08/09/2026', totalAmount: 41.78, fullInvoiceTotal: 83.57, m3Consumed: 13, unitPrice: 1.8, contractedPower: '15mm', breakdown: { waterService: 20, waterConsumption: 27, meterConservation: 1, sewerage: 15, wasteCollection: 15, sanitationCanon: 3, taxes: 3.48 }, alarm: { hasAlarm: false, reason: '' }, notes: 'Bimestral', status: 'PENDING' },
    ];
  });

  // Electricity expenses
  const [electricityExpenses, setElectricityExpenses] = useState<ElectricityExpense[]>(() => {
    const saved = localStorage.getItem('inquilinopro_elec');
    return saved ? JSON.parse(saved) : [
      { id: 'e_01', utilityType: 'ELECTRICITY', company: 'Iberdrola', invoiceNumber: 'E-01', chargeDate: '2026-09-29', receptionDate: '2026-09-29', periodStartDate: '2026-08-24', periodEndDate: '2026-09-24', periodRange: '24/09/2026 - 24/10/2026', totalAmount: 51.66, fullInvoiceTotal: 103.33, kwhConsumed: 280, unitPrice: 0.14, contractedPower: '4.6kW', topGas: 'No', alarm: { hasAlarm: false, reason: '' }, notes: 'Mensual', status: 'PENDING' },
      { id: 'e_02', utilityType: 'ELECTRICITY', company: 'Iberdrola', invoiceNumber: 'E-02', chargeDate: '2026-08-27', receptionDate: '2026-08-27', periodStartDate: '2026-07-24', periodEndDate: '2026-08-24', periodRange: '24/08/2026 - 24/09/2026', totalAmount: 66.08, fullInvoiceTotal: 132.16, kwhConsumed: 450, unitPrice: 0.14, contractedPower: '4.6kW', topGas: 'No', alarm: { hasAlarm: false, reason: '' }, notes: 'Mensual', status: 'PENDING' },
      { id: 'e_03', utilityType: 'ELECTRICITY', company: 'Iberdrola', invoiceNumber: 'E-03', chargeDate: '2026-07-27', receptionDate: '2026-07-27', periodStartDate: '2026-06-24', periodEndDate: '2026-07-24', periodRange: '24/07/2026 - 24/08/2026', totalAmount: 52.59, fullInvoiceTotal: 105.19, kwhConsumed: 340, unitPrice: 0.14, contractedPower: '4.6kW', topGas: 'No', alarm: { hasAlarm: false, reason: '' }, notes: 'Mensual', status: 'PAID' },
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

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('inquilinopro_tenant', JSON.stringify(tenant));
    localStorage.setItem('inquilinopro_advances', JSON.stringify(advances));
    localStorage.setItem('inquilinopro_rents', JSON.stringify(rentRates));
    localStorage.setItem('inquilinopro_supply_rules', JSON.stringify(supplyRules));
    localStorage.setItem('inquilinopro_water', JSON.stringify(waterExpenses));
    localStorage.setItem('inquilinopro_elec', JSON.stringify(electricityExpenses));
    localStorage.setItem('inquilinopro_other', JSON.stringify(otherExpenses));
    localStorage.setItem('inquilinopro_receipts', JSON.stringify(receipts));
    localStorage.setItem('inquilinopro_tenant_balance', tenantAccumulatedBalance.toString());
  }, [tenant, advances, rentRates, supplyRules, waterExpenses, electricityExpenses, otherExpenses, receipts, tenantAccumulatedBalance]);

  // AI Modal State
  const [isScanning, setIsScanning] = useState(false);
  const [aiModalType, setAiModalType] = useState<'WATER' | 'ELECTRICITY' | null>(null);
  const [rawAiInput, setRawAiInput] = useState('');
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);

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
    return list;
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

  // AI OCR Bill Parsing
  const handleScanBill = async (type: 'WATER' | 'ELECTRICITY') => {
    if (!rawAiInput && !aiImageBase64) {
      alert('Por favor, pega el texto de la factura o sube una imagen.');
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
          image: aiImageBase64,
          mimeType: 'image/jpeg'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar con IA');

      if (type === 'WATER') {
        const splitPct = supplyRules.water / 100;
        const total = Number(data.totalAmount) || 0;
        const tenantShare = Math.round(total * splitPct * 100) / 100;

        const newWater: WaterExpense = {
          id: 'w_' + Date.now(),
          utilityType: 'WATER',
          company: data.company || 'Empresa de Agua',
          invoiceNumber: data.invoiceNumber || 'S/N',
          chargeDate: data.chargeDate || new Date().toLocaleDateString('es-ES'),
          receptionDate: data.receptionDate || new Date().toISOString().split('T')[0],
          periodStartDate: data.periodStartDate || '',
          periodEndDate: data.periodEndDate || '',
          periodRange: data.periodRange || 'Reciente',
          totalAmount: tenantShare,
          fullInvoiceTotal: total,
          m3Consumed: Number(data.m3Consumed) || 0,
          unitPrice: Number(data.unitPrice) || 0,
          contractedPower: data.contractedPower || '',
          breakdown: data.breakdown || {
            waterService: 0,
            waterConsumption: 0,
            meterConservation: 0,
            sewerage: 0,
            wasteCollection: 0,
            sanitationCanon: 0,
            taxes: 0
          },
          alarm: data.alarm || { hasAlarm: false, reason: '' },
          notes: `${data.notes || ''} (Factura total: ${total}€, aplicado ${supplyRules.water}%)`,
          status: 'PENDING'
        };
        setWaterExpenses([newWater, ...waterExpenses]);
      } else {
        const splitPct = supplyRules.electricity / 100;
        const total = Number(data.totalAmount) || 0;
        const tenantShare = Math.round(total * splitPct * 100) / 100;

        const newElec: ElectricityExpense = {
          id: 'e_' + Date.now(),
          utilityType: 'ELECTRICITY',
          company: data.company || 'Comercializadora Eléctrica',
          invoiceNumber: data.invoiceNumber || 'S/N',
          chargeDate: data.chargeDate || new Date().toLocaleDateString('es-ES'),
          receptionDate: data.receptionDate || new Date().toISOString().split('T')[0],
          periodStartDate: data.periodStartDate || '',
          periodEndDate: data.periodEndDate || '',
          periodRange: data.periodRange || 'Reciente',
          totalAmount: tenantShare,
          fullInvoiceTotal: total,
          kwhConsumed: Number(data.kwhConsumed) || 0,
          unitPrice: Number(data.unitPrice) || 0,
          contractedPower: data.contractedPower || '',
          topGas: data.topGas || 'No',
          alarm: data.alarm || { hasAlarm: false, reason: '' },
          notes: `${data.notes || ''} (Factura total: ${total}€, aplicado ${supplyRules.electricity}%)`,
          status: 'PENDING'
        };
        setElectricityExpenses([newElec, ...electricityExpenses]);
      }

      setAiModalType(null);
      setRawAiInput('');
      setAiImageBase64(null);
      alert('¡Factura digitalizada y añadida en estado PENDIENTE! Puedes incorporarla a un recibo en la sección 4.');
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

  const totalSuppliesInq = allSupplies.reduce((acc, s) => acc + s.totalAmount, 0);

  // 2026 Breakdown Months
  const months2026 = [
    { name: 'Enero 2026', key: '2026-01' },
    { name: 'Febrero 2026', key: '2026-02' },
    { name: 'Marzo 2026', key: '2026-03' },
    { name: 'Abril 2026', key: '2026-04' },
    { name: 'Mayo 2026', key: '2026-05' },
    { name: 'Junio 2026', key: '2026-06' },
    { name: 'Julio 2026', key: '2026-07' },
    { name: 'Agosto 2026', key: '2026-08' },
    { name: 'Septiembre 2026', key: '2026-09' },
    { name: 'Octubre 2026', key: '2026-10' },
    { name: 'Noviembre 2026', key: '2026-11' },
    { name: 'Diciembre 2026', key: '2026-12' },
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
                  {rentRates.map((r, idx) => (
                    <div key={r.id} className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Desde: {r.startDate}</span>
                          {idx === rentRates.length - 1 && (
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
            {/* Header with Title and Assistant IA Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  <span className="w-3 h-8 bg-gradient-to-b from-amber-500 to-cyan-500 rounded-full"></span>
                  3. Gastos y Suministros (Agua, Luz y Varios)
                </h2>
                <p className="text-sm text-slate-300 font-medium">Control de facturas con semáforo de estado (🟢 Cobrado / 🟡 Pendiente) para liquidar en recibos.</p>
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
                <span className="text-base font-mono font-black text-emerald-400">{totalSuppliesInq.toFixed(2)} €</span>
              </div>
            </div>

            {/* MASTER SUMMARY TABLE MATCHING USER SCREENSHOT */}
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

            {/* Other Expenses section */}
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
                          {waterExpenses.filter(w => w.status === 'PENDING').map(w => {
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
                          {electricityExpenses.filter(e => e.status === 'PENDING').map(e => {
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
                    {receipts.map((rec) => {
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
                          receipts.filter(r => r.status === 'PAID').map((rec) => (
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

        {/* TAB 4.5: DESGLOSE MENSUAL DETALLADO (2026) */}
        {activeTab === 'desglose' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-full"></span>
                DESGLOSE MENSUAL DETALLADO (2026)
              </h2>
              <p className="text-sm text-slate-300 font-medium">Registro mes a mes de rentas cobradas, suministros, gastos fijos y balance neto.</p>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-xs font-extrabold text-cyan-300 uppercase tracking-wider bg-slate-950/70">
                      <th className="py-4 px-6">Mes</th>
                      <th className="py-4 px-6">Inquilino</th>
                      <th className="py-4 px-6">Renta (€)</th>
                      <th className="py-4 px-6">Luz (€)</th>
                      <th className="py-4 px-6">Agua (€)</th>
                      <th className="py-4 px-6">Fijos / Averías</th>
                      <th className="py-4 px-6">Total Ingreso</th>
                      <th className="py-4 px-6">Total Gasto</th>
                      <th className="py-4 px-6">Beneficio Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm font-medium">
                    {months2026.map((m) => {
                      const rent = getCurrentRentForMonth(m.key);
                      const waterMatch = waterExpenses.find(w => w.chargeDate.startsWith(m.key) || w.receptionDate.startsWith(m.key) || w.periodRange.includes(m.key));
                      const elecMatch = electricityExpenses.find(e => e.chargeDate.startsWith(m.key) || e.receptionDate.startsWith(m.key) || e.periodRange.includes(m.key));
                      
                      const waterCost = waterMatch ? waterMatch.totalAmount : 0;
                      const elecCost = elecMatch ? elecMatch.totalAmount : 0;
                      const fixedCost = 0;

                      const totalIngreso = rent;
                      const totalGasto = elecCost + waterCost + fixedCost;
                      const beneficioNeto = totalIngreso - totalGasto;

                      return (
                        <tr key={m.key} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-white">{m.name}</td>
                          <td className="py-4 px-6 text-slate-200">{tenant.name}</td>
                          <td className="py-4 px-6 font-mono font-bold text-emerald-400 tabular-nums">
                            {rent.toFixed(2)} €
                            <span className="block text-[10px] font-extrabold text-emerald-500">LIQUIDADA</span>
                          </td>
                          <td className="py-4 px-6 font-mono text-amber-300 tabular-nums">
                            {elecCost > 0 ? (
                              <>
                                {elecCost.toFixed(2)} €
                                <span className={`block text-[10px] font-extrabold ${elecMatch?.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {elecMatch?.status === 'PAID' ? 'LIQUIDADA' : 'PENDIENTE'}
                                </span>
                              </>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-6 font-mono text-cyan-300 tabular-nums">
                            {waterCost > 0 ? (
                              <>
                                {waterCost.toFixed(2)} €
                                <span className={`block text-[10px] font-extrabold ${waterMatch?.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {waterMatch?.status === 'PAID' ? 'LIQUIDADA' : 'PENDIENTE'}
                                </span>
                              </>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-400 tabular-nums">-</td>
                          <td className="py-4 px-6 font-mono font-bold text-white tabular-nums">
                            {totalIngreso.toFixed(2)} €
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-red-400 tabular-nums">
                            {totalGasto.toFixed(2)} €
                          </td>
                          <td className="py-4 px-6 font-mono font-black text-cyan-400 text-base tabular-nums">
                            {beneficioNeto.toFixed(2)} €
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
                setAiImageBase64(null);
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

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  1. Pegar texto de la factura o desglose OCR:
                </label>
                <textarea
                  rows={5}
                  placeholder="Pega aquí el texto copiado de la factura en PDF o imagen..."
                  value={rawAiInput}
                  onChange={(e) => setRawAiInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  2. O subir imagen de la factura (JPG / PNG):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64String = (reader.result as string).split(',')[1];
                        setAiImageBase64(base64String);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-cyan-600 file:text-slate-950 hover:file:bg-cyan-500 cursor-pointer"
                />
              </div>

              <button
                disabled={isScanning}
                onClick={() => handleScanBill(aiModalType)}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Auditando y extrayendo conceptos con Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Procesar y Agregar a Gastos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
