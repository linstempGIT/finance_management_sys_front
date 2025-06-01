<template>
  <div class="ask-record-container">
    <div class="search-bar">
      <el-input placeholder="请输入请假事由查询" style="width: 200px" v-model="searchQuery.name" clearable @keyup.enter.native="load(1)"></el-input>
      <el-select v-model="searchQuery.status" placeholder="审批状态" clearable style="width: 150px; margin-left: 10px;" @change="load(1)">
          <el-option label="待审批" value="待审批"></el-option>
          <el-option label="审批通过" value="审批通过"></el-option>
          <el-option label="审批不通过" value="审批不通过"></el-option>
          <!-- Add other relevant statuses if needed -->
      </el-select>
      <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
      <el-button type="info" plain style="margin-left: 10px" @click="reset" icon="el-icon-refresh">重置</el-button>
    </div>

    <div class="actions-bar">
      <el-button type="success" plain @click="handleAdd" icon="el-icon-plus">发起请假申请</el-button>
      <el-button type="danger" plain @click="delBatch" icon="el-icon-delete" :disabled="!selectedIds.length">撤销选中申请</el-button>
    </div>

    <div class="table-container">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange" v-loading="loading">
        <el-table-column type="selection" width="55" align="center" :selectable="canSelectRow"></el-table-column>
        <el-table-column prop="id" label="序号" width="70" align="center" sortable></el-table-column>
        <!-- EmployeeName and DepartmentName are implicitly the current user's -->
        <el-table-column prop="name" label="请假事由" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="type" label="请假类型" width="100"></el-table-column>
        <el-table-column prop="start" label="开始日期" width="110"></el-table-column>
        <el-table-column prop="end" label="结束日期" width="110"></el-table-column>
        <el-table-column prop="duration" label="时长(天)" width="90" align="center"></el-table-column>
        <el-table-column prop="status" label="审批状态" width="100" align="center">
          <template v-slot="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submissionDate" label="提交日期" width="110"></el-table-column>
        <el-table-column prop="note" label="审批说明" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
            <template v-slot="scope">
                <el-button
                    size="mini"
                    type="text"
                    @click="handleEdit(scope.row)"
                    v-if="canEdit(scope.row.status)"
                >编辑</el-button>
                 <el-button
                    size="mini"
                    type="text"
                    style="color: #E6A23C"
                    @click="handleViewDetails(scope.row)"
                    v-if="!canEdit(scope.row.status)"
                >详情</el-button>
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
    </div>

    <el-dialog :title="formMode === 'add' ? '发起请假申请' : '编辑请假申请'" :visible.sync="formVisible" width="50%" top="5vh" :close-on-click-modal="false" destroy-on-close>
      <el-form label-width="100px" style="padding-right: 50px" :model="form" :rules="rules" ref="formRef">
        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item prop="name" label="请假事由">
                  <el-input v-model="form.name" autocomplete="off" placeholder="请输入请假事由"></el-input>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item prop="type" label="请假类型">
                  <el-select v-model="form.type" placeholder="请选择请假类型" style="width: 100%;">
                    <el-option label="事假" value="事假"></el-option>
                    <el-option label="病假" value="病假"></el-option>
                    <el-option label="年假" value="年假"></el-option>
                    <el-option label="调休" value="调休"></el-option>
                    <el-option label="婚假" value="婚假"></el-option>
                    <el-option label="丧假" value="丧假"></el-option>
                    <el-option label="产假" value="产假"></el-option>
                    <el-option label="陪产假" value="陪产假"></el-option>
                    <el-option label="其他" value="其他"></el-option>
                  </el-select>
                </el-form-item>
            </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item prop="start" label="开始日期">
                  <el-date-picker style="width: 100%"
                      v-model="form.start"
                      type="date"
                      value-format="yyyy-MM-dd"
                      placeholder="选择开始日期"
                      :picker-options="pickerOptionsStart"
                      @change="handleDateChange">
                  </el-date-picker>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item prop="end" label="结束日期">
                  <el-date-picker style="width: 100%"
                      v-model="form.end"
                      type="date"
                      value-format="yyyy-MM-dd"
                      placeholder="选择结束日期"
                      :picker-options="pickerOptionsEnd"
                      @change="handleDateChange">
                  </el-date-picker>
                </el-form-item>
            </el-col>
        </el-row>
         <el-form-item prop="duration" label="请假时长">
            <el-input v-model="form.duration" autocomplete="off" placeholder="根据起止日期自动计算" :disabled="true">
                 <template slot="append">天</template>
            </el-input>
        </el-form-item>
        <el-form-item v-if="formMode === 'edit' && form.status === '审批不通过'" label="驳回说明" prop="note">
            <el-input type="textarea" :value="form.note" :disabled="true" :rows="2"></el-input>
        </el-form-item>

      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="formVisible = false">取 消</el-button>
        <el-button type="primary" @click="save" :loading="saving">提 交</el-button>
      </div>
    </el-dialog>

    <!-- Details Dialog (for non-editable states) -->
    <el-dialog title="请假申请详情" :visible.sync="detailsVisible" width="50%" top="10vh">
        <div v-if="selectedRequestForDetails">
            <el-descriptions :column="1" border size="medium">
                <el-descriptions-item label="请假事由">{{ selectedRequestForDetails.name }}</el-descriptions-item>
                <el-descriptions-item label="请假类型">{{ selectedRequestForDetails.type }}</el-descriptions-item>
                <el-descriptions-item label="开始日期">{{ selectedRequestForDetails.start }}</el-descriptions-item>
                <el-descriptions-item label="结束日期">{{ selectedRequestForDetails.end }}</el-descriptions-item>
                <el-descriptions-item label="请假时长">{{ selectedRequestForDetails.duration }} 天</el-descriptions-item>
                <el-descriptions-item label="提交日期">{{ selectedRequestForDetails.submissionDate }}</el-descriptions-item>
                <el-descriptions-item label="审批状态">
                    <el-tag :type="statusTagType(selectedRequestForDetails.status)">{{ selectedRequestForDetails.status }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="审批说明">{{ selectedRequestForDetails.note || '无' }}</el-descriptions-item>
                 <el-descriptions-item label="当前进度">{{ selectedRequestForDetails.process || 'N/A' }}</el-descriptions-item>
            </el-descriptions>
        </div>
        <span slot="footer" class="dialog-footer">
            <el-button @click="detailsVisible = false">关 闭</el-button>
        </span>
    </el-dialog>

  </div>
</template>

<script>
import initialLeaveRequests from '@/data/leaveRequests.json'; // Import mock data
import { format, differenceInCalendarDays, addDays, parseISO } from 'date-fns'; // For date calculations

export default {
  name: "AskRecord", // Changed name
  data() {
    const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
    return {
      allLeaveRequests: [],
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      saving: false,
      searchQuery: {
        name: '',
        status: ''
      },
      formVisible: false,
      detailsVisible: false,
      selectedRequestForDetails: null,
      formMode: 'add', // 'add' or 'edit'
      form: this.getEmptyForm(),
      user: currentUser,
      rules: {
        name: [ {required: true, message: '请输入请假事由', trigger: 'blur'} ],
        type: [ {required: true, message: '请选择请假类型', trigger: 'change'} ],
        start: [
          {required: true, message: '请选择开始日期', trigger: 'change'},
          { validator: this.validateStartDate, trigger: 'change' }
        ],
        end: [
          {required: true, message: '请选择结束日期', trigger: 'change'},
          { validator: this.validateEndDate, trigger: 'change' }
        ]
      },
      selectedIds: [], // For batch withdrawal
      pickerOptionsStart: {
        disabledDate: time => {
          if (this.form.end) {
            return time.getTime() > parseISO(this.form.end).getTime();
          }
          return false;
        }
      },
      pickerOptionsEnd: {
        disabledDate: time => {
          if (this.form.start) {
            // End date cannot be before start date
            return time.getTime() < parseISO(this.form.start).getTime();
          }
          return false;
        }
      }
    };
  },
  created() {
    this.loadInitialData();
    this.load(1);
  },
  methods: {
    getEmptyForm() {
      const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
      return {
        id: null,
        employeeId: currentUser.id || '',
        employeeName: currentUser.name || '未知用户',
        departmentId: currentUser.departmentId || '', // Assuming departmentId is in user object
        departmentName: currentUser.departmentName || '未知部门', // Assuming departmentName is in user object
        name: '',
        type: '',
        start: '',
        end: '',
        duration: 0,
        status: '待审批',
        process: '待主管审批',
        note: '', //审批说明
        submissionDate: ''
      };
    },
    validateStartDate(rule, value, callback) {
      if (value && this.form.end && parseISO(value).getTime() > parseISO(this.form.end).getTime()) {
        callback(new Error('开始日期不能晚于结束日期'));
      } else {
        callback();
      }
    },
    validateEndDate(rule, value, callback) {
      if (value && this.form.start && parseISO(value).getTime() < parseISO(this.form.start).getTime()) {
        callback(new Error('结束日期不能早于开始日期'));
      } else {
        callback();
      }
    },
    handleDateChange() {
      if (this.form.start && this.form.end) {
        const startDate = parseISO(this.form.start);
        const endDate = parseISO(this.form.end);
        if (endDate >= startDate) {
          this.form.duration = differenceInCalendarDays(endDate, startDate) + 1;
        } else {
          this.form.duration = 0;
        }
      } else {
        this.form.duration = 0;
      }
       // Trigger validation for both date fields if one changes
      if (this.$refs.formRef) {
        this.$refs.formRef.validateField('start');
        this.$refs.formRef.validateField('end');
      }
    },
    loadInitialData() {
        let storedRequests = [];
        try {
            const rawStored = localStorage.getItem("allLeaveRequestsData"); // Use the same key as AskApply
            if (rawStored) {
                storedRequests = JSON.parse(rawStored);
            }
        } catch (e) {
            console.error("Error parsing leave requests from localStorage:", e);
            localStorage.removeItem("allLeaveRequestsData");
        }

        const combinedMap = new Map();
        initialLeaveRequests.forEach(req => combinedMap.set(req.id, { ...req }));
        storedRequests.forEach(req => combinedMap.set(req.id, { ...req }));
        this.allLeaveRequests = Array.from(combinedMap.values());

        if (storedRequests.length === 0 && initialLeaveRequests.length > 0) {
            this.saveAllRequestsToLocalStorage();
        }
    },
    saveAllRequestsToLocalStorage() {
        try {
            localStorage.setItem('allLeaveRequestsData', JSON.stringify(this.allLeaveRequests));
        } catch (e) {
            console.error("Error saving leave requests to localStorage:", e);
            this.$message.error("保存请假数据到本地存储失败！");
        }
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      this.loading = true;

      // Filter for current user's requests
      let userRequests = this.allLeaveRequests.filter(item => item.employeeId === this.user.id);

      // Apply search filters
      if (this.searchQuery.name) {
        userRequests = userRequests.filter(item => item.name.toLowerCase().includes(this.searchQuery.name.toLowerCase()));
      }
      if (this.searchQuery.status) {
        userRequests = userRequests.filter(item => item.status === this.searchQuery.status);
      }

      userRequests.sort((a, b) => {
        if (a.submissionDate && b.submissionDate) {
            const dateComparison = b.submissionDate.localeCompare(a.submissionDate);
            if (dateComparison !== 0) return dateComparison;
        } else if (a.submissionDate) {
            return -1;
        } else if (b.submissionDate) {
            return 1;
        }
        return b.id - a.id;
      });

      this.total = userRequests.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = userRequests.slice(start, end);
      this.loading = false;
    },
    reset() {
      this.searchQuery = { name: '', status: '' };
      this.load(1);
    },
    handleCurrentChange(pageNum) {
      this.load(pageNum);
    },
    statusTagType(status) {
      if (status === "审批通过") return "success";
      if (status === "待审批") return "warning";
      if (status === "审批不通过") return "danger";
      return "info";
    },
    canEdit(status) {
        return ['待审批', '审批不通过'].includes(status); // Allow editing if pending or rejected
    },
    canSelectRow(row, index) {
      return row.status === '待审批'; // Only allow selection for withdrawal if '待审批'
    },
    handleAdd() {
      this.formMode = 'add';
      this.form = this.getEmptyForm();
      this.formVisible = true;
      this.$nextTick(() => {
        this.$refs.formRef.clearValidate();
      });
    },
    handleEdit(row) {
      if (!this.canEdit(row.status)) {
          this.$message.warning('此状态的申请无法编辑。');
          return;
      }
      this.formMode = 'edit';
      this.form = JSON.parse(JSON.stringify(row)); // Deep clone
      this.handleDateChange(); // Recalculate duration on load
      this.formVisible = true;
      this.$nextTick(() => {
        this.$refs.formRef.clearValidate();
      });
    },
    handleViewDetails(row) {
        this.selectedRequestForDetails = JSON.parse(JSON.stringify(row));
        this.detailsVisible = true;
    },
    generateNewId() {
        // Simple ID generation, ensure it's unique enough for local data
        return this.allLeaveRequests.length > 0 ? Math.max(...this.allLeaveRequests.map(r => r.id)) + 1 : 1;
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
            if(this.form.duration <= 0) {
                this.$message.error('请假时长必须大于0天，请检查开始和结束日期。');
                return;
            }
          this.saving = true;
          const dataToSave = { ...this.form };
          dataToSave.submissionDate = format(new Date(), 'yyyy-MM-dd'); // Set/update submission date
          dataToSave.status = '待审批'; // Reset status to pending on new submission/edit
          dataToSave.process = '待主管审批';
          dataToSave.note = this.formMode === 'add' ? '' : (dataToSave.status === '审批不通过' ? dataToSave.note : ''); // Clear approver note on resubmit unless it was a rejection being edited

          if (this.formMode === 'add') {
            dataToSave.id = this.generateNewId();
            // employeeId, employeeName, departmentId, departmentName are set in getEmptyForm
            this.allLeaveRequests.push(dataToSave);
          } else { // Edit
            const index = this.allLeaveRequests.findIndex(req => req.id === dataToSave.id);
            if (index !== -1) {
              this.$set(this.allLeaveRequests, index, dataToSave);
            } else {
              this.$message.error('未找到要更新的申请记录');
              this.saving = false;
              return;
            }
          }
          this.saveAllRequestsToLocalStorage();
          this.$message.success('请假申请已提交');
          this.load(this.formMode === 'add' ? 1 : this.pageNum);
          this.formVisible = false;
          this.saving = false;
        } else {
          this.$message.error('请检查表单填写是否正确。');
          return false;
        }
      });
    },
    handleSelectionChange(rows) {
      this.selectedIds = rows.map(v => v.id);
    },
    delBatch() { // This is "Withdraw Selected Applications"
      if (!this.selectedIds.length) {
        this.$message.warning('请选择要撤销的申请');
        return;
      }

      const canWithdrawCount = this.selectedIds.filter(id => {
        const req = this.allLeaveRequests.find(r => r.id === id);
        return req && req.status === '待审批';
      }).length;

      if (canWithdrawCount !== this.selectedIds.length) {
          this.$message.warning('只能撤销状态为 "待审批" 的申请。请取消选择其他状态的申请。');
          return;
      }

      this.$confirm(`您确定要撤销选中的 ${this.selectedIds.length} 条请假申请吗？`, '确认撤销', {type: "warning"})
        .then(() => {
          this.allLeaveRequests = this.allLeaveRequests.filter(req => !this.selectedIds.includes(req.id));
          this.saveAllRequestsToLocalStorage();
          this.$message.success('选中的申请已撤销');
          this.load(1); // Reload to reflect changes, potentially to page 1
          this.selectedIds = []; // Clear selection
        }).catch(() => {
          this.$message.info('已取消撤销');
        });
    },
  }
}
</script>

<style scoped>
.ask-record-container {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.search-bar > .el-input,
.search-bar > .el-select,
.search-bar > .el-button {
  margin-bottom: 10px; /* Spacing for wrapped items */
}

.actions-bar {
  margin-bottom: 20px; /* Spacing below action buttons */
}
.actions-bar .el-button + .el-button {
  margin-left: 10px; /* Spacing between action buttons */
}

.table-container {
  margin-top: 0; /* Removed top margin as actions-bar provides it */
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
.dialog-footer {
    text-align: right;
}
</style>
