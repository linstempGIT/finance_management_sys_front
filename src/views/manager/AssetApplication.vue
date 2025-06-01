<template>
    <div class="asset-application-container">
      <!-- Search Filters -->
      <div class="search-bar">
        <el-select v-model="searchQuery.assetId" placeholder="选择资产名称" clearable filterable style="width: 200px;">
          <el-option
            v-for="asset in allAssets"
            :key="asset.assetId"
            :label="asset.assetName"
            :value="asset.assetId">
          </el-option>
        </el-select>
        <el-select v-model="searchQuery.status" placeholder="申请状态" clearable style="width: 150px; margin-left: 10px;">
          <el-option label="草稿" value="草稿"></el-option>
          <el-option label="待审批" value="待审批"></el-option>
          <el-option label="已批准" value="已批准"></el-option>
          <el-option label="待归还" value="待归还"></el-option>
          <el-option label="已归还" value="已归还"></el-option>
          <el-option label="已拒绝" value="已拒绝"></el-option>
          <el-option label="已取消" value="已取消"></el-option>
        </el-select>
        <el-date-picker
          v-model="searchQuery.applicationDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="申请开始日期"
          end-placeholder="申请结束日期"
          value-format="yyyy-MM-dd"
          style="margin-left: 10px; width: 240px;">
        </el-date-picker>
        <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
        <el-button type="info" plain style="margin-left: 10px" @click="resetSearch" icon="el-icon-refresh">重置</el-button>
      </div>
  
      <!-- Action Buttons -->
      <div class="actions-bar">
        <el-button type="success" plain @click="handleOpenForm('add')" icon="el-icon-plus">发起资产使用申请</el-button>
      </div>
  
      <!-- Table -->
      <div class="table-container">
        <el-table :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" align="center" :selectable="canSelectRow"></el-table-column>
          <el-table-column prop="applicationId" label="申请ID" width="160" show-overflow-tooltip></el-table-column>
          <el-table-column prop="assetName" label="资产名称" width="180" show-overflow-tooltip></el-table-column>
          <el-table-column prop="usageStartDate" label="使用开始" width="110"></el-table-column>
          <el-table-column prop="usageEndDate" label="使用结束" width="110"></el-table-column>
          <el-table-column prop="purpose" label="用途说明" min-width="180" show-overflow-tooltip></el-table-column>
          <el-table-column prop="urgency" label="紧急程度" width="100" align="center"></el-table-column>
          <el-table-column prop="applicationDate" label="申请日期" width="110"></el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template v-slot="scope">
              <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template v-slot="scope">
              <el-button size="mini" type="text" @click="handleOpenForm('edit', scope.row)" v-if="canEdit(scope.row)">编辑</el-button>
              <el-button size="mini" type="text" @click="handleViewDetails(scope.row)" v-if="!canEdit(scope.row) && !canReturn(scope.row)">详情</el-button>
              <el-button size="mini" type="text" @click="handleRequestReturn(scope.row)" v-if="canReturn(scope.row)">归还资产</el-button>
              <el-button size="mini" type="text" style="color: #F56C6C;" @click="handleCancelApplication(scope.row)" v-if="canCancel(scope.row)">取消申请</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
  
      <!-- Pagination -->
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
  
      <!-- Application Form Dialog -->
      <el-dialog :title="formMode === 'add' ? '发起资产使用申请' : '编辑资产使用申请'" :visible.sync="formVisible" width="600px" top="5vh" :close-on-click-modal="false" destroy-on-close>
        <el-form :model="form" :rules="rules" ref="applicationFormRef" label-width="100px" style="padding: 0 20px;">
          <el-form-item label="申请资产" prop="assetId">
            <el-select v-model="form.assetId" placeholder="请选择要申请的资产" filterable style="width: 100%;" @change="handleAssetChange">
              <el-option
                v-for="asset in availableAssetsForForm"
                :key="asset.assetId"
                :label="`${asset.assetName} (${asset.assetId}) - ${asset.location}`"
                :value="asset.assetId"
                :disabled="asset.status !== '闲置'">
                <span style="float: left">{{ asset.assetName }} ({{asset.assetId}})</span>
                <span style="float: right; color: #8492a6; font-size: 13px">{{ asset.status }} - {{asset.location}}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="使用开始" prop="usageStartDate">
            <el-date-picker v-model="form.usageStartDate" type="datetime" placeholder="选择开始日期时间" style="width: 100%;" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm:ss" :picker-options="pickerOptionsStart"></el-date-picker>
          </el-form-item>
          <el-form-item label="使用结束" prop="usageEndDate">
            <el-date-picker v-model="form.usageEndDate" type="datetime" placeholder="选择结束日期时间" style="width: 100%;" format="yyyy-MM-dd HH:mm" value-format="yyyy-MM-dd HH:mm:ss" :picker-options="pickerOptionsEnd"></el-date-picker>
          </el-form-item>
          <el-form-item label="用途说明" prop="purpose">
            <el-input type="textarea" :rows="3" v-model="form.purpose" placeholder="请详细说明资产用途"></el-input>
          </el-form-item>
          <el-form-item label="紧急程度" prop="urgency">
            <el-radio-group v-model="form.urgency">
              <el-radio label="普通">普通</el-radio>
              <el-radio label="紧急">紧急</el-radio>
              <el-radio label="特急">特急</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="formVisible = false">取 消</el-button>
          <el-button type="info" plain @click="saveApplication('草稿')" :loading="savingDraft" v-if="formMode === 'add' || form.status === '草稿'">保存草稿</el-button>
          <el-button type="primary" @click="saveApplication('待审批')" :loading="savingSubmit">提交申请</el-button>
        </div>
      </el-dialog>
  
       <!-- Details Dialog -->
      <el-dialog title="资产申请详情" :visible.sync="detailsVisible" width="600px">
          <div v-if="selectedApplicationForDetails" class="details-content">
              <el-descriptions :column="1" border size="medium">
                  <el-descriptions-item label="申请ID">{{ selectedApplicationForDetails.applicationId }}</el-descriptions-item>
                  <el-descriptions-item label="资产名称">{{ selectedApplicationForDetails.assetName }} ({{ selectedApplicationForDetails.assetId }})</el-descriptions-item>
                  <el-descriptions-item label="申请人">{{ selectedApplicationForDetails.applicantName }} ({{ selectedApplicationForDetails.departmentName }})</el-descriptions-item>
                  <el-descriptions-item label="申请日期">{{ selectedApplicationForDetails.applicationDate }}</el-descriptions-item>
                  <el-descriptions-item label="使用期间">{{ selectedApplicationForDetails.usageStartDate }} 至 {{ selectedApplicationForDetails.usageEndDate }}</el-descriptions-item>
                  <el-descriptions-item label="用途说明">{{ selectedApplicationForDetails.purpose }}</el-descriptions-item>
                  <el-descriptions-item label="紧急程度">{{ selectedApplicationForDetails.urgency }}</el-descriptions-item>
                  <el-descriptions-item label="审批状态">
                      <el-tag :type="statusTagType(selectedApplicationForDetails.status)">{{ selectedApplicationForDetails.status }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="审批人" v-if="selectedApplicationForDetails.approverName">{{ selectedApplicationForDetails.approverName }}</el-descriptions-item>
                  <el-descriptions-item label="审批日期" v-if="selectedApplicationForDetails.approvalDate">{{ selectedApplicationForDetails.approvalDate }}</el-descriptions-item>
                  <el-descriptions-item label="驳回理由" v-if="selectedApplicationForDetails.status === '已拒绝'">{{ selectedApplicationForDetails.rejectionReason || '无' }}</el-descriptions-item>
                  <el-descriptions-item label="归还申请日" v-if="selectedApplicationForDetails.requestReturnDate">{{ selectedApplicationForDetails.requestReturnDate }}</el-descriptions-item>
                  <el-descriptions-item label="归还确认人" v-if="selectedApplicationForDetails.returnApproverName">{{ selectedApplicationForDetails.returnApproverName }}</el-descriptions-item>
                  <el-descriptions-item label="实际归还日" v-if="selectedApplicationForDetails.returnDate">{{ selectedApplicationForDetails.returnDate }}</el-descriptions-item>
              </el-descriptions>
          </div>
          <span slot="footer" class="dialog-footer">
              <el-button @click="detailsVisible = false">关 闭</el-button>
          </span>
      </el-dialog>
  
    </div>
  </template>
  
  <script>
  import initialAssetsData from '@/data/assets.json';
  import initialAssetApplications from '@/data/assetApplications.json';
  import { format, parseISO, isBefore, isEqual } from 'date-fns';
  import { v4 as uuidv4 } from 'uuid';
  
  const ALL_ASSETS_STORAGE_KEY = 'allAssetsData_v1';
  const ASSET_APPLICATIONS_STORAGE_KEY = 'allAssetApplicationsData_v1';
  
  export default {
    name: "AssetApplication",
    data() {
      const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
      
      const validateUsageStartDate = (rule, value, callback) => {
          if (!value) return callback(new Error('请选择使用开始日期'));
          if (this.form.usageEndDate) {
              const startDate = parseISO(value);
              const endDate = parseISO(this.form.usageEndDate);
              if (isBefore(endDate, startDate) || isEqual(endDate, startDate)) {
                  callback(new Error('开始日期必须早于结束日期'));
              } else {
                  this.$refs.applicationFormRef?.validateField('usageEndDate');
                  callback();
              }
          } else {
              callback();
          }
      };

      const validateUsageEndDate = (rule, value, callback) => {
          if (!value) return callback(new Error('请选择使用结束日期'));
          if (this.form.usageStartDate) {
              const endDate = parseISO(value);
              const startDate = parseISO(this.form.usageStartDate);
              if (isBefore(endDate, startDate) || isEqual(endDate, startDate)) {
                  callback(new Error('结束日期必须晚于开始日期'));
              } else {
                  callback();
              }
          } else {
              callback();
          }
      };

      return {
        allAssets: [], // Holds all asset master data
        allAssetApplications: [],
        tableData: [],
        pageNum: 1,
        pageSize: 10,
        total: 0,
        loading: false,
        savingDraft: false,
        savingSubmit: false,
        searchQuery: {
          assetId: null,
          status: null,
          applicationDateRange: [], 
        },
        formVisible: false,
        detailsVisible: false,
        selectedApplicationForDetails: null,
        formMode: 'add', 
        form: this.getEmptyForm(currentUser),
        user: currentUser,
        rules: {
          assetId: [{ required: true, message: '请选择申请的资产', trigger: 'change' }],
          usageStartDate: [
              { required: true, message: '请选择使用开始日期时间', trigger: 'change' },
              { validator: validateUsageStartDate, trigger: 'change'}
          ],
          usageEndDate: [
              { required: true, message: '请选择使用结束日期时间', trigger: 'change' },
              { validator: validateUsageEndDate, trigger: 'change'}
          ],
          purpose: [{ required: true, message: '请输入用途说明', trigger: 'blur' }, {min: 10, message: '用途说明至少10个字符', trigger: 'blur'}],
          urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
        },
        selectedTableRows: [], 
        pickerOptionsStart: {
          disabledDate: time => {
            const today = new Date();
            today.setHours(0,0,0,0);
            if (this.form.usageEndDate) {
              return time.getTime() >= parseISO(this.form.usageEndDate).getTime();
            }
            return time.getTime() < today.getTime(); 
          }
        },
        pickerOptionsEnd: {
          disabledDate: time => {
            const today = new Date();
            today.setHours(0,0,0,0); 
            if (this.form.usageStartDate) {
              return time.getTime() <= parseISO(this.form.usageStartDate).getTime();
            }
            return time.getTime() < today.getTime();
          }
        }
      };
    },
    computed: {
        availableAssetsForForm() {
            // Show all assets in the form, disabled state handles availability
            return this.allAssets;
        }
    },
    created() {
      this.loadInitialAssets(); // Load assets first
      this.loadInitialApplications();
      this.load(1);
    },
    methods: {
      getEmptyForm(currentUser) {
        return {
          applicationId: null,
          assetId: null,
          assetName: '', 
          applicantId: currentUser.id || '',
          applicantName: currentUser.name || currentUser.username || '未知用户',
          departmentName: currentUser.departmentName || '未知部门',
          applicationDate: null, 
          approverId: null,
          approverName: null,
          approvalDate: null,
          usageStartDate: '',
          usageEndDate: '',
          purpose: '',
          status: '草稿',
          urgency: '普通',
          rejectionReason: null,
          requestReturnDate: null, // Date user initiated return
          returnDate: null,         // Date financial confirmed return
          returnApproverId: null,
          returnApproverName: null,
        };
      },
      loadInitialAssets() {
          let storedAssets = [];
          try {
              const rawStored = localStorage.getItem(ALL_ASSETS_STORAGE_KEY);
              if (rawStored) {
                  storedAssets = JSON.parse(rawStored);
              }
          } catch (e) {
              console.error("Error parsing assets from localStorage:", e);
              localStorage.removeItem(ALL_ASSETS_STORAGE_KEY);
          }

          if (storedAssets && storedAssets.length > 0) {
              this.allAssets = storedAssets;
          } else {
              this.allAssets = [...initialAssetsData];
              this.saveAllAssetsToLocalStorage(); // Prime localStorage if empty
          }
      },
      saveAllAssetsToLocalStorage() {
          // This component primarily reads asset statuses. AssetApproval.vue writes them.
          // However, good to have if we ever modify assets here or want to ensure initial load.
          try {
              localStorage.setItem(ALL_ASSETS_STORAGE_KEY, JSON.stringify(this.allAssets));
          } catch (e) {
              console.error("Error saving assets to localStorage:", e);
          }
      },
      loadInitialApplications() {
          let storedApplications = [];
          try {
              const rawStored = localStorage.getItem(ASSET_APPLICATIONS_STORAGE_KEY);
              if (rawStored) storedApplications = JSON.parse(rawStored);
          } catch (e) {
              console.error("Error parsing asset applications from localStorage:", e);
              localStorage.removeItem(ASSET_APPLICATIONS_STORAGE_KEY);
          }
  
          const combinedMap = new Map();
          initialAssetApplications.forEach(app => combinedMap.set(app.applicationId, { ...app, ...this.getEmptyForm(this.user), ...app })); // Ensure all fields exist
          storedApplications.forEach(app => combinedMap.set(app.applicationId, { ...this.getEmptyForm(this.user), ...app }));
          this.allAssetApplications = Array.from(combinedMap.values());
  
          if (storedApplications.length === 0 && initialAssetApplications.length > 0 && this.allAssetApplications.length > 0) {
              this.saveAllApplicationsToLocalStorage(); 
          }
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
  
        // Refresh assets from localStorage before filtering applications,
        // in case AssetApproval.vue updated asset statuses.
        this.loadInitialAssets(); 

        let filtered = this.allAssetApplications.filter(app => {
            const appApplicantId = app.applicantId !== undefined && app.applicantId !== null ? String(app.applicantId) : '';
            const currentUserId = this.user.id !== undefined && this.user.id !== null ? String(this.user.id) : '';
            return appApplicantId === currentUserId;
        });
  
        if (this.searchQuery.assetId) {
          filtered = filtered.filter(app => app.assetId === this.searchQuery.assetId);
        }
        if (this.searchQuery.status) {
          filtered = filtered.filter(app => app.status === this.searchQuery.status);
        }
        if (this.searchQuery.applicationDateRange && this.searchQuery.applicationDateRange.length === 2) {
          const [startDateStr, endDateStr] = this.searchQuery.applicationDateRange;
          const searchStartDateTime = parseISO(startDateStr).getTime();
          const searchEndDateTime = parseISO(endDateStr).getTime() + (24 * 60 * 60 * 1000 - 1);
          filtered = filtered.filter(app => {
              if (!app.applicationDate) return false;
              const appDate = parseISO(app.applicationDate).getTime();
              return appDate >= searchStartDateTime && appDate <= searchEndDateTime;
          });
        }
  
        filtered.sort((a, b) => {
            const dateA = a.applicationDate ? parseISO(a.applicationDate) : null;
            const dateB = b.applicationDate ? parseISO(b.applicationDate) : null;
            if(dateB && dateA) {
                if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime();
            } else if (dateB) return 1;
            else if (dateA) return -1;
            return (b.applicationId || '').localeCompare(a.applicationId || '');
        });
  
        this.total = filtered.length;
        const start = (this.pageNum - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.tableData = filtered.slice(start, end);
        this.loading = false;
      },
      resetSearch() {
        this.searchQuery = { assetId: null, status: null, applicationDateRange: [] };
        this.load(1);
      },
      handleCurrentChange(pageNum) {
        this.load(pageNum);
      },
      handleSelectionChange(selection) {
          this.selectedTableRows = selection;
      },
      canSelectRow(row, index){
          return ['草稿', '待审批'].includes(row.status);
      },
      statusTagType(status) {
        const types = {
          '草稿': 'info',
          '待审批': 'warning',
          '已批准': 'success',
          '待归还': 'warning', // Or 'primary'
          '已归还': 'info', // Or 'success' if considered a final positive state
          '已拒绝': 'danger',
          '已取消': 'info',
        };
        return types[status] || 'default';
      },
      canEdit(application) {
        return ['草稿', '已拒绝'].includes(application.status);
      },
      canCancel(application) {
          return ['草稿', '待审批'].includes(application.status);
      },
      canReturn(application) {
          return application.status === '已批准';
      },
      handleAssetChange(assetId) {
          const selectedAsset = this.allAssets.find(a => a.assetId === assetId);
          if (selectedAsset) {
              this.form.assetName = selectedAsset.assetName;
              if (selectedAsset.status !== '闲置') {
                  this.$message.warning(`资产 "${selectedAsset.assetName}" 当前状态为 "${selectedAsset.status}"，可能无法立即使用或申请。`);
              }
          } else {
              this.form.assetName = '';
          }
      },
      handleOpenForm(mode, row = null) {
        this.formMode = mode;
        if (mode === 'add') {
          this.form = this.getEmptyForm(this.user);
        } else {
          this.form = { ...this.getEmptyForm(this.user), ...JSON.parse(JSON.stringify(row)) };
        }
        // Refresh assets data to get latest statuses for the form dropdown
        this.loadInitialAssets(); 
        this.formVisible = true;
        this.$nextTick(() => {
          this.$refs.applicationFormRef?.clearValidate();
        });
      },
      saveApplication(targetStatus) {
        this.$refs.applicationFormRef.validate((valid) => {
          if (valid) {
            if (targetStatus === '草稿') this.savingDraft = true;
            else this.savingSubmit = true;
  
            const applicationData = { ...this.form };
            applicationData.status = targetStatus;
            applicationData.applicationDate = format(new Date(), 'yyyy-MM-dd'); 
            applicationData.applicantId = this.user.id || '';
            applicationData.applicantName = this.user.name || this.user.username || '未知用户';
            applicationData.departmentName = this.user.departmentName || '未知部门';

            if(applicationData.assetId && !applicationData.assetName) {
                const selectedAsset = this.allAssets.find(a => a.assetId === applicationData.assetId);
                if(selectedAsset) applicationData.assetName = selectedAsset.assetName;
            }
  
            if (this.formMode === 'add' && !applicationData.applicationId) {
              applicationData.applicationId = `AS_${uuidv4().slice(0,8).toUpperCase()}`;
              this.allAssetApplications.push(applicationData);
            } else {
              const index = this.allAssetApplications.findIndex(app => app.applicationId === applicationData.applicationId);
              if (index !== -1) {
                if (this.allAssetApplications[index].status === '已拒绝' && targetStatus === '待审批') {
                    applicationData.approverId = null;
                    applicationData.approverName = null;
                    applicationData.approvalDate = null;
                    applicationData.rejectionReason = null;
                }
                this.$set(this.allAssetApplications, index, applicationData);
              } else {
                this.$message.error("未找到要更新的申请记录");
                if (targetStatus === '草稿') this.savingDraft = false; else this.savingSubmit = false;
                return;
              }
            }
            
            this.saveAllApplicationsToLocalStorage(); 

            this.$message.success(`资产申请已${targetStatus === '草稿' ? '保存为草稿' : '提交'}`);
            this.load(this.formMode === 'add' ? 1 : this.pageNum);
            this.formVisible = false;
          } else {
            this.$message.error("请检查表单填写是否完整且正确。");
          }
          if (targetStatus === '草稿') this.savingDraft = false; else this.savingSubmit = false;
        });
      },
      handleViewDetails(row) {
          this.selectedApplicationForDetails = JSON.parse(JSON.stringify(row));
          this.detailsVisible = true;
      },
      handleCancelApplication(row) {
          if (!this.canCancel(row)) {
              this.$message.warning("此状态的申请无法取消。");
              return;
          }
          this.$confirm(`确定要取消资产 "${row.assetName}" 的申请 (ID: ${row.applicationId})吗?`, '确认取消', { type: 'warning' })
              .then(() => {
                  const index = this.allAssetApplications.findIndex(app => app.applicationId === row.applicationId);
                  if (index !== -1) {
                      if (row.status === '草稿') { 
                          this.allAssetApplications.splice(index, 1);
                      } else { 
                          this.allAssetApplications[index].status = '已取消';
                          this.allAssetApplications[index].rejectionReason = '用户主动取消'; 
                      }
                      this.saveAllApplicationsToLocalStorage();
                      this.$message.success("申请已取消");
                      this.load(this.pageNum);
                  } else {
                      this.$message.error("未找到要取消的申请记录");
                  }
              }).catch(() => { /* User clicked cancel */ });
      },
      handleRequestReturn(row) {
          this.$confirm(`确定要归还资产 "${row.assetName}" 吗？提交后将等待财务确认。`, '申请归还资产', { type: 'warning' })
              .then(() => {
                  const index = this.allAssetApplications.findIndex(app => app.applicationId === row.applicationId);
                  if (index !== -1) {
                      this.allAssetApplications[index].status = '待归还';
                      this.allAssetApplications[index].requestReturnDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
                      this.saveAllApplicationsToLocalStorage();
                      this.$message.success("归还申请已提交，请等待确认。");
                      this.load(this.pageNum);
                  } else {
                      this.$message.error("未找到申请记录");
                  }
              }).catch(() => { /* User clicked cancel */ });
      }
    }
  };
  </script>
  
  <style scoped>
  .asset-application-container {
    padding: 15px;
  }
  .search-bar, .actions-bar {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  .search-bar > .el-select,
  .search-bar > .el-input,
  .search-bar > .el-date-picker, /* Corrected from el-date-editor */
  .search-bar > .el-button,
  .actions-bar > .el-button {
    margin-right: 10px; 
    margin-bottom: 10px; 
  }
  .table-container {
    margin-bottom: 15px;
  }
  .pagination-container {
    text-align: right;
  }
  .dialog-footer {
      text-align: right;
  }
  .details-content .el-descriptions {
      margin-top: 10px;
  }
  </style>
