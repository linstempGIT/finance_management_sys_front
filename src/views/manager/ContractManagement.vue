<template>
    <div class="contract-management-container">
      <el-card class="box-card">
        <div slot="header" class="clearfix">
          <span>合同管理</span>
        </div>

        <!-- Search and Actions -->
        <div class="actions-bar">
          <el-input
            v-model="searchFilters.contractName"
            placeholder="合同名称"
            style="width: 200px; margin-right: 10px"
            clearable
            @keyup.enter.native="loadContracts(1)"
          ></el-input>
          <el-input
            v-model="searchFilters.signingParty"
            placeholder="签约方"
            style="width: 180px; margin-right: 10px"
            clearable
            @keyup.enter.native="loadContracts(1)"
          ></el-input>
          <el-select v-model="searchFilters.status" placeholder="合同状态" clearable style="width: 150px; margin-right: 10px;" @change="loadContracts(1)">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
          <el-button type="primary" icon="el-icon-search" @click="loadContracts(1)">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="success" icon="el-icon-plus" @click="handleAdd" style="float: right;" v-if="canAddNewContract">新增合同</el-button>
        </div>

        <!-- Contract Table -->
        <el-table :data="tableData" stripe style="width: 100%; margin-top: 20px" v-loading="loading">
          <el-table-column prop="contractId" label="合同ID" width="180" sortable fixed></el-table-column>
          <el-table-column prop="contractName" label="合同名称" width="250" show-overflow-tooltip sortable></el-table-column>
          <el-table-column prop="signingParty" label="签约方" width="180" show-overflow-tooltip></el-table-column>
          <el-table-column prop="contractAmount" label="合同金额" width="120" align="right" sortable>
              <template slot-scope="scope">{{ formatAmount(scope.row.contractAmount) }}</template>
          </el-table-column>
          <el-table-column prop="startDate" label="开始日期" width="120"></el-table-column>
          <el-table-column prop="endDate" label="结束日期" width="120"></el-table-column>
          <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="scope">
                  <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
              </template>
          </el-table-column>
          <el-table-column prop="paymentProgress" label="付款进度" width="110">
               <template slot-scope="scope">
                  <el-tag :type="paymentProgressTagType(scope.row.paymentProgress)" size="small">{{ scope.row.paymentProgress }}</el-tag>
              </template>
          </el-table-column>
          <el-table-column label="附件数" width="80" align="center">
              <template slot-scope="scope">{{ scope.row.attachments ? scope.row.attachments.length : 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template slot-scope="scope">
              <el-button size="mini" type="text" @click="handleEdit(scope.row)" v-if="canEditContract(scope.row)">编辑</el-button>
              <el-button size="mini" type="text" @click="viewDetails(scope.row)" style="margin-left:5px" v-if="canViewDetails">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div class="pagination-container">
          <el-pagination
            background
            @current-change="handleCurrentChange"
            :current-page="pageNum"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="total"
          ></el-pagination>
        </div>
      </el-card>

      <!-- Add/Edit Contract Dialog -->
      <el-dialog
        :title="formMode === 'add' ? '新增合同' : '编辑合同'"
        :visible.sync="dialogVisible"
        width="60%"
        :before-close="handleDialogClose"
        top="5vh"
        :close-on-click-modal="false"
      >
        <el-form :model="contractForm" :rules="formRules" ref="contractFormRef" label-width="100px" class="contract-form">
          <el-row :gutter="20">
              <el-col :span="12">
                  <el-form-item label="合同名称" prop="contractName">
                    <el-input v-model="contractForm.contractName" placeholder="请输入合同名称" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-input>
                  </el-form-item>
              </el-col>
              <el-col :span="12">
                   <el-form-item label="签约方" prop="signingParty">
                    <el-input v-model="contractForm.signingParty" placeholder="请输入签约方" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-input>
                  </el-form-item>
              </el-col>
          </el-row>
          <el-row :gutter="20">
              <el-col :span="12">
                  <el-form-item label="关联项目ID" prop="projectId">
                    <el-input v-model="contractForm.projectId" placeholder="请输入关联项目ID (可选)" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-input>
                  </el-form-item>
              </el-col>
               <el-col :span="12">
                  <el-form-item label="合同金额" prop="contractAmount">
                    <el-input-number v-model="contractForm.contractAmount" :precision="2" :step="1000" :min="0" controls-position="right" style="width:100%;" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-input-number>
                  </el-form-item>
              </el-col>
          </el-row>
          <el-row :gutter="20">
              <el-col :span="12">
                  <el-form-item label="开始日期" prop="startDate">
                    <el-date-picker v-model="contractForm.startDate" type="date" placeholder="选择开始日期" value-format="yyyy-MM-dd" style="width:100%;" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-date-picker>
                  </el-form-item>
              </el-col>
              <el-col :span="12">
                  <el-form-item label="结束日期" prop="endDate">
                    <el-date-picker v-model="contractForm.endDate" type="date" placeholder="选择结束日期" value-format="yyyy-MM-dd" style="width:100%;" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-date-picker>
                  </el-form-item>
              </el-col>
          </el-row>
           <el-row :gutter="20">
              <el-col :span="12">
                  <el-form-item label="合同状态" prop="status">
                      <el-select
                        v-model="contractForm.status"
                        placeholder="请选择合同状态"
                        style="width:100%;"
                        :disabled="(formMode === 'edit' && !canEditStatusAndProgress) || (formMode === 'add' && isUser)"
                      >
                          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
                      </el-select>
                  </el-form-item>
              </el-col>
              <el-col :span="12">
                   <el-form-item label="付款进度" prop="paymentProgress">
                      <el-select
                        v-model="contractForm.paymentProgress"
                        placeholder="请选择付款进度"
                        style="width:100%;"
                        :disabled="(formMode === 'edit' && !canEditStatusAndProgress) || (formMode === 'add' && isUser)"
                      >
                          <el-option v-for="item in paymentProgressOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
                      </el-select>
                  </el-form-item>
              </el-col>
          </el-row>
          <el-form-item label="附件列表" prop="attachments">
              <el-input type="textarea" v-model="contractForm.attachmentsInput" placeholder="附件文件名，用英文逗号隔开" :disabled="formMode === 'edit' && isUser && !isCreator(contractForm)"></el-input>
              <small>当前附件: {{ contractForm.attachments && contractForm.attachments.length > 0 ? contractForm.attachments.join(', ') : '无' }}</small>
          </el-form-item>
          <el-form-item label="创建人ID" prop="creatorId" v-if="contractForm.creatorId">
              <el-input v-model="contractForm.creatorId" :disabled="true"></el-input>
          </el-form-item>
           <el-form-item label="合同ID" prop="contractId" v-if="formMode === 'edit'">
              <el-input v-model="contractForm.contractId" :disabled="true"></el-input>
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <el-button @click="handleDialogClose">取 消</el-button>
          <template v-if="formMode === 'add' && isUser">
            <el-button type="info" @click="submitForm('save_draft')" :loading="submitLoading && currentAction === 'save_draft'">保存草稿</el-button>
            <el-button type="primary" @click="submitForm('submit_for_approval')" :loading="submitLoading && currentAction === 'submit_for_approval'">提交审批</el-button>
          </template>
          <template v-else>
            <el-button type="primary" @click="submitForm('confirm')" :loading="submitLoading && currentAction === 'confirm'">确 定</el-button>
          </template>
        </span>
      </el-dialog>

       <!-- Details Dialog -->
      <el-dialog title="合同详情" :visible.sync="detailsDialogVisible" width="65%" top="5vh">
          <div v-if="selectedContractForDetails" class="contract-details">
              <el-descriptions :column="2" border size="medium">
                  <el-descriptions-item label="合同ID">{{ selectedContractForDetails.contractId }}</el-descriptions-item>
                  <el-descriptions-item label="合同名称">{{ selectedContractForDetails.contractName }}</el-descriptions-item>
                  <el-descriptions-item label="签约方">{{ selectedContractForDetails.signingParty }}</el-descriptions-item>
                  <el-descriptions-item label="关联项目ID">{{ selectedContractForDetails.projectId || '无' }}</el-descriptions-item>
                  <el-descriptions-item label="合同金额">{{ formatAmount(selectedContractForDetails.contractAmount) }}</el-descriptions-item>
                  <el-descriptions-item label="创建人ID">{{ selectedContractForDetails.creatorId }}</el-descriptions-item>
                  <el-descriptions-item label="开始日期">{{ selectedContractForDetails.startDate }}</el-descriptions-item>
                  <el-descriptions-item label="结束日期">{{ selectedContractForDetails.endDate }}</el-descriptions-item>
                  <el-descriptions-item label="合同状态">
                      <el-tag :type="statusTagType(selectedContractForDetails.status)">{{ selectedContractForDetails.status }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="付款进度">
                      <el-tag :type="paymentProgressTagType(selectedContractForDetails.paymentProgress)" size="small">{{ selectedContractForDetails.paymentProgress }}</el-tag>
                  </el-descriptions-item>
                   <el-descriptions-item label="附件列表" :span="2">
                      <ul v-if="selectedContractForDetails.attachments && selectedContractForDetails.attachments.length">
                          <li v-for="(att, index) in selectedContractForDetails.attachments" :key="index">{{ att }}</li>
                      </ul>
                      <span v-else>无附件</span>
                  </el-descriptions-item>
              </el-descriptions>
          </div>
          <span slot="footer" class="dialog-footer">
              <el-button @click="detailsDialogVisible = false">关 闭</el-button>
          </span>
      </el-dialog>

    </div>
  </template>

  <script>
  import initialContractsData from '@/data/contracts.json';

  export default {
    name: "ContractManagement",
    data() {
      const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
      return {
        currentUser: currentUser,
        allContracts: [],
        tableData: [],
        loading: false,
        submitLoading: false,
        currentAction: null, // To track which submit button was clicked
        pageNum: 1,
        pageSize: 10,
        total: 0,
        searchFilters: {
          contractName: "",
          signingParty: "",
          status: "",
        },
        dialogVisible: false,
        detailsDialogVisible: false,
        selectedContractForDetails: null,
        formMode: 'add',
        contractForm: { /* Initialized in handleAdd or handleEdit */ },
        statusOptions: [
          { value: "草稿", label: "草稿" },
          { value: "已提交", label: "已提交" },
          { value: "已审批", label: "已审批" },
          { value: "终止", label: "终止" },
        ],
        paymentProgressOptions: [
          { value: "待付", label: "待付" },
          { value: "部分支付", label: "部分支付" },
          { value: "已完成", label: "已完成" },
        ],
        formRules: {
          contractName: [{ required: true, message: "请输入合同名称", trigger: "blur" }],
          signingParty: [{ required: true, message: "请输入签约方", trigger: "blur" }],
          startDate: [{ required: true, message: "请选择开始日期", trigger: "change" }],
          endDate: [{ required: true, message: "请选择结束日期", trigger: "change" }],
          contractAmount: [{ required: true, message: "请输入合同金额", trigger: "blur" }, { type: 'number', message: '合同金额必须为数字'}],
          status: [{ required: true, message: "请选择合同状态", trigger: "change" }],
          paymentProgress: [{ required: true, message: "请选择付款进度", trigger: "change" }],
        },
      };
    },
    computed: {
        isAdmin() {
            return this.currentUser.role === 'ADMIN';
        },
        isFinancial() {
            return this.currentUser.role === 'FINANCIAL';
        },
        isUser() {
            return this.currentUser.role === 'USER';
        },
        canAddNewContract() {
            return true;
        },
        canViewDetails() {
            return true;
        },
        canEditStatusAndProgress() { // Applies to edit mode, and add mode for ADMIN/FINANCIAL
            return this.isAdmin || this.isFinancial;
        },
    },
    created() {
      this.loadInitialData();
      this.loadContracts();
    },
    methods: {
      isCreator(contract) {
          return contract && contract.creatorId && this.currentUser && this.currentUser.id && contract.creatorId === this.currentUser.id;
      },
      canEditContract(contract) {
          if (this.isAdmin || this.isFinancial) {
              return true;
          }
          if (this.isUser && this.isCreator(contract)) {
              // USER can edit their own contract, but status/progress fields will be disabled in the form
              return true;
          }
          return false;
      },
      loadInitialData() {
          let storedContracts = [];
          try {
              const rawStored = localStorage.getItem("userContracts");
              if (rawStored) {
                  storedContracts = JSON.parse(rawStored);
              }
          } catch (e) {
              console.error("Error parsing contracts from localStorage:", e);
              localStorage.removeItem("userContracts"); // Clear corrupted data
          }

          const combinedMap = new Map();
          initialContractsData.forEach(c => combinedMap.set(c.contractId, { ...c, creatorId: c.creatorId || 'system_initial' }));
          storedContracts.forEach(c => combinedMap.set(c.contractId, { ...c })); // stored data overrides initial if IDs match
          this.allContracts = Array.from(combinedMap.values());

          if (storedContracts.length === 0 && initialContractsData.length > 0 && !localStorage.getItem("userContracts")) {
              this.saveContractsToLocalStorage(); // Only save initial if local storage is truly empty for this key
          }
      },
      loadContracts(pageNum = this.pageNum) {
        this.loading = true;
        this.pageNum = pageNum;

        let displayableContracts = [...this.allContracts];

        if (this.isUser) {
            displayableContracts = displayableContracts.filter(contract => this.isCreator(contract));
        }

        if (this.searchFilters.contractName) {
          displayableContracts = displayableContracts.filter(c =>
            c.contractName.toLowerCase().includes(this.searchFilters.contractName.toLowerCase())
          );
        }
        if (this.searchFilters.signingParty) {
          displayableContracts = displayableContracts.filter(c =>
            c.signingParty.toLowerCase().includes(this.searchFilters.signingParty.toLowerCase())
          );
        }
        if (this.searchFilters.status) {
          displayableContracts = displayableContracts.filter(c => c.status === this.searchFilters.status);
        }

        displayableContracts.sort((a, b) => b.contractId.localeCompare(a.contractId)); // Sort by ID descending for newest first

        this.total = displayableContracts.length;
        const start = (this.pageNum - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.tableData = displayableContracts.slice(start, end);
        this.loading = false;
      },
      saveContractsToLocalStorage() {
          try {
              localStorage.setItem('userContracts', JSON.stringify(this.allContracts));
          } catch (e) {
              console.error("Error saving contracts to localStorage:", e);
              this.$message.error("保存合同数据到本地存储失败！");
          }
      },
      resetFilters() {
        this.searchFilters = { contractName: "", signingParty: "", status: "" };
        this.loadContracts(1);
      },
      handleCurrentChange(newPage) {
        this.loadContracts(newPage);
      },
      formatAmount(amount) {
        if (amount === null || amount === undefined) return "0.00";
        return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
      },
      statusTagType(status) {
        if (status === "已审批") return "success";
        if (status === "已提交") return "primary";
        if (status === "草稿") return "info";
        if (status === "终止") return "danger";
        return "";
      },
      paymentProgressTagType(progress) {
          if (progress === "已完成") return "success";
          if (progress === "部分支付") return "warning";
          if (progress === "待付") return "info";
          return "";
      },
      handleAdd() {
        this.formMode = 'add';
        this.contractForm = {
          contractId: '',
          creatorId: this.currentUser.id || this.currentUser.name || 'system',
          contractName: '',
          projectId: '',
          signingParty: '',
          startDate: '',
          endDate: '',
          contractAmount: 0,
          attachments: [],
          attachmentsInput: '',
          status: '草稿', // Default for new contracts
          paymentProgress: '待付', // Default for new contracts
        };
        this.dialogVisible = true;
        this.$nextTick(() => {
          if (this.$refs.contractFormRef) this.$refs.contractFormRef.clearValidate();
        });
      },
      handleEdit(row) {
        this.formMode = 'edit';
        this.contractForm = {
            ...JSON.parse(JSON.stringify(row)), // Deep copy
            attachmentsInput: row.attachments ? row.attachments.join(', ') : ''
        };
        this.dialogVisible = true;
        this.$nextTick(() => {
          if (this.$refs.contractFormRef) this.$refs.contractFormRef.clearValidate();
        });
      },
      viewDetails(row) {
          this.selectedContractForDetails = { ...row };
          this.detailsDialogVisible = true;
      },
      handleDialogClose() {
        this.dialogVisible = false;
        if (this.$refs.contractFormRef) {
          this.$refs.contractFormRef.resetFields();
        }
        this.contractForm = { // Reset form
          creatorId: this.currentUser.id || this.currentUser.name || 'system',
          contractName: '', projectId: '', signingParty: '', startDate: '',
          endDate: '', contractAmount: 0, attachments: [], attachmentsInput: '',
          status: '草稿', paymentProgress: '待付',
        };
      },
      generateContractId() {
          const now = new Date();
          const year = now.getFullYear();
          let maxNum = 0;
          this.allContracts.forEach(c => {
              if (c.contractId && c.contractId.startsWith(`CON-${year}-`)) {
                  const parts = c.contractId.split('-');
                  if (parts.length === 3) {
                    const numPart = parseInt(parts[2], 10);
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                  }
              }
          });
          return `CON-${year}-${String(maxNum + 1).padStart(3, '0')}`;
      },
      submitForm(action) { // 'action' can be 'save_draft', 'submit_for_approval', or 'confirm'
        this.$refs.contractFormRef.validate((valid) => {
          if (valid) {
            this.submitLoading = true;
            this.currentAction = action;

            this.contractForm.attachments = this.contractForm.attachmentsInput
                                              .split(',')
                                              .map(s => s.trim())
                                              .filter(s => s.length > 0);

            if (this.formMode === 'add') {
              this.contractForm.contractId = this.generateContractId();
              if (!this.contractForm.creatorId) {
                  this.contractForm.creatorId = this.currentUser.id || this.currentUser.name || 'system_fallback';
              }

              if (this.isUser) {
                if (action === 'submit_for_approval') {
                  this.contractForm.status = '已提交';
                } else { // 'save_draft'
                  this.contractForm.status = '草稿';
                }
                this.contractForm.paymentProgress = '待付'; // USERs cannot change this on creation
              }
              // For ADMIN/FINANCIAL, status and paymentProgress are taken from the form as they can edit them

              this.allContracts.push({ ...this.contractForm });
              this.$message.success(`新增合同成功 (${this.contractForm.status})！`);

            } else { // Edit mode
              if (!this.canEditStatusAndProgress && this.isUser && this.isCreator(this.contractForm)) {
                // If USER is editing their own contract, but they don't have general status/progress edit rights,
                // revert status and progress to original values if they were somehow changed in the form (should be disabled)
                const originalContract = this.allContracts.find(c => c.contractId === this.contractForm.contractId);
                if (originalContract) {
                    this.contractForm.status = originalContract.status;
                    this.contractForm.paymentProgress = originalContract.paymentProgress;
                }
              }

              const index = this.allContracts.findIndex(c => c.contractId === this.contractForm.contractId);
              if (index !== -1) {
                this.$set(this.allContracts, index, { ...this.contractForm });
                this.$message.success("编辑合同成功！");
              } else {
                  this.$message.error("未找到要编辑的合同！");
                  this.submitLoading = false;
                  this.currentAction = null;
                  return;
              }
            }
            this.saveContractsToLocalStorage();
            this.loadContracts(this.formMode === 'add' ? 1 : this.pageNum); // Refresh and go to first page on add
            this.dialogVisible = false;
            this.submitLoading = false;
            this.currentAction = null;
          } else {
            console.log("Form validation failed");
            this.submitLoading = false; // Ensure loading is reset on validation failure
            this.currentAction = null;
            return false;
          }
        });
      },
    },
  };
  </script>

  <style scoped>
  .contract-management-container {
    padding: 20px;
  }
  .box-card {
    min-width: 900px; /* Or use 100% with overflow-x: auto if needed */
  }
  .actions-bar {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
  }
  .actions-bar > .el-input,
  .actions-bar > .el-select,
  .actions-bar > .el-button {
    margin-bottom: 10px; /* Spacing for wrapped items */
  }
  .pagination-container {
    margin-top: 20px;
    text-align: right;
  }
  .contract-form .el-input-number .el-input__inner {
    text-align: left; /* Element UI default, but good to be explicit if issues arise */
  }
  .contract-details ul {
      list-style-type: disc;
      padding-left: 20px;
  }
  .contract-details li {
      margin-bottom: 5px;
  }
  </style>
