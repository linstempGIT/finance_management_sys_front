<template>
    <div class="report-template-container">
      <div class="search-bar">
        <el-input placeholder="模板名称" v-model="searchQuery.templateName" style="width: 200px;" clearable></el-input>
        <el-select v-model="searchQuery.reportType" placeholder="报表类型" clearable style="width: 150px; margin-left: 10px;">
          <el-option label="日报" value="日报"></el-option>
          <el-option label="月报" value="月报"></el-option>
          <el-option label="年报" value="年报"></el-option>
          <el-option label="自定义" value="自定义"></el-option>
        </el-select>
        <el-select v-model="searchQuery.status" placeholder="状态" clearable style="width: 120px; margin-left: 10px;">
          <el-option label="启用" value="启用"></el-option>
          <el-option label="停用" value="停用"></el-option>
        </el-select>
        <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
        <el-button type="info" plain style="margin-left: 10px" @click="resetSearch" icon="el-icon-refresh">重置</el-button>
      </div>
  
      <div class="actions-bar">
        <el-button type="success" plain @click="handleOpenForm('add')" icon="el-icon-plus">新增报表模板</el-button>
      </div>
  
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="templateId" label="模板ID" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="templateName" label="模板名称" width="200" show-overflow-tooltip></el-table-column>
        <el-table-column prop="reportType" label="报表类型" width="100"></el-table-column>
        <el-table-column prop="dataSourceName" label="数据源" width="180" show-overflow-tooltip></el-table-column>
        <el-table-column prop="generationCycle" label="生成周期" width="100"></el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template v-slot="scope">
            <el-tag :type="scope.row.status === '启用' ? 'success' : 'danger'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastGeneratedTime" label="最后生成" width="160">
          <template v-slot="scope">{{ scope.row.lastGeneratedTime ? formatDateTime(scope.row.lastGeneratedTime) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template v-slot="scope">
            <el-button size="mini" type="text" @click="handleOpenForm('edit', scope.row)">编辑</el-button>
            <el-button size="mini" type="text" @click="toggleStatus(scope.row)">{{ scope.row.status === '启用' ? '停用' : '启用' }}</el-button>
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
  
      <!-- Template Form Dialog -->
      <el-dialog :title="formMode === 'add' ? '新增报表模板' : '编辑报表模板'" :visible.sync="formVisible" width="700px" top="5vh" :close-on-click-modal="false" destroy-on-close>
        <el-form :model="form" :rules="rules" ref="templateFormRef" label-width="120px" style="padding: 0 20px;">
          <el-form-item label="模板名称" prop="templateName">
            <el-input v-model="form.templateName" placeholder="请输入模板名称"></el-input>
          </el-form-item>
          <el-row :gutter="20">
              <el-col :span="12">
                  <el-form-item label="报表类型" prop="reportType">
                      <el-select v-model="form.reportType" placeholder="选择报表类型" style="width: 100%;">
                      <el-option label="日报" value="日报"></el-option>
                      <el-option label="月报" value="月报"></el-option>
                      <el-option label="年报" value="年报"></el-option>
                      <el-option label="自定义" value="自定义"></el-option>
                      </el-select>
                  </el-form-item>
              </el-col>
              <el-col :span="12">
                  <el-form-item label="生成周期" prop="generationCycle">
                      <el-select v-model="form.generationCycle" placeholder="选择生成周期" style="width: 100%;">
                      <el-option label="每日" value="每日"></el-option>
                      <el-option label="每周" value="每周"></el-option>
                      <el-option label="每月" value="每月"></el-option>
                      <el-option label="每季度" value="每季度"></el-option>
                      <el-option label="每年" value="每年"></el-option>
                      <el-option label="手动" value="手动"></el-option>
                      </el-select>
                  </el-form-item>
              </el-col>
          </el-row>
          <el-form-item label="数据源选择" prop="dataSourceId">
              <el-select v-model="form.dataSourceId" placeholder="选择数据源" style="width: 100%;" @change="handleDataSourceChange">
                  <!-- These would ideally come from a predefined list or API -->
                  <el-option label="月度凭证汇总 (VOUCHERS_MONTHLY_SUMMARY)" value="VOUCHERS_MONTHLY_SUMMARY"></el-option>
                  <el-option label="员工薪资数据 (SALARY_ALL_EMPLOYEES)" value="SALARY_ALL_EMPLOYEES"></el-option>
                  <el-option label="部门年度支出 (DEPARTMENT_EXPENSE_YEARLY)" value="DEPARTMENT_EXPENSE_YEARLY"></el-option>
                  <el-option label="所有凭证列表 (ALL_VOUCHERS_LIST)" value="ALL_VOUCHERS_LIST"></el-option>
                  <el-option label="资产负债表要素 (BALANCE_SHEET_ELEMENTS)" value="BALANCE_SHEET_ELEMENTS"></el-option>
                  <el-option label="利润表要素 (PROFIT_LOSS_ELEMENTS)" value="PROFIT_LOSS_ELEMENTS"></el-option>
              </el-select>
          </el-form-item>
           <el-form-item label="数据源名称" prop="dataSourceName">
            <el-input v-model="form.dataSourceName" placeholder="数据源显示名称" disabled></el-input>
          </el-form-item>
          <el-form-item label="输出格式" prop="outputFormats">
              <el-checkbox-group v-model="form.outputFormats">
                  <el-checkbox label="Excel">Excel</el-checkbox>
                  <el-checkbox label="PDF">PDF</el-checkbox>
                  <el-checkbox label="CSV">CSV</el-checkbox>
                  <el-checkbox label="HTML">HTML</el-checkbox>
              </el-checkbox-group>
          </el-form-item>
          <el-form-item label="模板描述" prop="description">
            <el-input type="textarea" :rows="3" v-model="form.description" placeholder="简要描述模板用途和内容"></el-input>
          </el-form-item>
          <el-form-item label="包含数据元" prop="dataElements">
              <el-select v-model="form.dataElements" multiple filterable allow-create default-first-option placeholder="输入或选择数据元 (如: voucherNumber, amount)" style="width: 100%;">
                  <!-- Example data elements - could be dynamic based on dataSourceId -->
                  <el-option v-for="item in predefinedDataElements" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <div class="el-form-item__tip">提示：定义报表输出时包含哪些数据字段。</div>
          </el-form-item>
          <el-form-item label="状态" prop="status">
             <el-radio-group v-model="form.status">
              <el-radio label="启用">启用</el-radio>
              <el-radio label="停用">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="formVisible = false">取 消</el-button>
          <el-button type="primary" @click="saveTemplate" :loading="saving">保 存</el-button>
        </div>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import initialReportTemplates from '@/data/reportTemplates.json';
  import { format, parseISO } from 'date-fns';
  import { v4 as uuidv4 } from 'uuid';
  
  const REPORT_TEMPLATES_STORAGE_KEY = 'reportTemplates_v1';
  
  // Mock predefined data elements, in a real app this might come from a config or API
  const MOCK_PREDEFINED_DATA_ELEMENTS = {
      VOUCHERS_MONTHLY_SUMMARY: [
          { value: "voucherDate", label: "凭证日期" }, { value: "voucherNumber", label: "凭证号" },
          { value: "summary", label: "摘要" }, { value: "debitAmount", label: "借方金额" },
          { value: "creditAmount", label: "贷方金额" }, { value: "preparedBy", label: "制单人" },
          { value: "status", label: "凭证状态" }
      ],
      SALARY_ALL_EMPLOYEES: [
          { value: "employeeId", label: "员工ID" }, { value: "employeeName", label: "员工姓名" },
          { value: "departmentName", label: "部门" }, { value: "baseSalary", label: "基本工资" },
          { value: "bonus", label: "奖金" }, { value: "deductions", label: "扣除项" },
          { value: "netSalary", label: "实发工资" }, { value: "payMonth", label: "薪资月份" }
      ],
      // Add more as needed
      DEFAULT: [
          {value: "id", label: "ID"}, {value: "name", label: "名称"}, {value: "value", label: "值"}, {value: "date", label: "日期"}
      ]
  };
  
  
  export default {
    name: "ReportTemplate",
    data() {
      const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
      return {
        allTemplates: [],
        tableData: [],
        pageNum: 1,
        pageSize: 10,
        total: 0,
        loading: false,
        saving: false,
        searchQuery: {
          templateName: '',
          reportType: null,
          status: null,
        },
        formVisible: false,
        formMode: 'add', // 'add' or 'edit'
        form: this.getEmptyForm(currentUser),
        user: currentUser,
        rules: {
          templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
          reportType: [{ required: true, message: '请选择报表类型', trigger: 'change' }],
          dataSourceId: [{ required: true, message: '请选择数据源', trigger: 'change' }],
          outputFormats: [{ type: 'array', required: true, message: '请至少选择一种输出格式', trigger: 'change' }],
          generationCycle: [{ required: true, message: '请选择生成周期', trigger: 'change' }],
          status: [{ required: true, message: '请选择状态', trigger: 'change' }],
          dataElements: [{type: 'array', required: true, message: '请至少定义一个数据元', trigger: 'change'}]
        },
        predefinedDataElements: MOCK_PREDEFINED_DATA_ELEMENTS.DEFAULT, // Default, updated on dataSource change
      };
    },
    created() {
      this.loadInitialTemplates();
      this.load(1);
    },
    methods: {
      formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        try {
          return format(parseISO(dateTimeStr), 'yyyy-MM-dd HH:mm');
        } catch (e) {
          return dateTimeStr; // Fallback if parsing fails
        }
      },
      getEmptyForm(currentUser) {
        return {
          templateId: null,
          templateName: '',
          reportType: '月报',
          dataSourceId: null,
          dataSourceName: '',
          outputFormats: ['Excel'],
          generationCycle: '手动',
          lastGeneratedTime: null,
          status: '启用',
          createdBy: currentUser.id || 'system',
          createdTime: null,
          updatedTime: null,
          description: '',
          dataElements: []
        };
      },
      handleDataSourceChange(dataSourceId) {
          const selectedOption = this.$el.querySelector(`.el-select-dropdown[x-placement] li.el-select-dropdown__item.selected span`);
          if (selectedOption && selectedOption.textContent) {
             this.form.dataSourceName = selectedOption.textContent.split('(')[0].trim(); // Extract name part
          } else {
              // Fallback if querySelector fails (e.g. in tests or very fast changes)
              const dsMap = {
                  "VOUCHERS_MONTHLY_SUMMARY": "月度凭证汇总",
                  "SALARY_ALL_EMPLOYEES": "员工薪资数据",
                  "DEPARTMENT_EXPENSE_YEARLY": "部门年度支出",
                  "ALL_VOUCHERS_LIST": "所有凭证列表",
                  "BALANCE_SHEET_ELEMENTS": "资产负债表要素",
                  "PROFIT_LOSS_ELEMENTS": "利润表要素"
              };
              this.form.dataSourceName = dsMap[dataSourceId] || dataSourceId;
          }
          this.form.dataElements = []; // Reset data elements
          this.predefinedDataElements = MOCK_PREDEFINED_DATA_ELEMENTS[dataSourceId] || MOCK_PREDEFINED_DATA_ELEMENTS.DEFAULT;
      },
      loadInitialTemplates() {
        let storedTemplates = [];
        try {
          const rawStored = localStorage.getItem(REPORT_TEMPLATES_STORAGE_KEY);
          if (rawStored) storedTemplates = JSON.parse(rawStored);
        } catch (e) {
          console.error("Error parsing report templates from localStorage:", e);
          localStorage.removeItem(REPORT_TEMPLATES_STORAGE_KEY);
        }
  
        const combinedMap = new Map();
        initialReportTemplates.forEach(tpl => combinedMap.set(tpl.templateId, { ...tpl }));
        storedTemplates.forEach(tpl => combinedMap.set(tpl.templateId, { ...tpl }));
        this.allTemplates = Array.from(combinedMap.values());
  
        if (storedTemplates.length === 0 && initialReportTemplates.length > 0) {
          this.saveAllTemplatesToLocalStorage();
        }
      },
      saveAllTemplatesToLocalStorage() {
        try {
          localStorage.setItem(REPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(this.allTemplates));
        } catch (e) {
          console.error("Error saving report templates to localStorage:", e);
          this.$message.error("保存报表模板数据到本地存储失败！");
        }
      },
      load(pageNum) {
        if (pageNum) this.pageNum = pageNum;
        this.loading = true;
  
        let filtered = [...this.allTemplates];
        if (this.searchQuery.templateName) {
          filtered = filtered.filter(tpl => tpl.templateName.toLowerCase().includes(this.searchQuery.templateName.toLowerCase()));
        }
        if (this.searchQuery.reportType) {
          filtered = filtered.filter(tpl => tpl.reportType === this.searchQuery.reportType);
        }
        if (this.searchQuery.status) {
          filtered = filtered.filter(tpl => tpl.status === this.searchQuery.status);
        }
  
        filtered.sort((a, b) => (b.createdTime || "").localeCompare(a.createdTime || "") || a.templateId.localeCompare(b.templateId));
  
        this.total = filtered.length;
        const start = (this.pageNum - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.tableData = filtered.slice(start, end);
        this.loading = false;
      },
      resetSearch() {
        this.searchQuery = { templateName: '', reportType: null, status: null };
        this.load(1);
      },
      handleCurrentChange(pageNum) {
        this.load(pageNum);
      },
      handleOpenForm(mode, row = null) {
        this.formMode = mode;
        if (mode === 'add') {
          this.form = this.getEmptyForm(this.user);
          this.predefinedDataElements = MOCK_PREDEFINED_DATA_ELEMENTS.DEFAULT;
        } else {
          this.form = JSON.parse(JSON.stringify(row));
          // Ensure dataSourceName is populated if opening an existing form
          this.handleDataSourceChange(this.form.dataSourceId); // This will also set predefinedDataElements
          this.form.dataElements = row.dataElements ? [...row.dataElements] : []; // Ensure it's a new array
        }
        this.formVisible = true;
        this.$nextTick(() => {
          this.$refs.templateFormRef?.clearValidate();
        });
      },
      saveTemplate() {
        this.$refs.templateFormRef.validate((valid) => {
          if (valid) {
            this.saving = true;
            const now = new Date().toISOString();
            this.form.updatedTime = now;
  
            if (this.formMode === 'add') {
              this.form.templateId = `TPL_${uuidv4().slice(0, 8).toUpperCase()}`;
              this.form.createdTime = now;
              this.form.createdBy = this.user.id || 'system';
              this.allTemplates.push({ ...this.form });
            } else {
              const index = this.allTemplates.findIndex(tpl => tpl.templateId === this.form.templateId);
              if (index !== -1) {
                this.$set(this.allTemplates, index, { ...this.form });
              } else {
                this.$message.error("未找到要更新的模板");
                this.saving = false;
                return;
              }
            }
            this.saveAllTemplatesToLocalStorage();
            this.$message.success("报表模板已保存");
            this.load(this.formMode === 'add' ? 1 : this.pageNum);
            this.formVisible = false;
            this.saving = false;
          } else {
            this.$message.error("请检查表单填写是否完整且正确。");
          }
        });
      },
      toggleStatus(row) {
          const newStatus = row.status === '启用' ? '停用' : '启用';
          this.$confirm(`确定要${newStatus}模板 "${row.templateName}" 吗?`, '确认操作', { type: 'warning' })
              .then(() => {
                  const index = this.allTemplates.findIndex(tpl => tpl.templateId === row.templateId);
                  if (index !== -1) {
                      this.allTemplates[index].status = newStatus;
                      this.allTemplates[index].updatedTime = new Date().toISOString();
                      this.saveAllTemplatesToLocalStorage();
                      this.$message.success(`模板已${newStatus}`);
                      this.load(this.pageNum);
                  }
              }).catch(() => {});
      },
      handleDelete(row) {
         this.$confirm(`确定要删除模板 "${row.templateName}" 吗? 此操作无法撤销。`, '确认删除', { type: 'error' })
          .then(() => {
              this.allTemplates = this.allTemplates.filter(tpl => tpl.templateId !== row.templateId);
              this.saveAllTemplatesToLocalStorage();
              this.$message.success("模板已删除");
              this.load(1); // Reload to first page or current if items still exist
          }).catch(() => {});
      }
    }
  };
  </script>
  
  <style scoped>
  .report-template-container {
    padding: 15px;
  }
  .search-bar, .actions-bar {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  .search-bar > .el-input,
  .search-bar > .el-select,
  .search-bar > .el-button,
  .actions-bar > .el-button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
  .pagination-container {
    text-align: right;
    margin-top: 15px;
  }
  .dialog-footer {
      text-align: right;
  }
  .el-form-item__tip {
      font-size: 12px;
      color: #909399;
      line-height: 1.5;
      margin-top: 4px;
  }
  </style>
  