<template>
    <div class="generated-report-container">
      <div class="search-bar">
        <el-select v-model="searchQuery.templateId" placeholder="选择报表模板" clearable filterable style="width: 250px;">
          <el-option
            v-for="template in activeTemplates"
            :key="template.templateId"
            :label="`${template.templateName} (${template.templateId})`"
            :value="template.templateId">
          </el-option>
        </el-select>
        <el-select v-model="searchQuery.generationStatus" placeholder="生成状态" clearable style="width: 150px; margin-left: 10px;">
          <el-option label="已生成" value="已生成"></el-option>
          <el-option label="生成失败" value="生成失败"></el-option>
          <el-option label="已导出" value="已导出"></el-option>
        </el-select>
        <el-date-picker
          v-model="searchQuery.generationDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="生成开始日期"
          end-placeholder="生成结束日期"
          value-format="yyyy-MM-dd"
          style="margin-left: 10px; width: 240px;">
        </el-date-picker>
        <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
        <el-button type="info" plain style="margin-left: 10px" @click="resetSearch" icon="el-icon-refresh">重置</el-button>
      </div>

      <div class="actions-bar">
        <el-button type="success" plain @click="openGenerateDialog" icon="el-icon-document-add">生成新报表</el-button>
      </div>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="reportId" label="报表ID" width="140" show-overflow-tooltip></el-table-column>
        <el-table-column prop="templateName" label="源模板" show-overflow-tooltip>
            <template v-slot="scope">
                {{scope.row.templateName}} ({{scope.row.templateId}})
            </template>
        </el-table-column>
        <el-table-column prop="generationTime" label="生成时间" width="160">
           <template v-slot="scope">{{ formatDateTime(scope.row.generationTime) }}</template>
        </el-table-column>
        <el-table-column prop="fileFormat" label="格式" width="80"></el-table-column>
        <el-table-column prop="generationStatus" label="状态" width="100" align="center">
          <template v-slot="scope">
            <el-tag :type="statusTagType(scope.row.generationStatus)">{{ scope.row.generationStatus }}</el-tag>
          </template>
        </el-table-column>
         <el-table-column prop="generatedByName" label="生成人" width="120"></el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template v-slot="scope">
            <el-button size="mini" type="text" @click="handleViewDetails(scope.row)">详情</el-button>
            <el-button size="mini" type="text" @click="handleExport(scope.row)" v-if="scope.row.generationStatus === '已生成' || scope.row.generationStatus === '已导出'">导出</el-button>
            <el-button size="mini" type="text" style="color: #F56C6C;" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          background
          @current-change="handleCurrentChange"
          :current-page="pageNum"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          :total="total">
        </el-pagination>
      </div>

      <!-- Generate Report Dialog -->
      <el-dialog title="生成新报表" :visible.sync="generateDialogVisible" width="500px" :close-on-click-modal="false">
        <el-form :model="generateForm" :rules="generateRules" ref="generateFormRef" label-width="100px">
          <el-form-item label="选择模板" prop="selectedTemplateId">
            <el-select v-model="generateForm.selectedTemplateId" placeholder="请选择报表模板" filterable style="width: 100%;">
              <el-option
                v-for="template in activeTemplates"
                :key="template.templateId"
                :label="`${template.templateName} (${template.reportType} - ${template.generationCycle})`"
                :value="template.templateId">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="输出格式" prop="selectedFormat" v-if="selectedTemplateDetails && selectedTemplateDetails.outputFormats && selectedTemplateDetails.outputFormats.length > 0">
             <el-radio-group v-model="generateForm.selectedFormat">
                  <el-radio v-for="format in selectedTemplateDetails.outputFormats" :key="format" :label="format">{{format}}</el-radio>
              </el-radio-group>
          </el-form-item>

          <el-form-item label="报表月份" prop="reportMonth" v-if="isMonthlySummaryReport && availableLedgerPeriods.length > 0">
              <el-select v-model="generateForm.reportMonth" placeholder="选择已结算月份" style="width: 100%;">
                  <el-option
                      v-for="period in availableLedgerPeriods"
                      :key="period.value"
                      :label="period.label"
                      :value="period.value">
                  </el-option>
              </el-select>
          </el-form-item>
          <el-form-item label="报表月份" v-if="isMonthlySummaryReport && availableLedgerPeriods.length === 0">
              <span style="color: #E6A23C;">无已结算的账期可供选择生成月度凭证汇总。</span>
          </el-form-item>
           <!-- Add other dynamic parameters here based on template needs, e.g., generic date range for other report types -->
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="generateDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleGenerateReport" :loading="generating" :disabled="isMonthlySummaryReport && availableLedgerPeriods.length === 0 && generateForm.selectedTemplateId">开始生成</el-button>
        </div>
      </el-dialog>

      <!-- Report Details Dialog -->
      <el-dialog title="报表详情" :visible.sync="detailsVisible" width="700px">
          <div v-if="selectedReportForDetails" class="details-content">
              <el-descriptions :column="2" border size="medium">
                  <el-descriptions-item label="报表ID">{{ selectedReportForDetails.reportId }}</el-descriptions-item>
                  <el-descriptions-item label="源模板">{{ selectedReportForDetails.templateName }} ({{selectedReportForDetails.templateId}})</el-descriptions-item>
                  <el-descriptions-item label="生成时间">{{ formatDateTime(selectedReportForDetails.generationTime) }}</el-descriptions-item>
                  <el-descriptions-item label="文件格式">{{ selectedReportForDetails.fileFormat }}</el-descriptions-item>
                  <el-descriptions-item label="生成状态">
                      <el-tag :type="statusTagType(selectedReportForDetails.generationStatus)">{{ selectedReportForDetails.generationStatus }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="生成人">{{ selectedReportForDetails.generatedByName }}</el-descriptions-item>
                  <el-descriptions-item label="文件路径" :span="2">{{ selectedReportForDetails.filePath }}</el-descriptions-item>
                  <el-descriptions-item label="生成参数" :span="2">
                      <pre>{{ selectedReportForDetails.generationParams ? JSON.stringify(JSON.parse(selectedReportForDetails.generationParams), null, 2) : '无' }}</pre>
                  </el-descriptions-item>
                  <el-descriptions-item label="失败原因" :span="2" v-if="selectedReportForDetails.generationStatus === '生成失败'">
                      {{ selectedReportForDetails.failureReason || '未记录原因' }}
                  </el-descriptions-item>
              </el-descriptions>
              <div v-if="selectedReportForDetails.dataPreview && selectedReportForDetails.dataPreview.length > 0" style="margin-top:15px;">
                  <h4>数据预览 ():</h4>
                  <el-table :data="selectedReportForDetails.dataPreview" stripe size="mini" max-height="200">
                      <el-table-column v-for="(val, key) in selectedReportForDetails.dataPreview[0]" :key="key" :prop="key" :label="key" show-overflow-tooltip />
                  </el-table>
              </div>
          </div>
          <span slot="footer" class="dialog-footer">
              <el-button @click="detailsVisible = false">关 闭</el-button>
          </span>
      </el-dialog>

    </div>
  </template>

  <script>
  // Correctly import the initial generated reports data
  import initialGeneratedReportsData from '@/data/generatedReports.json';
  import initialReportTemplates from '@/data/reportTemplates.json';
  import initialVouchers from '@/data/vouchers.json';
  import initialSalaries from '@/data/salary.json';
  import initialLedgersData from '@/data/ledgers.json';
  import { format, parseISO, getMonth, getYear } from 'date-fns';
  import { v4 as uuidv4 } from 'uuid';

  const GENERATED_REPORTS_STORAGE_KEY = 'generatedReports_v1';
  const REPORT_TEMPLATES_STORAGE_KEY = 'reportTemplates_v1';
  const HISTORICAL_LEDGERS_STORAGE_KEY = 'vue_historical_ledgers_data';

  export default {
    name: "GeneratedReport",
    data() {
      const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
      return {
        allGeneratedReports: [], // This will be populated from localStorage or initial JSON
        allTemplates: [],
        activeTemplates: [],
        historicalLedgers: [],
        tableData: [],
        pageNum: 1,
        pageSize: 10,
        total: 0,
        loading: false,
        generating: false,
        searchQuery: {
          templateId: null,
          generationStatus: null,
          generationDateRange: [],
        },
        user: currentUser,
        generateDialogVisible: false,
        generateForm: {
          selectedTemplateId: null,
          selectedFormat: null,
          reportMonth: null,
        },
        generateRules: {
          selectedTemplateId: [{ required: true, message: '请选择一个报表模板', trigger: 'change' }],
          selectedFormat: [{ required: true, message: '请选择输出格式', trigger: 'change' }],
          reportMonth: [{ required: false, message: '请选择报表月份', trigger: 'change'}]
        },
        detailsVisible: false,
        selectedReportForDetails: null,
      };
    },
    computed: {
      selectedTemplateDetails() {
          if (!this.generateForm.selectedTemplateId) return null;
          return this.allTemplates.find(t => t.templateId === this.generateForm.selectedTemplateId);
      },
      isMonthlySummaryReport() {
          return this.selectedTemplateDetails && this.selectedTemplateDetails.dataSourceId === 'VOUCHERS_MONTHLY_SUMMARY';
      },
      availableLedgerPeriods() {
          if (!this.historicalLedgers || this.historicalLedgers.length === 0) {
              return [];
          }
          const sortedLedgers = [...this.historicalLedgers].sort((a, b) => (b.period || "").localeCompare(a.period || ""));
          return sortedLedgers.map(ledger => ({
              value: ledger.period,
              label: `${ledger.period.replace('-', '年')}月 (凭证数: ${ledger.totalVouchers || 'N/A'})`
          }));
      }
    },
    watch: {
      'generateForm.selectedTemplateId'(newVal) {
          if (newVal) {
              const tpl = this.selectedTemplateDetails;
              if (tpl && tpl.outputFormats && tpl.outputFormats.length > 0) {
                  this.generateForm.selectedFormat = tpl.outputFormats[0];
              } else {
                  this.generateForm.selectedFormat = null;
              }
              this.generateForm.reportMonth = null;

              if(this.isMonthlySummaryReport && this.generateRules.reportMonth) {
                  this.generateRules.reportMonth[0].required = true;
              } else if (this.generateRules.reportMonth) {
                   this.generateRules.reportMonth[0].required = false;
              }
          } else {
              this.generateForm.selectedFormat = null;
              this.generateForm.reportMonth = null;
              if (this.generateRules.reportMonth) {
                   this.generateRules.reportMonth[0].required = false;
              }
          }
      }
    },
    created() {
      this.loadHistoricalLedgers();
      this.loadAllTemplates();
      this.loadInitialGeneratedReports(); // This handles loading from JSON and localStorage
      this.load(1); // Initial table load
    },
    methods: {
      formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        try { return format(parseISO(dateTimeStr), 'yyyy-MM-dd HH:mm'); }
        catch (e) { return dateTimeStr; }
      },
      statusTagType(status) {
        const types = { '已生成': 'success', '生成失败': 'danger', '已导出': 'primary', '处理中': 'warning' };
        return types[status] || 'info';
      },
      loadAllTemplates() {
          let storedTemplates = [];
          try {
              const rawStored = localStorage.getItem(REPORT_TEMPLATES_STORAGE_KEY);
              if (rawStored) storedTemplates = JSON.parse(rawStored);
          } catch (e) { console.error("Error parsing templates from localStorage:", e); }

          const combinedMap = new Map();
          initialReportTemplates.forEach(tpl => combinedMap.set(tpl.templateId, { ...tpl }));
          storedTemplates.forEach(tpl => combinedMap.set(tpl.templateId, { ...tpl }));
          this.allTemplates = Array.from(combinedMap.values());
          this.activeTemplates = this.allTemplates.filter(t => t.status === '启用');
      },

      // Method to load generated reports: from localStorage first, then from JSON if needed
      loadInitialGeneratedReports() {
        let storedReports = [];
        try {
          const rawStored = localStorage.getItem(GENERATED_REPORTS_STORAGE_KEY);
          if (rawStored) {
            storedReports = JSON.parse(rawStored);
          }
        } catch (e) {
          console.error("Error parsing generated reports from localStorage:", e);
          localStorage.removeItem(GENERATED_REPORTS_STORAGE_KEY); // Clear corrupted data
        }

        // Use a Map to merge, giving localStorage precedence for existing IDs
        const combinedMap = new Map();
        // Start with data from the JSON file
        initialGeneratedReportsData.forEach(rep => combinedMap.set(rep.reportId, { ...rep }));
        // Override with or add data from localStorage
        storedReports.forEach(rep => combinedMap.set(rep.reportId, { ...rep }));

        this.allGeneratedReports = Array.from(combinedMap.values());

        // If localStorage was empty or cleared, and initial JSON data exists,
        // save the initial (or combined) data to localStorage.
        if ((storedReports.length === 0 || localStorage.getItem(GENERATED_REPORTS_STORAGE_KEY) === null) && this.allGeneratedReports.length > 0) {
          this.saveAllGeneratedReportsToLocalStorage();
        }
        // console.log("Loaded allGeneratedReports:", this.allGeneratedReports);
      },
      saveAllGeneratedReportsToLocalStorage() {
        try {
          localStorage.setItem(GENERATED_REPORTS_STORAGE_KEY, JSON.stringify(this.allGeneratedReports));
        } catch (e) {
          console.error("Error saving generated reports to localStorage:", e);
          this.$message.error("保存报表数据到本地存储失败！");
        }
      },
      load(pageNum) {
        if (pageNum) this.pageNum = pageNum;
        this.loading = true;

        let filtered = [...this.allGeneratedReports]; // Work with a copy
        if (this.searchQuery.templateId) {
          filtered = filtered.filter(rep => rep.templateId === this.searchQuery.templateId);
        }
        if (this.searchQuery.generationStatus) {
          filtered = filtered.filter(rep => rep.generationStatus === this.searchQuery.generationStatus);
        }
        if (this.searchQuery.generationDateRange && this.searchQuery.generationDateRange.length === 2) {
          const [startDate, endDate] = this.searchQuery.generationDateRange;
          filtered = filtered.filter(rep => {
              try {
                  const genDate = format(parseISO(rep.generationTime), 'yyyy-MM-dd');
                  return genDate >= startDate && genDate <= endDate;
              } catch { return false; }
          });
        }

        filtered.sort((a, b) => (b.generationTime || "").localeCompare(a.generationTime || "") || (a.reportId || "").localeCompare(b.reportId || ""));

        this.total = filtered.length;
        const start = (this.pageNum - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.tableData = filtered.slice(start, end);
        this.loading = false;
      },
      resetSearch() {
        this.searchQuery = { templateId: null, generationStatus: null, generationDateRange: [] };
        this.load(1);
      },
      handleCurrentChange(pageNum) {
        this.load(pageNum);
      },
      openGenerateDialog() {
        this.generateForm = { selectedTemplateId: null, selectedFormat: null, reportMonth: null };
        this.generateDialogVisible = true;
        this.$nextTick(() => this.$refs.generateFormRef?.clearValidate());
      },
      loadHistoricalLedgers() {
        let storedLedgers = [];
        try {
            const rawStored = localStorage.getItem(HISTORICAL_LEDGERS_STORAGE_KEY);
            if (rawStored) storedLedgers = JSON.parse(rawStored);
        } catch (e) {
            console.error("Error parsing historical ledgers from localStorage:", e);
            localStorage.removeItem(HISTORICAL_LEDGERS_STORAGE_KEY);
        }

        if (storedLedgers && storedLedgers.length > 0) {
            this.historicalLedgers = storedLedgers;
        } else {
            this.historicalLedgers = JSON.parse(JSON.stringify(initialLedgersData));
            try { localStorage.setItem(HISTORICAL_LEDGERS_STORAGE_KEY, JSON.stringify(this.historicalLedgers));}
            catch (e) { console.error("Error saving initial ledgers to localStorage:", e); }
        }
      },
      async handleGenerateReport() {
          this.$refs.generateFormRef.validate(async (valid) => {
              if (valid) {
                  if (this.isMonthlySummaryReport && !this.generateForm.reportMonth) {
                      this.$message.error("请为月度凭证汇总表选择一个已结算的月份。");
                      return;
                  }
                  if (this.isMonthlySummaryReport && this.availableLedgerPeriods.length === 0 && this.generateForm.selectedTemplateId) {
                      this.$message.error("没有可用的已结算账期来生成月度凭证汇总表。");
                      return;
                  }

                  this.generating = true;
                  const template = this.selectedTemplateDetails;
                  const reportId = `REP_${uuidv4().slice(0,8).toUpperCase()}`;
                  const generationTime = new Date().toISOString();
                  let generationParams = {};

                  if (this.isMonthlySummaryReport) {
                      generationParams.month = this.generateForm.reportMonth;
                  }
                  // Add other params for other templates if needed

                  let reportDataPreview = [];
                  let success = true;
                  let failureReason = null;

                  try {
                      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work

                      if (template.dataSourceId === 'VOUCHERS_MONTHLY_SUMMARY') {
                          // ... (data generation logic as before) ...
                          if (!generationParams.month) throw new Error("月度报表需要选择月份。");
                          const [year, month] = generationParams.month.split('-').map(Number);
                          reportDataPreview = initialVouchers.filter(v => {
                              const vDate = parseISO(v.voucherDate);
                              return getYear(vDate) === year && (getMonth(vDate) + 1) === month && v.status === '已审核';
                          }).map(v => ({
                              voucherDate: v.voucherDate, voucherNumber: v.voucherNumber,
                              summary: v.entries[0]?.summary || '', debitAmount: v.totalDebit,
                              creditAmount: v.totalCredit, preparedBy: v.preparedBy, status: v.status
                          })).slice(0, 5);
                           if(reportDataPreview.length === 0) this.$message.info(`所选月份 (${generationParams.month}) 没有已审核的凭证数据。`);

                      } else if (template.dataSourceId === 'SALARY_ALL_EMPLOYEES') {
                           // ... (data generation logic as before) ...
                           const targetMonth = generationParams.month || format(new Date(), 'yyyy-MM');
                           const mockSalaries = initialSalaries || [];
                           reportDataPreview = mockSalaries.filter(s => s.payMonth === targetMonth)
                              .map(s => ({
                                  employeeId: s.employeeId, employeeName: s.employeeName,
                                  departmentName: s.departmentName, netSalary: s.netSalary, payMonth: s.payMonth
                              })).slice(0,5);
                          if(reportDataPreview.length === 0) this.$message.info(`月份 ${targetMonth} 没有薪资数据。`);
                      } else {
                          reportDataPreview = [{ message: "Data generation logic for this template not implemented.", params: generationParams }];
                      }
                  } catch (e) {
                      console.error("Report generation error:", e);
                      success = false;
                      failureReason = e.message || "未知生成错误";
                  }

                  const newReport = {
                      reportId, generationTime,
                      templateId: template.templateId, templateName: template.templateName,
                      fileFormat: this.generateForm.selectedFormat,
                      filePath: `/simulated_exports/${template.templateName.replace(/\s/g, '_')}_${reportId}.${this.generateForm.selectedFormat.toLowerCase()}`,
                      generationStatus: success ? '已生成' : '生成失败',
                      generationParams: JSON.stringify(generationParams),
                      generatedBy: this.user.id || 'unknown', // Fallback for user.id
                      generatedByName: this.user.name || '未知用户', // Fallback for user.name
                      dataPreview: success ? reportDataPreview : null,
                      failureReason: failureReason
                  };

                  this.allGeneratedReports.unshift(newReport);
                  this.saveAllGeneratedReportsToLocalStorage();

                  const tplIndex = this.allTemplates.findIndex(t => t.templateId === template.templateId);
                  if (tplIndex !== -1) {
                      this.allTemplates[tplIndex].lastGeneratedTime = generationTime;
                       try { localStorage.setItem(REPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(this.allTemplates)); }
                       catch (e) { console.error("Error saving updated templates", e); }
                  }

                  this.$message.success(`报表 "${template.templateName}" 已${success ? '生成' : '生成失败'}`);
                  this.load(1);
                  this.generateDialogVisible = false;
                  this.generating = false;
              }
          });
      },
      handleViewDetails(row) {
          this.selectedReportForDetails = JSON.parse(JSON.stringify(row)); // Deep copy
          this.detailsVisible = true;
      },
      async handleExport(row) {
        this.$message.info(`准备导出报表: ${row.reportId}`);
        const MOCK_EXCEL_PATH = '/mock-data/mock.xlsx';
        const filename = `${row.reportId}.xlsx`;

        try {
            const response = await fetch(MOCK_EXCEL_PATH);
            if (!response.ok) throw new Error(`无法获取Excel文件: ${response.statusText}`);
            const blob = await response.blob();

            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                this.$message.success(`报表 "${filename}" 已开始下载。`);

                const index = this.allGeneratedReports.findIndex(r => r.reportId === row.reportId);
                if (index !== -1) {
                    const currentStatus = this.allGeneratedReports[index].generationStatus;
                    if (currentStatus === '已生成' || currentStatus === '已导出') {
                        this.allGeneratedReports[index].generationStatus = '已导出';
                        this.allGeneratedReports[index].fileFormat = 'Excel';
                        this.saveAllGeneratedReportsToLocalStorage();
                        this.load(this.pageNum);
                    }
                }
            } else { this.$message.error("浏览器不支持直接下载。"); }
        } catch (error) {
            console.error("导出错误:", error);
            this.$message.error(`导出失败: ${error.message}`);
        }
      },
      handleDelete(row) {
         this.$confirm(`确定要删除报表 "${row.templateName} - ${row.reportId}" 吗?`, '确认删除', { type: 'error' })
          .then(() => {
              this.allGeneratedReports = this.allGeneratedReports.filter(rep => rep.reportId !== row.reportId);
              this.saveAllGeneratedReportsToLocalStorage();
              this.$message.success("报表已删除");
              this.load(this.pageNum > 1 && this.tableData.length === 1 ? this.pageNum -1 : 1); // Adjust pageNum if last item on page deleted
          }).catch(() => {});
      }
    }
  };
  </script>

  <style scoped>
  .generated-report-container {
    padding: 15px;
  }
  .search-bar, .actions-bar {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    flex-wrap: wrap; /* Allow wrapping */
  }
  .search-bar > .el-select,
  .search-bar > .el-date-picker,
  .search-bar > .el-button,
  .actions-bar > .el-button {
    margin-right: 10px;
    margin-bottom: 10px; /* Add bottom margin for wrapped items */
  }
  .pagination-container {
    text-align: right;
    margin-top: 15px;
  }
  .dialog-footer {
      text-align: right;
  }
  .details-content pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
  }
  .details-content .el-descriptions {
      margin-top: 10px;
  }
  </style>
