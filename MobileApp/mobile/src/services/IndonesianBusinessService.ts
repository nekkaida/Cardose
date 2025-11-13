import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  SAKETAPAccount, 
  SAKETAPJournal, 
  SAKETAPTrialBalance,
  SAKETAPFinancialStatement,
  IndonesianTax,
  TaxTransaction,
  IndonesianEmployee,
  IslamicCalendar,
  SeasonalBusinessPattern,
  IndonesianSupplier,
  GovernmentTender,
  BusinessRegulation,
  SAKETAPCategory,
  TaxType,
  FinancialStatementType,
  IslamicMonth,
  BusinessSeason,
  TenderStatus,
  SupplierType
} from '../types/Indonesian';

export class IndonesianBusinessService {
  private static readonly SAK_ACCOUNTS_KEY = 'sak_etap_accounts';
  private static readonly SAK_JOURNALS_KEY = 'sak_etap_journals';
  private static readonly TAX_CONFIGS_KEY = 'indonesian_tax_configs';
  private static readonly TAX_TRANSACTIONS_KEY = 'tax_transactions';
  private static readonly EMPLOYEES_KEY = 'indonesian_employees';
  private static readonly ISLAMIC_CALENDAR_KEY = 'islamic_calendar';
  private static readonly SUPPLIERS_KEY = 'indonesian_suppliers';
  private static readonly TENDERS_KEY = 'government_tenders';
  private static readonly REGULATIONS_KEY = 'business_regulations';

  // SAK ETAP Accounting Implementation
  static async initializeSAKETAPChartOfAccounts(): Promise<void> {
    try {
      const defaultAccounts: SAKETAPAccount[] = [
        // ASET (Assets)
        {
          id: 'acc_1000',
          code: '1-1000',
          name: 'Cash and Cash Equivalents',
          nameIndonesian: 'Kas dan Setara Kas',
          category: 'aset',
          subcategory: 'Aset Lancar',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        {
          id: 'acc_1100',
          code: '1-1100',
          name: 'Accounts Receivable',
          nameIndonesian: 'Piutang Usaha',
          category: 'aset',
          subcategory: 'Aset Lancar',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        {
          id: 'acc_1200',
          code: '1-1200',
          name: 'Inventory',
          nameIndonesian: 'Persediaan',
          category: 'aset',
          subcategory: 'Aset Lancar',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        {
          id: 'acc_1300',
          code: '1-1300',
          name: 'Property, Plant & Equipment',
          nameIndonesian: 'Aset Tetap',
          category: 'aset',
          subcategory: 'Aset Tidak Lancar',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        
        // LIABILITAS (Liabilities)
        {
          id: 'acc_2000',
          code: '2-2000',
          name: 'Accounts Payable',
          nameIndonesian: 'Utang Usaha',
          category: 'liabilitas',
          subcategory: 'Liabilitas Jangka Pendek',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },
        {
          id: 'acc_2100',
          code: '2-2100',
          name: 'Tax Payable - PPN',
          nameIndonesian: 'Utang Pajak - PPN',
          category: 'liabilitas',
          subcategory: 'Liabilitas Jangka Pendek',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },
        {
          id: 'acc_2200',
          code: '2-2200',
          name: 'Employee Benefits Payable',
          nameIndonesian: 'Utang Kesejahteraan Karyawan',
          category: 'liabilitas',
          subcategory: 'Liabilitas Jangka Pendek',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },

        // EKUITAS (Equity)
        {
          id: 'acc_3000',
          code: '3-3000',
          name: 'Share Capital',
          nameIndonesian: 'Modal Saham',
          category: 'ekuitas',
          subcategory: 'Modal',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },
        {
          id: 'acc_3100',
          code: '3-3100',
          name: 'Retained Earnings',
          nameIndonesian: 'Saldo Laba',
          category: 'ekuitas',
          subcategory: 'Laba Ditahan',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },

        // PENDAPATAN (Revenue)
        {
          id: 'acc_4000',
          code: '4-4000',
          name: 'Sales Revenue',
          nameIndonesian: 'Pendapatan Penjualan',
          category: 'pendapatan',
          subcategory: 'Pendapatan Operasional',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },
        {
          id: 'acc_4100',
          code: '4-4100',
          name: 'Other Income',
          nameIndonesian: 'Pendapatan Lain-lain',
          category: 'pendapatan',
          subcategory: 'Pendapatan Non-Operasional',
          isActive: true,
          level: 1,
          normalBalance: 'credit'
        },

        // BEBAN (Expenses)
        {
          id: 'acc_5000',
          code: '5-5000',
          name: 'Cost of Goods Sold',
          nameIndonesian: 'Harga Pokok Penjualan',
          category: 'beban',
          subcategory: 'Beban Pokok',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        {
          id: 'acc_5100',
          code: '5-5100',
          name: 'Operating Expenses',
          nameIndonesian: 'Beban Operasional',
          category: 'beban',
          subcategory: 'Beban Usaha',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        },
        {
          id: 'acc_5200',
          code: '5-5200',
          name: 'Administrative Expenses',
          nameIndonesian: 'Beban Administrasi',
          category: 'beban',
          subcategory: 'Beban Usaha',
          isActive: true,
          level: 1,
          normalBalance: 'debit'
        }
      ];

      await AsyncStorage.setItem(this.SAK_ACCOUNTS_KEY, JSON.stringify(defaultAccounts));
    } catch (error) {
      console.error('Error initializing SAK ETAP chart of accounts:', error);
      throw error;
    }
  }

  static async createJournalEntry(journalData: Partial<SAKETAPJournal>): Promise<SAKETAPJournal> {
    try {
      // Validate journal entry
      const totalDebit = journalData.entries?.reduce((sum, entry) => sum + entry.debit, 0) || 0;
      const totalCredit = journalData.entries?.reduce((sum, entry) => sum + entry.credit, 0) || 0;

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Journal entry is not balanced. Debit and credit totals must be equal.');
      }

      const journal: SAKETAPJournal = {
        id: `journal_${Date.now()}`,
        date: journalData.date || new Date(),
        reference: journalData.reference || `JE${Date.now()}`,
        description: journalData.description || '',
        entries: journalData.entries || [],
        totalDebit,
        totalCredit,
        status: 'draft',
        createdBy: journalData.createdBy || 'system',
        createdAt: new Date()
      };

      await this.saveJournalEntry(journal);
      return journal;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  }

  static async saveJournalEntry(journal: SAKETAPJournal): Promise<void> {
    try {
      const journals = await this.getAllJournalEntries();
      const existingIndex = journals.findIndex(j => j.id === journal.id);
      
      if (existingIndex !== -1) {
        journals[existingIndex] = journal;
      } else {
        journals.push(journal);
      }

      await AsyncStorage.setItem(this.SAK_JOURNALS_KEY, JSON.stringify(journals));
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
  }

  static async getAllJournalEntries(): Promise<SAKETAPJournal[]> {
    try {
      const stored = await AsyncStorage.getItem(this.SAK_JOURNALS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving journal entries:', error);
      return [];
    }
  }

  static async postJournalEntry(journalId: string): Promise<void> {
    try {
      const journals = await this.getAllJournalEntries();
      const journal = journals.find(j => j.id === journalId);
      
      if (!journal) {
        throw new Error('Journal entry not found');
      }

      if (journal.status !== 'draft') {
        throw new Error('Only draft journal entries can be posted');
      }

      journal.status = 'posted';
      journal.postedAt = new Date();

      await this.saveJournalEntry(journal);
    } catch (error) {
      console.error('Error posting journal entry:', error);
      throw error;
    }
  }

  static async generateTrialBalance(periodStart: Date, periodEnd: Date): Promise<SAKETAPTrialBalance> {
    try {
      const accounts = await this.getAllSAKAccounts();
      const journals = await this.getAllJournalEntries();
      
      // Filter posted journals within the period
      const relevantJournals = journals.filter(j => 
        j.status === 'posted' && 
        new Date(j.date) >= periodStart && 
        new Date(j.date) <= periodEnd
      );

      const trialBalanceAccounts = accounts.map(account => {
        const accountEntries = relevantJournals.flatMap(j => 
          j.entries.filter(e => e.accountId === account.id)
        );

        const totalDebit = accountEntries.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = accountEntries.reduce((sum, e) => sum + e.credit, 0);
        
        let endingBalance: number;
        if (account.normalBalance === 'debit') {
          endingBalance = totalDebit - totalCredit;
        } else {
          endingBalance = totalCredit - totalDebit;
        }

        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.nameIndonesian,
          beginningBalance: 0, // Would need historical data
          totalDebit,
          totalCredit,
          endingBalance
        };
      }).filter(acc => acc.totalDebit !== 0 || acc.totalCredit !== 0 || acc.endingBalance !== 0);

      const totalDebit = trialBalanceAccounts.reduce((sum, acc) => sum + acc.totalDebit, 0);
      const totalCredit = trialBalanceAccounts.reduce((sum, acc) => sum + acc.totalCredit, 0);

      const trialBalance: SAKETAPTrialBalance = {
        id: `tb_${Date.now()}`,
        periodStart,
        periodEnd,
        generatedAt: new Date(),
        accounts: trialBalanceAccounts,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      };

      return trialBalance;
    } catch (error) {
      console.error('Error generating trial balance:', error);
      throw error;
    }
  }

  static async generateFinancialStatement(
    type: FinancialStatementType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SAKETAPFinancialStatement> {
    try {
      const trialBalance = await this.generateTrialBalance(periodStart, periodEnd);
      let statementData: any;

      switch (type) {
        case 'neraca':
          statementData = await this.generateBalanceSheet(trialBalance);
          break;
        case 'laba_rugi':
          statementData = await this.generateIncomeStatement(trialBalance);
          break;
        case 'arus_kas':
          statementData = await this.generateCashFlowStatement(periodStart, periodEnd);
          break;
        case 'perubahan_ekuitas':
          statementData = await this.generateEquityStatement(trialBalance);
          break;
        default:
          throw new Error(`Unsupported statement type: ${type}`);
      }

      const statement: SAKETAPFinancialStatement = {
        id: `fs_${type}_${Date.now()}`,
        type,
        periodStart,
        periodEnd,
        generatedAt: new Date(),
        data: statementData
      };

      return statement;
    } catch (error) {
      console.error('Error generating financial statement:', error);
      throw error;
    }
  }

  // Indonesian Tax Management
  static async initializeIndonesianTaxes(): Promise<void> {
    try {
      const defaultTaxes: IndonesianTax[] = [
        {
          id: 'tax_ppn',
          type: 'ppn',
          name: 'Value Added Tax',
          nameIndonesian: 'Pajak Pertambahan Nilai',
          rate: 11, // Current PPN rate
          applicableFrom: new Date('2022-04-01'),
          isActive: true,
          calculationMethod: 'percentage',
          description: 'Pajak yang dikenakan atas konsumsi barang dan jasa di dalam negeri'
        },
        {
          id: 'tax_pph21',
          type: 'pph21',
          name: 'Employee Income Tax',
          nameIndonesian: 'Pajak Penghasilan Pasal 21',
          rate: 0, // Progressive rates
          applicableFrom: new Date('2021-01-01'),
          isActive: true,
          calculationMethod: 'progressive',
          description: 'Pajak atas penghasilan berupa gaji, upah, honorarium, tunjangan'
        },
        {
          id: 'tax_pph23',
          type: 'pph23',
          name: 'Withholding Tax on Services',
          nameIndonesian: 'Pajak Penghasilan Pasal 23',
          rate: 2, // 2% for most services
          applicableFrom: new Date('2021-01-01'),
          isActive: true,
          calculationMethod: 'percentage',
          description: 'Pajak yang dipotong atas penghasilan dari jasa'
        }
      ];

      await AsyncStorage.setItem(this.TAX_CONFIGS_KEY, JSON.stringify(defaultTaxes));
    } catch (error) {
      console.error('Error initializing Indonesian taxes:', error);
      throw error;
    }
  }

  static async calculatePPN(amount: number, includesTax: boolean = false): Promise<number> {
    try {
      const taxes = await this.getIndonesianTaxes();
      const ppnTax = taxes.find(t => t.type === 'ppn' && t.isActive);
      
      if (!ppnTax) {
        throw new Error('PPN tax configuration not found');
      }

      if (includesTax) {
        // Amount includes PPN, calculate the tax portion
        return (amount * ppnTax.rate) / (100 + ppnTax.rate);
      } else {
        // Amount excludes PPN, calculate tax to be added
        return (amount * ppnTax.rate) / 100;
      }
    } catch (error) {
      console.error('Error calculating PPN:', error);
      throw error;
    }
  }

  static async calculatePPh21(
    grossSalary: number,
    maritalStatus: 'single' | 'married',
    dependents: number = 0
  ): Promise<{ annualTax: number; monthlyTax: number; ptkp: number }> {
    try {
      // PTKP (Penghasilan Tidak Kena Pajak) rates for 2023
      let ptkp = 54000000; // Single person
      
      if (maritalStatus === 'married') {
        ptkp = 58500000; // Married
        ptkp += dependents * 4500000; // Each dependent
      }

      const annualGross = grossSalary * 12;
      const pkp = Math.max(0, annualGross - ptkp); // Penghasilan Kena Pajak

      // Progressive tax rates
      let annualTax = 0;
      if (pkp > 0) {
        if (pkp <= 60000000) {
          annualTax = pkp * 0.05;
        } else if (pkp <= 250000000) {
          annualTax = 60000000 * 0.05 + (pkp - 60000000) * 0.15;
        } else if (pkp <= 500000000) {
          annualTax = 60000000 * 0.05 + 190000000 * 0.15 + (pkp - 250000000) * 0.25;
        } else {
          annualTax = 60000000 * 0.05 + 190000000 * 0.15 + 250000000 * 0.25 + (pkp - 500000000) * 0.30;
        }
      }

      return {
        annualTax,
        monthlyTax: annualTax / 12,
        ptkp
      };
    } catch (error) {
      console.error('Error calculating PPh21:', error);
      throw error;
    }
  }

  // Islamic Calendar Integration
  static async initializeIslamicCalendar(): Promise<void> {
    try {
      // This would typically integrate with an Islamic calendar API
      // For now, we'll create basic Islamic holidays for 2024
      const islamicEvents = [
        {
          hijriDate: { day: 1, month: 1, year: 1446 },
          gregorianDate: new Date('2024-07-07'),
          name: 'Islamic New Year',
          nameArabic: 'رأس السنة الهجرية',
          nameIndonesian: 'Tahun Baru Islam',
          type: 'religious_observance' as const,
          isNationalHoliday: true
        },
        {
          hijriDate: { day: 1, month: 10, year: 1445 },
          gregorianDate: new Date('2024-04-10'),
          name: 'Eid al-Fitr',
          nameArabic: 'عيد الفطر',
          nameIndonesian: 'Idul Fitri',
          type: 'eid' as const,
          isNationalHoliday: true
        },
        {
          hijriDate: { day: 10, month: 12, year: 1445 },
          gregorianDate: new Date('2024-06-17'),
          name: 'Eid al-Adha',
          nameArabic: 'عيد الأضحى',
          nameIndonesian: 'Idul Adha',
          type: 'eid' as const,
          isNationalHoliday: true
        }
      ];

      await AsyncStorage.setItem(this.ISLAMIC_CALENDAR_KEY, JSON.stringify(islamicEvents));
    } catch (error) {
      console.error('Error initializing Islamic calendar:', error);
      throw error;
    }
  }

  static async getIslamicEventsForMonth(gregorianDate: Date): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ISLAMIC_CALENDAR_KEY);
      const events = stored ? JSON.parse(stored) : [];

      return events.filter((event: any) => {
        const eventDate = new Date(event.gregorianDate);
        return eventDate.getMonth() === gregorianDate.getMonth() && 
               eventDate.getFullYear() === gregorianDate.getFullYear();
      });
    } catch (error) {
      console.error('Error retrieving Islamic events:', error);
      return [];
    }
  }

  static async getSeasonalBusinessPatterns(): Promise<SeasonalBusinessPattern[]> {
    try {
      const patterns: SeasonalBusinessPattern[] = [
        {
          id: 'ramadan_pattern',
          season: 'ramadan',
          period: {
            start: new Date('2024-03-11'), // Ramadan 2024 start
            end: new Date('2024-04-09')   // Ramadan 2024 end
          },
          demandMultiplier: 0.7, // Reduced demand during fasting
          popularProducts: ['spiritual_gift_sets', 'iftar_packages', 'zakat_containers'],
          marketingStrategies: [
            'Focus on spiritual and charitable messaging',
            'Promote iftar and sahur packages',
            'Emphasize community and sharing values'
          ],
          culturalConsiderations: [
            'Respect fasting hours in delivery scheduling',
            'Avoid food imagery in non-food products',
            'Use appropriate Islamic greetings'
          ],
          islamicConsiderations: [
            {
              type: 'timing_consideration',
              description: 'Avoid scheduling meetings during prayer times',
              actionRequired: 'Use Islamic prayer time calendar for scheduling',
              impact: 'high'
            }
          ]
        },
        {
          id: 'eid_fitr_pattern',
          season: 'eid_al_fitr',
          period: {
            start: new Date('2024-04-10'),
            end: new Date('2024-04-12')
          },
          demandMultiplier: 2.5, // High demand for gifts
          popularProducts: [
            'premium_gift_boxes',
            'traditional_hampers',
            'money_envelopes',
            'family_gift_sets'
          ],
          marketingStrategies: [
            'Promote family reunion gifts',
            'Emphasize forgiveness and new beginnings',
            'Market premium and luxury items'
          ],
          culturalConsiderations: [
            'Use traditional Indonesian Islamic motifs',
            'Include "Selamat Idul Fitri" greetings',
            'Consider mudik (homecoming) travel patterns'
          ]
        }
      ];

      return patterns;
    } catch (error) {
      console.error('Error retrieving seasonal business patterns:', error);
      return [];
    }
  }

  // Local Supplier Database
  static async initializeLocalSuppliers(): Promise<void> {
    try {
      const localSuppliers: IndonesianSupplier[] = [
        {
          id: 'supplier_indah_kiat',
          companyName: 'PT. Indah Kiat Pulp & Paper',
          businessLicenseNumber: 'SIUP-001-JAKARTA-2020',
          npwp: '01.234.567.8-901.000',
          address: {
            street: 'Jl. M.H. Thamrin No. 51',
            kelurahan: 'Gondangdia',
            kecamatan: 'Menteng',
            kabupaten: 'Jakarta Pusat',
            provinsi: 'DKI Jakarta',
            postalCode: '10350'
          },
          contactPerson: {
            name: 'Budi Santoso',
            position: 'Sales Manager',
            phone: '+62-21-3927-8888',
            whatsapp: '+62-812-3456-7890',
            email: 'budi.santoso@indahkiat.co.id'
          },
          bankAccount: {
            bankName: 'Bank Central Asia',
            bankCode: 'BCA',
            accountNumber: '1234567890',
            accountHolderName: 'PT. Indah Kiat Pulp & Paper',
            branchName: 'KCP Thamrin',
            branchCity: 'Jakarta'
          },
          supplierType: 'paper_mill',
          certifications: [
            {
              type: 'iso_9001',
              certificateNumber: 'ISO9001-2015-IK001',
              issuedBy: 'SGS Indonesia',
              issuedDate: new Date('2022-01-15'),
              expiryDate: new Date('2025-01-14'),
              status: 'valid'
            },
            {
              type: 'fsc',
              certificateNumber: 'FSC-C123456',
              issuedBy: 'Forest Stewardship Council',
              issuedDate: new Date('2021-06-01'),
              expiryDate: new Date('2026-05-31'),
              status: 'valid'
            }
          ],
          products: [
            {
              id: 'product_art_paper',
              name: 'Art Paper',
              category: 'Coated Paper',
              specifications: [
                { attribute: 'Weight', value: '150', unit: 'gsm' },
                { attribute: 'Finish', value: 'Gloss' },
                { attribute: 'Brightness', value: '92', unit: '%' }
              ],
              priceList: [
                {
                  quantity: 1000,
                  pricePerUnit: 8500,
                  currency: 'IDR',
                  validFrom: new Date('2024-01-01'),
                  validTo: new Date('2024-12-31'),
                  terms: 'NET 30'
                }
              ],
              minimumOrder: 500,
              leadTime: 7,
              qualityGrade: 'premium',
              availability: 'in_stock'
            }
          ],
          businessProfile: {
            establishedYear: 1976,
            numberOfEmployees: 8500,
            annualRevenue: 15000000000000, // 15 trillion IDR
            productionCapacity: {
              dailyCapacity: 3000,
              monthlyCapacity: 90000,
              unit: 'tonnes',
              utilizationRate: 85
            },
            clientPortfolio: ['packaging', 'publishing', 'commercial_printing'],
            marketSegments: ['B2B', 'export'],
            geographicReach: ['national', 'international'],
            specializations: ['sustainable_paper', 'premium_quality']
          },
          performanceMetrics: {
            overallRating: 4.5,
            qualityScore: 4.7,
            deliveryScore: 4.3,
            priceCompetitiveness: 4.0,
            customerServiceScore: 4.6,
            totalOrders: 156,
            onTimeDeliveryRate: 93.5,
            qualityIssueRate: 2.1,
            responseTime: 4,
            lastEvaluationDate: new Date('2024-01-15'),
            performanceHistory: []
          },
          contractTerms: {
            contractType: 'preferred_supplier',
            paymentTerms: {
              method: 'bank_transfer',
              termDays: 30,
              currency: 'IDR'
            },
            deliveryTerms: 'FOB Jakarta',
            qualityStandards: ['ISO 9001', 'FSC Certified'],
            penalties: [
              {
                type: 'late_delivery',
                penaltyAmount: 1,
                calculationMethod: 'percentage'
              }
            ],
            bonuses: [
              {
                type: 'early_delivery',
                bonusAmount: 0.5,
                conditions: ['Delivery 3+ days early']
              }
            ],
            disputeResolution: 'Arbitration in Jakarta'
          },
          isActive: true,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2024-01-15')
        }
      ];

      await AsyncStorage.setItem(this.SUPPLIERS_KEY, JSON.stringify(localSuppliers));
    } catch (error) {
      console.error('Error initializing local suppliers:', error);
      throw error;
    }
  }

  static async searchSuppliers(
    criteria: {
      supplierType?: SupplierType;
      location?: string;
      certifications?: string[];
      minimumRating?: number;
    }
  ): Promise<IndonesianSupplier[]> {
    try {
      const suppliers = await this.getAllSuppliers();
      
      return suppliers.filter(supplier => {
        if (criteria.supplierType && supplier.supplierType !== criteria.supplierType) {
          return false;
        }
        
        if (criteria.location && 
            !supplier.address.provinsi.toLowerCase().includes(criteria.location.toLowerCase()) &&
            !supplier.address.kabupaten.toLowerCase().includes(criteria.location.toLowerCase())) {
          return false;
        }
        
        if (criteria.certifications && criteria.certifications.length > 0) {
          const supplierCerts = supplier.certifications.map(cert => cert.type);
          const hasRequiredCerts = criteria.certifications.some(cert => 
            supplierCerts.includes(cert as any)
          );
          if (!hasRequiredCerts) return false;
        }
        
        if (criteria.minimumRating && 
            supplier.performanceMetrics.overallRating < criteria.minimumRating) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return [];
    }
  }

  // Helper methods
  private static async getAllSAKAccounts(): Promise<SAKETAPAccount[]> {
    try {
      const stored = await AsyncStorage.getItem(this.SAK_ACCOUNTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving SAK accounts:', error);
      return [];
    }
  }

  private static async getIndonesianTaxes(): Promise<IndonesianTax[]> {
    try {
      const stored = await AsyncStorage.getItem(this.TAX_CONFIGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving Indonesian taxes:', error);
      return [];
    }
  }

  private static async getAllSuppliers(): Promise<IndonesianSupplier[]> {
    try {
      const stored = await AsyncStorage.getItem(this.SUPPLIERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving suppliers:', error);
      return [];
    }
  }

  private static async generateBalanceSheet(trialBalance: SAKETAPTrialBalance): Promise<any> {
    const assets = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('1-'));
    const liabilities = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('2-'));
    const equity = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('3-'));

    return {
      aset: {
        asetLancar: assets.filter(acc => acc.accountCode.includes('1000') || acc.accountCode.includes('1100') || acc.accountCode.includes('1200')),
        asetTidakLancar: assets.filter(acc => acc.accountCode.includes('1300')),
        totalAset: assets.reduce((sum, acc) => sum + acc.endingBalance, 0)
      },
      liabilitas: {
        liabilitasJangkaPendek: liabilities.filter(acc => acc.accountCode.includes('2000') || acc.accountCode.includes('2100')),
        liabilitasJangkaPanjang: liabilities.filter(acc => acc.accountCode.includes('2200')),
        totalLiabilitas: liabilities.reduce((sum, acc) => sum + acc.endingBalance, 0)
      },
      ekuitas: {
        modal: equity,
        totalEkuitas: equity.reduce((sum, acc) => sum + acc.endingBalance, 0)
      }
    };
  }

  private static async generateIncomeStatement(trialBalance: SAKETAPTrialBalance): Promise<any> {
    const revenue = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('4-'));
    const expenses = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('5-'));

    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.endingBalance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.endingBalance, 0);

    return {
      pendapatan: {
        pendapatanUsaha: revenue.filter(acc => acc.accountCode.includes('4000')),
        pendapatanLainLain: revenue.filter(acc => acc.accountCode.includes('4100')),
        totalPendapatan: totalRevenue
      },
      beban: {
        hargaPokokPenjualan: expenses.filter(acc => acc.accountCode.includes('5000')),
        bebanOperasional: expenses.filter(acc => acc.accountCode.includes('5100')),
        bebanAdministrasi: expenses.filter(acc => acc.accountCode.includes('5200')),
        totalBeban: totalExpenses
      },
      labaRugi: {
        labaBersih: totalRevenue - totalExpenses
      }
    };
  }

  private static async generateCashFlowStatement(periodStart: Date, periodEnd: Date): Promise<any> {
    // Simplified cash flow statement
    return {
      aktivitasOperasi: {
        penerimaanDariPelanggan: 0,
        pembayaranKepemasok: 0,
        arusKasBersihDariAktivitasOperasi: 0
      },
      aktivitasInvestasi: {
        pembelianAsetTetap: 0,
        arusKasBersihDariAktivitasInvestasi: 0
      },
      aktivitasPendanaan: {
        penerimaanPinjaman: 0,
        pembayaranPinjaman: 0,
        arusKasBersihDariAktivitasPendanaan: 0
      },
      kenaikanKasBersih: 0,
      kasDanSetaraKasAwalPeriode: 0,
      kasDanSetaraKasAkhirPeriode: 0
    };
  }

  private static async generateEquityStatement(trialBalance: SAKETAPTrialBalance): Promise<any> {
    const equity = trialBalance.accounts.filter(acc => acc.accountCode.startsWith('3-'));

    return {
      modalSaham: {
        saldoAwal: 0,
        penambahanModal: 0,
        saldoAkhir: 0
      },
      saldoLaba: {
        saldoAwal: 0,
        labaTahunBerjalan: 0,
        dividenDibayar: 0,
        saldoAkhir: 0
      },
      totalEkuitas: equity.reduce((sum, acc) => sum + acc.endingBalance, 0)
    };
  }

  static async clearAllData(): Promise<void> {
    try {
      const keys = [
        this.SAK_ACCOUNTS_KEY,
        this.SAK_JOURNALS_KEY,
        this.TAX_CONFIGS_KEY,
        this.TAX_TRANSACTIONS_KEY,
        this.EMPLOYEES_KEY,
        this.ISLAMIC_CALENDAR_KEY,
        this.SUPPLIERS_KEY,
        this.TENDERS_KEY,
        this.REGULATIONS_KEY
      ];

      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing Indonesian business data:', error);
    }
  }
}