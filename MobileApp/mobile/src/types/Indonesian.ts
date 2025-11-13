// Indonesian Market-Specific Types

// SAK ETAP (Standar Akuntansi Keuangan - Entitas Tanpa Akuntabilitas Publik)
export interface SAKETAPAccount {
  id: string;
  code: string;
  name: string;
  nameIndonesian: string;
  category: SAKETAPCategory;
  subcategory: string;
  isActive: boolean;
  parentAccountId?: string;
  level: number;
  normalBalance: 'debit' | 'credit';
  description?: string;
  examples?: string[];
}

export type SAKETAPCategory = 
  | 'aset' // Assets
  | 'liabilitas' // Liabilities  
  | 'ekuitas' // Equity
  | 'pendapatan' // Revenue
  | 'beban' // Expenses;

export interface SAKETAPJournal {
  id: string;
  date: Date;
  reference: string;
  description: string;
  entries: SAKETAPJournalEntry[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  createdBy: string;
  createdAt: Date;
  postedAt?: Date;
  reversedAt?: Date;
  reversalReason?: string;
}

export interface SAKETAPJournalEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface SAKETAPTrialBalance {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface TrialBalanceAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  beginningBalance: number;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
}

export interface SAKETAPFinancialStatement {
  id: string;
  type: FinancialStatementType;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  data: any; // Specific to each statement type
  notes?: string[];
}

export type FinancialStatementType = 
  | 'neraca' // Balance Sheet
  | 'laba_rugi' // Income Statement
  | 'arus_kas' // Cash Flow Statement
  | 'perubahan_ekuitas'; // Statement of Changes in Equity

// Indonesian Tax System
export interface IndonesianTax {
  id: string;
  type: TaxType;
  name: string;
  nameIndonesian: string;
  rate: number;
  applicableFrom: Date;
  applicableTo?: Date;
  isActive: boolean;
  description?: string;
  exemptionThreshold?: number;
  calculationMethod: TaxCalculationMethod;
}

export type TaxType = 
  | 'ppn' // Pajak Pertambahan Nilai (VAT)
  | 'pph21' // Pajak Penghasilan Pasal 21 (Income Tax Article 21)
  | 'pph23' // Pajak Penghasilan Pasal 23 (Income Tax Article 23)
  | 'pph25' // Pajak Penghasilan Pasal 25 (Income Tax Article 25)
  | 'pph29' // Pajak Penghasilan Pasal 29 (Income Tax Article 29)
  | 'pbb' // Pajak Bumi dan Bangunan (Property Tax)
  | 'meterai'; // Stamp Duty

export type TaxCalculationMethod = 'percentage' | 'fixed_amount' | 'progressive';

export interface TaxTransaction {
  id: string;
  transactionId: string;
  taxType: TaxType;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  withholdingTax?: number;
  npwp?: string; // Nomor Pokok Wajib Pajak
  fakturPajakNumber?: string;
  taxPeriod: Date;
  dueDate: Date;
  paidDate?: Date;
  status: TaxStatus;
  notes?: string;
}

export type TaxStatus = 'calculated' | 'filed' | 'paid' | 'overdue';

// Indonesian Payroll & BPJS
export interface IndonesianEmployee {
  id: string;
  employeeNumber: string;
  name: string;
  nik: string; // Nomor Induk Kependudukan
  npwp?: string;
  bpjsKetenagakerjaan?: string;
  bpjsKesehatan?: string;
  position: string;
  department: string;
  joinDate: Date;
  resignDate?: Date;
  salary: EmployeeSalary;
  benefits: EmployeeBenefit[];
  taxCalculation: EmployeeTaxCalculation;
  isActive: boolean;
}

export interface EmployeeSalary {
  basicSalary: number;
  allowances: SalaryAllowance[];
  overtime: OvertimeCalculation;
  totalGross: number;
  totalNet: number;
  currency: 'IDR';
}

export interface SalaryAllowance {
  type: AllowanceType;
  name: string;
  amount: number;
  isTaxable: boolean;
}

export type AllowanceType = 
  | 'transport' 
  | 'meal' 
  | 'communication' 
  | 'housing' 
  | 'medical' 
  | 'performance' 
  | 'overtime';

export interface OvertimeCalculation {
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  hourlyRate: number;
  overtimeRate: number; // Usually 1.5x or 2x
  holidayRate: number;
  totalOvertimePay: number;
}

export interface EmployeeBenefit {
  type: BenefitType;
  name: string;
  employeeContribution: number;
  companyContribution: number;
  totalContribution: number;
  percentage: number;
  maxSalaryBase?: number;
}

export type BenefitType = 
  | 'bpjs_ketenagakerjaan' 
  | 'bpjs_kesehatan' 
  | 'pension_fund' 
  | 'life_insurance';

export interface EmployeeTaxCalculation {
  ptkp: number; // Penghasilan Tidak Kena Pajak
  pkp: number; // Penghasilan Kena Pajak
  annualTax: number;
  monthlyTax: number;
  withheldTax: number;
  taxMethod: 'gross' | 'net';
  maritalStatus: MaritalStatus;
  dependents: number;
}

export type MaritalStatus = 'single' | 'married' | 'divorced';

// Islamic Calendar Integration
export interface IslamicCalendar {
  id: string;
  hijriDate: HijriDate;
  gregorianDate: Date;
  islamicMonth: IslamicMonth;
  islamicYear: number;
  dayOfWeek: IslamicDayOfWeek;
  events: IslamicEvent[];
  isHoliday: boolean;
  workingDay: boolean;
}

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameArabic: string;
}

export type IslamicMonth = 
  | 'muharram' 
  | 'safar' 
  | 'rabi_al_awwal' 
  | 'rabi_al_thani' 
  | 'jumada_al_awwal' 
  | 'jumada_al_thani' 
  | 'rajab' 
  | 'shaban' 
  | 'ramadan' 
  | 'shawwal' 
  | 'dhu_al_qadah' 
  | 'dhu_al_hijjah';

export type IslamicDayOfWeek = 
  | 'ahad' 
  | 'isnain' 
  | 'thulatha' 
  | 'arba' 
  | 'khamis' 
  | 'jumaa' 
  | 'sabt';

export interface IslamicEvent {
  id: string;
  name: string;
  nameArabic: string;
  nameIndonesian: string;
  type: IslamicEventType;
  date: HijriDate;
  gregorianDate: Date;
  isNationalHoliday: boolean;
  significance: string;
  recommendations?: string[];
}

export type IslamicEventType = 
  | 'eid' 
  | 'ramadan' 
  | 'hajj' 
  | 'maulid' 
  | 'isra_miraj' 
  | 'religious_observance';

export interface SeasonalBusinessPattern {
  id: string;
  season: BusinessSeason;
  period: {
    start: Date;
    end: Date;
  };
  demandMultiplier: number;
  popularProducts: string[];
  marketingStrategies: string[];
  culturalConsiderations: string[];
  islamicConsiderations?: IslamicConsideration[];
}

export type BusinessSeason = 
  | 'ramadan' 
  | 'eid_al_fitr' 
  | 'eid_al_adha' 
  | 'new_year' 
  | 'chinese_new_year' 
  | 'valentine' 
  | 'graduation' 
  | 'christmas' 
  | 'regular';

export interface IslamicConsideration {
  type: 'product_adaptation' | 'marketing_message' | 'timing_consideration';
  description: string;
  actionRequired: string;
  impact: 'high' | 'medium' | 'low';
}

// Local Supplier Database
export interface IndonesianSupplier {
  id: string;
  companyName: string;
  businessLicenseNumber: string; // SIUP/NIB
  npwp: string;
  address: IndonesianAddress;
  contactPerson: SupplierContact;
  bankAccount: IndonesianBankAccount;
  supplierType: SupplierType;
  certifications: SupplierCertification[];
  products: SupplierProduct[];
  businessProfile: SupplierBusinessProfile;
  performanceMetrics: SupplierPerformance;
  contractTerms: SupplierContract;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndonesianAddress {
  street: string;
  kelurahan: string; // Village/Ward
  kecamatan: string; // Sub-district
  kabupaten: string; // Regency/City
  provinsi: string; // Province
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface SupplierContact {
  name: string;
  position: string;
  phone: string;
  whatsapp?: string;
  email: string;
  alternativeContact?: {
    name: string;
    phone: string;
  };
}

export interface IndonesianBankAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  swiftCode?: string;
  branchName?: string;
  branchCity: string;
}

export type SupplierType = 
  | 'paper_mill' 
  | 'packaging_manufacturer' 
  | 'printing_house' 
  | 'accessory_supplier' 
  | 'logistics_provider' 
  | 'raw_material' 
  | 'equipment_supplier';

export interface SupplierCertification {
  type: CertificationType;
  certificateNumber: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'suspended';
  documentPath?: string;
}

export type CertificationType = 
  | 'iso_9001' 
  | 'iso_14001' 
  | 'fsc' 
  | 'halal' 
  | 'sni' 
  | 'svlk' 
  | 'environmental_permit';

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  specifications: ProductSpecification[];
  priceList: SupplierPricing[];
  minimumOrder: number;
  leadTime: number; // days
  qualityGrade: QualityGrade;
  availability: 'in_stock' | 'made_to_order' | 'seasonal';
  samples?: SampleInfo[];
}

export interface ProductSpecification {
  attribute: string;
  value: string;
  unit?: string;
  tolerance?: string;
}

export interface SupplierPricing {
  quantity: number;
  pricePerUnit: number;
  currency: 'IDR';
  validFrom: Date;
  validTo: Date;
  terms: string;
  discounts?: PricingDiscount[];
}

export interface PricingDiscount {
  type: 'volume' | 'early_payment' | 'loyalty' | 'seasonal';
  condition: string;
  discountPercentage: number;
  validUntil?: Date;
}

export type QualityGrade = 'premium' | 'standard' | 'economy';

export interface SampleInfo {
  sampleId: string;
  requestedDate: Date;
  receivedDate?: Date;
  sampleSize: string;
  evaluationResult?: SampleEvaluation;
}

export interface SampleEvaluation {
  overallRating: number; // 1-5
  qualityRating: number;
  priceCompetitiveness: number;
  suitabilityRating: number;
  comments: string;
  approved: boolean;
  evaluatedBy: string;
  evaluatedAt: Date;
}

export interface SupplierBusinessProfile {
  establishedYear: number;
  numberOfEmployees: number;
  annualRevenue?: number;
  productionCapacity: ProductionCapacity;
  clientPortfolio: string[];
  marketSegments: string[];
  geographicReach: string[];
  specializations: string[];
}

export interface ProductionCapacity {
  dailyCapacity: number;
  monthlyCapacity: number;
  unit: string;
  utilizationRate: number; // percentage
  peakSeasonMultiplier?: number;
  equipmentList?: string[];
}

export interface SupplierPerformance {
  overallRating: number; // 1-5
  qualityScore: number;
  deliveryScore: number;
  priceCompetitiveness: number;
  customerServiceScore: number;
  totalOrders: number;
  onTimeDeliveryRate: number;
  qualityIssueRate: number;
  responseTime: number; // hours
  lastEvaluationDate: Date;
  performanceHistory: PerformanceRecord[];
}

export interface PerformanceRecord {
  period: Date;
  metric: string;
  value: number;
  benchmark?: number;
  comments?: string;
}

export interface SupplierContract {
  contractNumber?: string;
  contractType: ContractType;
  paymentTerms: PaymentTerms;
  deliveryTerms: string;
  qualityStandards: string[];
  penalties: ContractPenalty[];
  bonuses: ContractBonus[];
  renewalTerms?: string;
  terminationClauses?: string[];
  disputeResolution: string;
}

export type ContractType = 
  | 'framework_agreement' 
  | 'exclusive_supplier' 
  | 'preferred_supplier' 
  | 'spot_purchase' 
  | 'consignment';

export interface PaymentTerms {
  method: PaymentMethod;
  termDays: number; // NET 30, NET 60, etc.
  earlyPaymentDiscount?: {
    discountPercentage: number;
    dayLimit: number;
  };
  latePenalty?: {
    penaltyPercentage: number;
    gracePeriod: number;
  };
  currency: 'IDR';
}

export type PaymentMethod = 
  | 'bank_transfer' 
  | 'check' 
  | 'cash' 
  | 'letter_of_credit' 
  | 'electronic_payment';

export interface ContractPenalty {
  type: 'late_delivery' | 'quality_issue' | 'quantity_shortfall';
  penaltyAmount: number;
  calculationMethod: 'fixed' | 'percentage' | 'per_day';
  maximumPenalty?: number;
}

export interface ContractBonus {
  type: 'early_delivery' | 'quality_excellence' | 'cost_saving';
  bonusAmount: number;
  conditions: string[];
}

// Government Tender Management
export interface GovernmentTender {
  id: string;
  tenderNumber: string;
  title: string;
  description: string;
  procuringEntity: ProcuringEntity;
  tenderType: TenderType;
  method: ProcurementMethod;
  packageValue: number;
  currency: 'IDR';
  timeline: TenderTimeline;
  requirements: TenderRequirement[];
  documents: TenderDocument[];
  participants: TenderParticipant[];
  evaluation: TenderEvaluation;
  status: TenderStatus;
  result?: TenderResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcuringEntity {
  name: string;
  type: 'ministry' | 'regional_government' | 'state_enterprise' | 'local_enterprise';
  address: IndonesianAddress;
  contactPerson: SupplierContact;
  lpseCode?: string; // LPSE (Electronic Procurement Service) code
}

export type TenderType = 
  | 'goods' 
  | 'services' 
  | 'construction' 
  | 'consulting_services';

export type ProcurementMethod = 
  | 'open_tender' 
  | 'restricted_tender' 
  | 'direct_procurement' 
  | 'simple_procurement' 
  | 'e_purchasing';

export interface TenderTimeline {
  announcementDate: Date;
  documentAvailableFrom: Date;
  documentAvailableTo: Date;
  clarificationMeetingDate?: Date;
  bidSubmissionDeadline: Date;
  bidOpeningDate: Date;
  evaluationPeriod: {
    start: Date;
    end: Date;
  };
  winnerAnnouncementDate: Date;
  contractSigningDate?: Date;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

export interface TenderRequirement {
  category: RequirementCategory;
  description: string;
  isMandatory: boolean;
  weight?: number; // for scoring
  verificationMethod: string;
  documents?: string[];
}

export type RequirementCategory = 
  | 'technical_specification' 
  | 'financial_capability' 
  | 'company_qualification' 
  | 'experience' 
  | 'personnel' 
  | 'equipment' 
  | 'legal_compliance';

export interface TenderDocument {
  id: string;
  type: DocumentType;
  name: string;
  description?: string;
  filePath?: string;
  isRequired: boolean;
  submittedAt?: Date;
  verificationStatus?: VerificationStatus;
  remarks?: string;
}

export type DocumentType = 
  | 'tender_document' 
  | 'technical_specification' 
  | 'bid_submission' 
  | 'company_profile' 
  | 'financial_statement' 
  | 'experience_certificate' 
  | 'tax_clearance' 
  | 'business_license';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'needs_clarification';

export interface TenderParticipant {
  companyId: string;
  companyName: string;
  bidAmount: number;
  submissionDate: Date;
  qualificationStatus: QualificationStatus;
  technicalScore?: number;
  financialScore?: number;
  totalScore?: number;
  rank?: number;
  disqualificationReason?: string;
}

export type QualificationStatus = 
  | 'qualified' 
  | 'disqualified' 
  | 'under_review' 
  | 'conditionally_qualified';

export interface TenderEvaluation {
  method: EvaluationMethod;
  criteria: EvaluationCriteria[];
  technicalWeighting: number;
  priceWeighting: number;
  evaluators: TenderEvaluator[];
  evaluationReport?: string;
  completedAt?: Date;
}

export type EvaluationMethod = 
  | 'lowest_price' 
  | 'quality_cost_based' 
  | 'quality_based' 
  | 'fixed_budget';

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  scoringMethod: 'numeric' | 'pass_fail' | 'rating_scale';
}

export interface TenderEvaluator {
  name: string;
  position: string;
  expertise: string;
  role: 'technical_evaluator' | 'financial_evaluator' | 'chairman';
}

export type TenderStatus = 
  | 'announced' 
  | 'open_for_submission' 
  | 'submission_closed' 
  | 'under_evaluation' 
  | 'winner_selected' 
  | 'contract_signed' 
  | 'cancelled' 
  | 'postponed';

export interface TenderResult {
  winnerId: string;
  winnerName: string;
  winningBidAmount: number;
  contractValue: number;
  winningReason: string;
  announcementDate: Date;
  protestPeriod: {
    start: Date;
    end: Date;
  };
  protests?: TenderProtest[];
}

export interface TenderProtest {
  id: string;
  protestantName: string;
  submissionDate: Date;
  reason: string;
  evidence?: string[];
  status: ProtestStatus;
  resolution?: string;
  resolvedAt?: Date;
}

export type ProtestStatus = 'submitted' | 'under_review' | 'upheld' | 'rejected';

// Local Business Regulations
export interface BusinessRegulation {
  id: string;
  regulationType: RegulationType;
  title: string;
  description: string;
  authority: RegulatoryAuthority;
  effectiveDate: Date;
  expiryDate?: Date;
  applicableTo: BusinessScope[];
  requirements: RegulatoryRequirement[];
  penalties: RegulatoryPenalty[];
  complianceChecklist: ComplianceItem[];
  lastUpdated: Date;
  status: 'active' | 'superseded' | 'repealed';
}

export type RegulationType = 
  | 'licensing' 
  | 'taxation' 
  | 'environmental' 
  | 'labor' 
  | 'product_standard' 
  | 'trade' 
  | 'health_safety';

export interface RegulatoryAuthority {
  name: string;
  level: 'national' | 'provincial' | 'municipal';
  contactInfo: SupplierContact;
  website?: string;
}

export interface BusinessScope {
  industry: string;
  businessSize: 'micro' | 'small' | 'medium' | 'large';
  businessType: 'manufacturing' | 'trading' | 'service';
  location?: 'national' | 'regional' | 'local';
}

export interface RegulatoryRequirement {
  id: string;
  description: string;
  deadline?: Date;
  renewalPeriod?: number; // months
  cost?: number;
  documents?: string[];
  process?: string[];
}

export interface RegulatoryPenalty {
  violation: string;
  penaltyType: 'fine' | 'suspension' | 'revocation' | 'warning';
  amount?: number;
  duration?: number; // days for suspension
  escalation?: string[];
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  status: ComplianceStatus;
  dueDate?: Date;
  completedDate?: Date;
  evidence?: string[];
  notes?: string;
}

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable';