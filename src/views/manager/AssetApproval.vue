<template>
  <div class="asset-approval-container">
    <div class="search">
      <el-input placeholder="请输入资产名称或申请人" style="width: 240px" v-model="searchQuery.text" clearable @keyup.enter.native="load(1)"></el-input>
      <el-select v-model="searchQuery.status" placeholder="审批状态" clearable style="width: 150px; margin-left: 10px;" @change="load(1)">
        <el-option label="待审批" value="待审批"></el-option>
        <el-option label="已批准" value="已批准"></el-option>
        <el-option label="待归还" value="待归还"></el-option>
        <el-option label="已归还" value="已归还"></el-option>
        <el-option label="已拒绝" value="已拒绝"></el-option>
        <el-option label="已取消" value="已取消"></el-option>
        <el-option label="草稿" value="草稿"></el-option>
      </el-select>
      <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
      <el-button type="info" plain style="margin-left: 10px" @click="resetSearch" icon="el-icon-refresh">重置</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="applicationId" label="申请ID" width="150" align="center" sortable></el-table-column>
        <el-table-column prop="applicantName" label="申请人" width="100" show-overflow-tooltip></el-table-column>
        <el-table-column prop="departmentName" label="所属部门" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="assetName" label="资产名称" min-width="130" show-overflow-tooltip></el-table-column>
        <el-table-column prop="purpose" label="申请事由" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="applicationDate" label="申请日期" width="100"></el-table-column>
        <el-table-column prop="usageStartDate" label="使用开始" width="100"></el-table-column>
        <el-table-column prop="usageEndDate" label="使用结束" width="100"></el-table-column>
        <el-table-column prop="status" label="审批状态" width="100" align="center">
          <template v-slot="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approverName" label="初审人" width="90" show-overflow-tooltip></el-table-column>
        <el-table-column prop="returnApproverName" label="归还确认人" width="100" show-overflow-tooltip></el-table-column>
        <el-table-column prop="rejectionReason" label="审批/归还说明" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template v-slot="scope">
            <el-button
                type="primary" plain size="mini"
                @click="handleApproveDialog(scope.row)"
                v-if="canInitialApprove(scope.row)"
                :disabled="isSelfApprovalByFinancial(scope.row)">审批</el-button>
            <el-button
                type="success" plain size="mini"
                @click="handleReturnDialog(scope.row)"
                v-if="canConfirmReturn(scope.row)">确认归还</el-button>
            <el-button type="text" size="mini" @click="viewDetails(scope.row)"
                v-if="!canInitialApprove(scope.row) && !canConfirmReturn(scope.row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination background @current-change="handleCurrentChange" :current-page="pageNum" :page-size="pageSize" layout="total, prev, pager, next" :total="total"></el-pagination>
      </div>
    </div>

    <!-- Initial Approval Dialog -->
    <el-dialog title="资产使用审批" :visible.sync="approvalFormVisible" width="480px" :close-on-click-modal="false" destroy-on-close>
      <div v-if="currentApplication" style="margin-bottom:15px;">
            <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="申请人">{{ currentApplication.applicantName }} ({{ currentApplication.departmentName }})</el-descriptions-item>
                <el-descriptions-item label="资产名称">{{ currentApplication.assetName }}</el-descriptions-item>
                <el-descriptions-item label="申请事由">{{ currentApplication.purpose }}</el-descriptions-item>
                <el-descriptions-item label="使用时间">{{ currentApplication.usageStartDate }} 至 {{ currentApplication.usageEndDate }}</el-descriptions-item>
                <el-descriptions-item label="紧急程度">{{ currentApplication.urgency }}</el-descriptions-item>
            </el-descriptions>
      </div>
      <el-form label-width="80px" :model="approvalForm" :rules="approvalRules" ref="approvalFormRef">
        <el-form-item label="审批操作" prop="newStatus">
          <el-radio-group v-model="approvalForm.newStatus">
            <el-radio label="已批准">审批通过</el-radio>
            <el-radio label="已拒绝">审批不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批说明" prop="note">
          <el-input type="textarea" :rows="3" v-model="approvalForm.note" autocomplete="off" placeholder="请输入审批说明 (若不通过则必填)"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="approvalFormVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveInitialApproval" :loading="savingApproval">确 定</el-button>
      </div>
    </el-dialog>

    <!-- Return Confirmation Dialog -->
    <el-dialog title="资产归还确认" :visible.sync="returnFormVisible" width="480px" :close-on-click-modal="false" destroy-on-close>
        <div v-if="currentApplication" style="margin-bottom:15px;">
            <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="申请人">{{ currentApplication.applicantName }}</el-descriptions-item>
                <el-descriptions-item label="资产名称">{{ currentApplication.assetName }} ({{ currentApplication.assetId }})</el-descriptions-item>
                <el-descriptions-item label="原定使用">{{ currentApplication.usageStartDate }} 至 {{ currentApplication.usageEndDate }}</el-descriptions-item>
                <el-descriptions-item label="申请归还日">{{ currentApplication.requestReturnDate | formatDate }}</el-descriptions-item>
            </el-descriptions>
        </div>
        <el-form label-width="80px" :model="returnForm" :rules="returnRules" ref="returnFormRef">
            <el-form-item label="归还备注" prop="returnNote">
                <el-input type="textarea" :rows="3" v-model="returnForm.returnNote" placeholder="选填，请输入归还备注或资产状况说明"></el-input>
            </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
            <el-button @click="returnFormVisible = false">取 消</el-button>
            <el-button type="primary" @click="saveReturnConfirmation" :loading="savingReturn">确 定归还</el-button>
        </div>
    </el-dialog>

     <!-- Details Dialog -->
    <el-dialog title="资产申请详情" :visible.sync="detailsVisible" width="550px">
        <div v-if="selectedRequestForDetails">
            <el-descriptions :column="1" border size="medium">
                <el-descriptions-item label="申请ID">{{ selectedRequestForDetails.applicationId }}</el-descriptions-item>
                <el-descriptions-item label="申请人">{{ selectedRequestForDetails.applicantName }} ({{selectedRequestForDetails.departmentName}})</el-descriptions-item>
                <el-descriptions-item label="资产名称">{{ selectedRequestForDetails.assetName }} ({{ selectedRequestForDetails.assetId }})</el-descriptions-item>
                <el-descriptions-item label="申请事由">{{ selectedRequestForDetails.purpose }}</el-descriptions-item>
                <el-descriptions-item label="申请日期">{{ selectedRequestForDetails.applicationDate }}</el-descriptions-item>
                <el-descriptions-item label="使用期间">{{ selectedRequestForDetails.usageStartDate }} 至 {{ selectedRequestForDetails.usageEndDate }}</el-descriptions-item>
                <el-descriptions-item label="紧急程度">{{ selectedRequestForDetails.urgency }}</el-descriptions-item>
                <el-descriptions-item label="审批状态">
                    <el-tag :type="statusTagType(selectedRequestForDetails.status)">{{ selectedRequestForDetails.status }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="初审人">{{ selectedRequestForDetails.approverName || 'N/A' }}</el-descriptions-item>
                <el-descriptions-item label="初审日期">{{ selectedRequestForDetails.approvalDate || 'N/A' }}</el-descriptions-item>
                <el-descriptions-item label="初审说明">{{ selectedRequestForDetails.rejectionReason || (selectedRequestForDetails.status === '已批准' ? '通过' : '无') }}</el-descriptions-item>
                <el-descriptions-item label="归还申请日" v-if="selectedRequestForDetails.requestReturnDate">{{ selectedRequestForDetails.requestReturnDate }}</el-descriptions-item>
                <el-descriptions-item label="归还确认人" v-if="selectedRequestForDetails.returnApproverName">{{ selectedRequestForDetails.returnApproverName }}</el-descriptions-item>
                <el-descriptions-item label="实际归还日" v-if="selectedRequestForDetails.returnDate">{{ selectedRequestForDetails.returnDate }}</el-descriptions-item>
                <el-descriptions-item label="归还备注" v-if="selectedRequestForDetails.returnNote">{{ selectedRequestForDetails.returnNote }}</el-descriptions-item>
            </el-descriptions>
        </div>
        <span slot="footer" class="dialog-footer"> <el-button @click="detailsVisible = false">关 闭</el-button> </span>
    </el-dialog>
  </div>
</template>

<script>
import initialAssetsData from '@/data/assets.json';
import initialAssetApplications from '@/data/assetApplications.json';
import { format, parseISO } from 'date-fns';

const ALL_ASSETS_STORAGE_KEY = 'allAssetsData_v1';
const ASSET_APPLICATIONS_STORAGE_KEY = 'allAssetApplicationsData_v1';

export default {
  name: "AssetApproval",
  filters: {
    formatDate(value) {
      if (!value) return '';
      try {
        return format(parseISO(value), 'yyyy-MM-dd HH:mm');
      } catch (e) {
        return value; // Fallback if parsing fails
      }
    }
  },
  data() {
    const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
    return {
      allAssets: [], // Master list of all assets
      allAssetApplications: [],
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      savingApproval: false,
      savingReturn: false,
      searchQuery: { text: '', status: '' },
      
      currentApplication: null, // For both approval and return dialogs

      approvalFormVisible: false,
      approvalForm: { newStatus: '已批准', note: '' },
      approvalRules: {
        newStatus: [{ required: true, message: '请选择审批操作', trigger: 'change' }],
        note: [{ validator: (rule, value, callback) => {
              if (this.approvalForm.newStatus === '已拒绝' && !value) {
                callback(new Error('审批不通过时，必须填写审批说明'));
              } else { callback(); }
            }, trigger: 'blur' }]
      },

      returnFormVisible: false,
      returnForm: { returnNote: '' },
      returnRules: { /* No required fields for now */ },

      detailsVisible: false,
      selectedRequestForDetails: null,
      user: currentUser,
    };
  },
  created() {
    this.loadInitialAssets();
    this.loadInitialApplicationData();
    this.load(1);
  },
  methods: {
    loadInitialAssets() {
        let storedAssets = [];
        try {
            const rawStored = localStorage.getItem(ALL_ASSETS_STORAGE_KEY);
            if (rawStored) storedAssets = JSON.parse(rawStored);
        } catch (e) {
            console.error("Error parsing assets from localStorage:", e);
            localStorage.removeItem(ALL_ASSETS_STORAGE_KEY);
        }
        if (storedAssets && storedAssets.length > 0) {
            this.allAssets = storedAssets;
        } else {
            this.allAssets = [...initialAssetsData];
            this.saveAllAssetsToLocalStorage(); // Prime if empty
        }
    },
    saveAllAssetsToLocalStorage() {
        try {
            localStorage.setItem(ALL_ASSETS_STORAGE_KEY, JSON.stringify(this.allAssets));
        } catch (e) {
            console.error("Error saving assets to localStorage:", e);
            // this.$message.error("保存资产主数据到本地存储失败！"); // Optional
        }
    },
    loadInitialApplicationData() {
        let storedApplications = [];
        try {
            const rawStored = localStorage.getItem(ASSET_APPLICATIONS_STORAGE_KEY);
            if (rawStored) storedApplications = JSON.parse(rawStored);
        } catch (e) {
            console.error(`Error parsing asset applications from localStorage (key: ${ASSET_APPLICATIONS_STORAGE_KEY}):`, e);
            localStorage.removeItem(ASSET_APPLICATIONS_STORAGE_KEY); 
        }
        const combinedMap = new Map();
        initialAssetApplications.forEach(app => combinedMap.set(app.applicationId, { ...this.getEmptyApplicationFields(), ...app }));
        storedApplications.forEach(app => combinedMap.set(app.applicationId, { ...this.getEmptyApplicationFields(), ...app }));
        this.allAssetApplications = Array.from(combinedMap.values());

        if ((storedApplications.length === 0 && initialAssetApplications.length > 0) || 
            (storedApplications.length > 0 && storedApplications.length < this.allAssetApplications.length)) {
           this.saveAllApplicationsToLocalStorage();
        }
    },
    getEmptyApplicationFields() { // Helper to ensure all application objects have all expected fields
        return {
          requestReturnDate: null, returnDate: null, returnApproverId: null,
          returnApproverName: null, returnNote: null,
          approverId: null, approverName: null, approvalDate: null, rejectionReason: null,
        };
    },
    saveAllApplicationsToLocalStorage() {
        try {
            localStorage.setItem(ASSET_APPLICATIONS_STORAGE_KEY, JSON.stringify(this.allAssetApplications));
        } catch (e) {
            console.error("Error saving asset applications to localStorage:", e);
            this.$message.error("保存资产申请数据到本地存储失败！");
        }
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      this.loading = true;
      // It's good practice to reload assets in case their status changed via another user/tab (though less likely in local demo)
      // this.loadInitialAssets(); // Re-consider if this causes issues or is too frequent. For now, load on created.

      let filteredApplications = [...this.allAssetApplications];
      if (this.searchQuery.text) {
        const searchTextLower = this.searchQuery.text.toLowerCase();
        filteredApplications = filteredApplications.filter(item =>
          (item.assetName && item.assetName.toLowerCase().includes(searchTextLower)) ||
          (item.applicantName && item.applicantName.toLowerCase().includes(searchTextLower))
        );
      }
      if (this.searchQuery.status) {
        filteredApplications = filteredApplications.filter(item => item.status === this.searchQuery.status);
      }

      filteredApplications.sort((a, b) => {
        const statusOrder = { '待审批': 1, '待归还': 2 }; // Higher priority statuses
        const statusA = statusOrder[a.status] || 3;
        const statusB = statusOrder[b.status] || 3;
        if (statusA !== statusB) return statusA - statusB;
        
        const dateA = a.applicationDate ? parseISO(a.applicationDate) : null;
        const dateB = b.applicationDate ? parseISO(b.applicationDate) : null;
        if (dateB && dateA) { if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime(); }
        else if (dateB) return 1; else if (dateA) return -1;
        return (b.applicationId || '').localeCompare(a.applicationId || '');
      });

      this.total = filteredApplications.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredApplications.slice(start, end);
      this.loading = false;
    },
    resetSearch() {
      this.searchQuery = { text: '', status: '' };
      this.load(1);
    },
    handleCurrentChange(pageNum) { this.load(pageNum); },
    statusTagType(status) {
      const types = {
          '已批准': 'success', '待审批': 'warning', '已拒绝': 'danger',
          '待归还': 'warning', '已归还': 'info', // '已归还' could be 'success' too
          '已取消': 'info', '草稿': 'info',
      };
      return types[status] || 'default';
    },
    isSelfApprovalByFinancial(request) {
        const applicantIdAsNumber = Number(request.applicantId);
        const userIdAsNumber = Number(this.user.id);
        const userRole = String(this.user.role || '').toUpperCase();
        if (isNaN(applicantIdAsNumber) || isNaN(userIdAsNumber)) {
            return userRole === 'FINANCIAL' && String(request.applicantId) === String(this.user.id);
        }
        return userRole === 'FINANCIAL' && applicantIdAsNumber === userIdAsNumber;
    },
    canInitialApprove(request) {
        if (request.status !== '待审批') return false;
        const userRole = String(this.user.role || '').toUpperCase();
        const userLevel = String(this.user.level || '').toUpperCase();
        if (userRole === 'ADMIN' || userLevel === '主管') {
            return !(userRole === 'FINANCIAL' && this.isSelfApprovalByFinancial(request));
        }
        if (userRole === 'FINANCIAL') return !this.isSelfApprovalByFinancial(request);
        return false;
    },
    canConfirmReturn(request) {
        if (request.status !== '待归还') return false;
        const userRole = String(this.user.role || '').toUpperCase();
        // Typically FINANCIAL or ADMIN can confirm returns
        return userRole === 'FINANCIAL' || userRole === 'ADMIN';
    },
    handleApproveDialog(row) {
      if (!this.canInitialApprove(row) || (String(this.user.role||'').toUpperCase() === 'FINANCIAL' && this.isSelfApprovalByFinancial(row))) {
        this.$message.error("您没有权限审批此申请，或财务人员不能审批自己的资产申请。");
        return;
      }
      this.currentApplication = JSON.parse(JSON.stringify(row));
      this.approvalForm = { newStatus: '已批准', note: '' };
      this.approvalFormVisible = true;
      this.$nextTick(() => { this.$refs.approvalFormRef?.clearValidate(); });
    },
    saveInitialApproval() {
      this.$refs.approvalFormRef.validate((valid) => {
        if (valid) {
          this.savingApproval = true;
          const appIndex = this.allAssetApplications.findIndex(app => app.applicationId === this.currentApplication.applicationId);
          if (appIndex !== -1) {
            const updatedApp = { ...this.allAssetApplications[appIndex] };
            updatedApp.status = this.approvalForm.newStatus;
            updatedApp.approverId = this.user.id;
            updatedApp.approverName = this.user.name || this.user.username;
            updatedApp.approvalDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            updatedApp.rejectionReason = this.approvalForm.newStatus === '已拒绝' ? this.approvalForm.note : null;
            this.$set(this.allAssetApplications, appIndex, updatedApp);
            this.saveAllApplicationsToLocalStorage();

            // Update asset status if approved
            if (updatedApp.status === '已批准') {
                const assetIndex = this.allAssets.findIndex(a => a.assetId === updatedApp.assetId);
                if (assetIndex !== -1) {
                    this.$set(this.allAssets[assetIndex], 'status', '使用中'); // Or '已领用'
                    this.saveAllAssetsToLocalStorage();
                }
            }
            this.$message.success('审批操作成功');
            this.load(this.pageNum); 
            this.approvalFormVisible = false;
          } else { this.$message.error('未找到申请记录'); }
          this.savingApproval = false;
          this.currentApplication = null;
        } else { this.$message.error('请检查审批表单。'); }
      });
    },
    handleReturnDialog(row) {
        if (!this.canConfirmReturn(row)) {
            this.$message.warning("此申请状态无法进行归还确认。");
            return;
        }
        this.currentApplication = JSON.parse(JSON.stringify(row));
        this.returnForm = { returnNote: this.currentApplication.returnNote || '' }; // Pre-fill if exists
        this.returnFormVisible = true;
        this.$nextTick(() => { this.$refs.returnFormRef?.clearValidate(); });
    },
    saveReturnConfirmation() {
        this.$refs.returnFormRef.validate((valid) => {
            if (valid) {
                this.savingReturn = true;
                const appIndex = this.allAssetApplications.findIndex(app => app.applicationId === this.currentApplication.applicationId);
                if (appIndex !== -1) {
                    const updatedApp = { ...this.allAssetApplications[appIndex] };
                    updatedApp.status = '已归还';
                    updatedApp.returnDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
                    updatedApp.returnApproverId = this.user.id;
                    updatedApp.returnApproverName = this.user.name || this.user.username;
                    updatedApp.returnNote = this.returnForm.returnNote; // Save return notes
                    // If initial approval note was in rejectionReason, clear it or use a specific field
                    // For simplicity, let's assume rejectionReason is for initial approval.
                    // If a return is rejected (not implemented here), it would need its own field.
                    
                    this.$set(this.allAssetApplications, appIndex, updatedApp);
                    this.saveAllApplicationsToLocalStorage();

                    // Update asset master status to '闲置'
                    const assetIndex = this.allAssets.findIndex(a => a.assetId === updatedApp.assetId);
                    if (assetIndex !== -1) {
                        this.$set(this.allAssets[assetIndex], 'status', '闲置');
                        this.saveAllAssetsToLocalStorage();
                    }
                    this.$message.success('资产归还已确认');
                    this.load(this.pageNum);
                    this.returnFormVisible = false;
                } else { this.$message.error('未找到申请记录'); }
                this.savingReturn = false;
                this.currentApplication = null;
            } else { this.$message.error('请检查归还表单。'); }
        });
    },
    viewDetails(row) {
        this.selectedRequestForDetails = JSON.parse(JSON.stringify(row));
        this.detailsVisible = true;
    },
  }
}
</script>

<style scoped>
.asset-approval-container { padding: 20px; }
.search { margin-bottom: 20px; display: flex; align-items: center; flex-wrap: wrap; }
.search > .el-input, .search > .el-select, .search > .el-button { margin-bottom: 10px; margin-right: 10px; }
.search > .el-button:last-child { margin-right: 0; }
.table { margin-top: 0; }
.pagination { margin-top: 20px; text-align: right; }
.dialog-footer { text-align: right; }
.el-descriptions { margin-bottom: 10px; }
</style>
