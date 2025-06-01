<template>
  <div class="ask-apply-container">
    <div class="search">
      <el-input placeholder="请输入请假事由或员工姓名" style="width: 240px" v-model="searchQuery.text" clearable @keyup.enter.native="load(1)"></el-input>
      <el-select v-model="searchQuery.status" placeholder="审批状态" clearable style="width: 150px; margin-left: 10px;" @change="load(1)">
          <el-option label="待审批" value="待审批"></el-option>
          <el-option label="审批通过" value="审批通过"></el-option>
          <el-option label="审批不通过" value="审批不通过"></el-option>
      </el-select>
      <el-button type="primary" plain style="margin-left: 10px" @click="load(1)" icon="el-icon-search">查询</el-button>
      <el-button type="info" plain style="margin-left: 10px" @click="resetSearch" icon="el-icon-refresh">重置</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="id" label="序号" width="70" align="center" sortable></el-table-column>
        <el-table-column prop="employeeName" label="员工姓名" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="departmentName" label="所属部门" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="name" label="请假事由" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="type" label="请假类型" width="100"></el-table-column>
        <el-table-column prop="start" label="开始日期" width="110"></el-table-column>
        <el-table-column prop="end" label="结束日期" width="110"></el-table-column>
        <el-table-column prop="duration" label="时长(天)" width="90" align="center"></el-table-column>
        <el-table-column prop="submissionDate" label="提交日期" width="110"></el-table-column>
        <el-table-column prop="status" label="审批状态" width="100" align="center">
          <template v-slot="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="审批说明" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template v-slot="scope">
            <el-button
                type="primary"
                plain
                size="mini"
                @click="handleApprove(scope.row)"
                v-if="canApprove(scope.row)"
                :disabled="isSelfApprovalByFinancial(scope.row)"
            >审批</el-button>
             <el-button
                type="text"
                size="mini"
                @click="viewDetails(scope.row)"
                v-else
            >详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
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

    <!-- Approval Dialog -->
    <el-dialog title="请假审批" :visible.sync="approvalFormVisible" width="450px" :close-on-click-modal="false" destroy-on-close>
      <div v-if="currentApprovalRequest" style="margin-bottom:15px;">
            <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="员工">{{ currentApprovalRequest.employeeName }} ({{ currentApprovalRequest.departmentName }})</el-descriptions-item>
                <el-descriptions-item label="事由">{{ currentApprovalRequest.name }}</el-descriptions-item>
                <el-descriptions-item label="类型">{{ currentApprovalRequest.type }}</el-descriptions-item>
                <el-descriptions-item label="时间">{{ currentApprovalRequest.start }} 至 {{ currentApprovalRequest.end }} ({{currentApprovalRequest.duration}} 天)</el-descriptions-item>
            </el-descriptions>
      </div>
      <el-form label-width="80px" :model="approvalForm" :rules="approvalRules" ref="approvalFormRef">
        <el-form-item label="审批操作" prop="newStatus">
          <el-radio-group v-model="approvalForm.newStatus">
            <el-radio label="审批通过">审批通过</el-radio>
            <el-radio label="审批不通过">审批不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批说明" prop="note">
          <el-input type="textarea" :rows="3" v-model="approvalForm.note" autocomplete="off" placeholder="请输入审批说明 (若不通过则必填)"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="approvalFormVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveApproval" :loading="savingApproval">确 定</el-button>
      </div>
    </el-dialog>

     <!-- Details Dialog (for non-pending states) -->
    <el-dialog title="请假申请详情" :visible.sync="detailsVisible" width="500px">
        <div v-if="selectedRequestForDetails">
            <el-descriptions :column="1" border size="medium">
                <el-descriptions-item label="员工姓名">{{ selectedRequestForDetails.employeeName }}</el-descriptions-item>
                <el-descriptions-item label="所属部门">{{ selectedRequestForDetails.departmentName }}</el-descriptions-item>
                <el-descriptions-item label="请假事由">{{ selectedRequestForDetails.name }}</el-descriptions-item>
                <el-descriptions-item label="请假类型">{{ selectedRequestForDetails.type }}</el-descriptions-item>
                <el-descriptions-item label="开始日期">{{ selectedRequestForDetails.start }}</el-descriptions-item>
                <el-descriptions-item label="结束日期">{{ selectedRequestForDetails.end }}</el-descriptions-item>
                <el-descriptions-item label="请假时长">{{ selectedRequestForDetails.duration }} 天</el-descriptions-item>
                <el-descriptions-item label="提交日期">{{ selectedRequestForDetails.submissionDate }}</el-descriptions-item>
                <el-descriptions-item label="审批状态">
                    <el-tag :type="statusTagType(selectedRequestForDetails.status)">{{ selectedRequestForDetails.status }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="审批人">{{ selectedRequestForDetails.approvedBy || 'N/A' }}</el-descriptions-item>
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
import { format, parseISO } from 'date-fns';

const LEAVE_REQUESTS_STORAGE_KEY = 'allLeaveRequestsData'; // Same key as AskRecord.vue

export default {
  name: "AskApply",
  data() {
    const currentUser = JSON.parse(localStorage.getItem('xm-user') || '{}');
    return {
      allLeaveRequests: [],
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      savingApproval: false,
      searchQuery: {
        text: '',
        status: ''
      },
      approvalFormVisible: false,
      detailsVisible: false,
      selectedRequestForDetails: null,
      currentApprovalRequest: null,
      approvalForm: {
        newStatus: '审批通过',
        note: ''
      },
      user: currentUser,
      approvalRules: {
        newStatus: [{ required: true, message: '请选择审批操作', trigger: 'change' }],
        note: [
          {
            validator: (rule, value, callback) => {
              if (this.approvalForm.newStatus === '审批不通过' && !value) {
                callback(new Error('审批不通过时，必须填写审批说明'));
              } else {
                callback();
              }
            },
            trigger: 'blur'
          }
        ]
      }
    };
  },
  created() {
    this.loadInitialData();
    this.load(1);
  },
  methods: {
    loadInitialData() {
        let storedRequests = [];
        try {
            const rawStored = localStorage.getItem(LEAVE_REQUESTS_STORAGE_KEY);
            if (rawStored) {
                storedRequests = JSON.parse(rawStored);
            }
        } catch (e) {
            console.error("Error parsing leave requests from localStorage:", e);
            localStorage.removeItem(LEAVE_REQUESTS_STORAGE_KEY);
        }

        const combinedMap = new Map();
        // Ensure employeeId exists, important for the self-approval check
        initialLeaveRequests.forEach(req => combinedMap.set(req.id, { ...req, employeeId: req.employeeId || null }));
        storedRequests.forEach(req => combinedMap.set(req.id, { ...req, employeeId: req.employeeId || null }));
        this.allLeaveRequests = Array.from(combinedMap.values());

        if (storedRequests.length === 0 && this.allLeaveRequests.length > 0) {
           this.saveAllRequestsToLocalStorage();
        }
    },
    saveAllRequestsToLocalStorage() {
        try {
            localStorage.setItem(LEAVE_REQUESTS_STORAGE_KEY, JSON.stringify(this.allLeaveRequests));
        } catch (e) {
            console.error("Error saving leave requests to localStorage:", e);
            this.$message.error("保存请假数据到本地存储失败！");
        }
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      this.loading = true;

      let filteredRequests = [...this.allLeaveRequests];

      if (this.searchQuery.text) {
        const searchTextLower = this.searchQuery.text.toLowerCase();
        filteredRequests = filteredRequests.filter(item =>
          (item.name && item.name.toLowerCase().includes(searchTextLower)) ||
          (item.employeeName && item.employeeName.toLowerCase().includes(searchTextLower))
        );
      }
      if (this.searchQuery.status) {
        filteredRequests = filteredRequests.filter(item => item.status === this.searchQuery.status);
      }

      filteredRequests.sort((a, b) => {
        if (a.status === '待审批' && b.status !== '待审批') return -1;
        if (a.status !== '待审批' && b.status === '待审批') return 1;
        const dateA = a.submissionDate ? parseISO(a.submissionDate) : null;
        const dateB = b.submissionDate ? parseISO(b.submissionDate) : null;
        if (dateB && dateA) return dateB - dateA;
        if (dateB) return 1;
        if (dateA) return -1;
        return b.id - a.id;
      });

      this.total = filteredRequests.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredRequests.slice(start, end);
      this.loading = false;
    },
    resetSearch() {
      this.searchQuery = { text: '', status: '' };
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
    // NEW: Helper to check if the current user is Financial and the request is their own
    isSelfApprovalByFinancial(request) {
        return this.user.role === 'FINANCIAL' && request.employeeId === this.user.id;
    },
    // NEW: Helper to determine if the "审批" button should be shown at all
    canApprove(request) {
        // Only show "审批" for pending requests
        if (request.status !== '待审批') {
            return false;
        }
        // Admins and Supervisors can always see the button (disabled state handled separately)
        if (this.user.role === 'ADMIN' || this.user.level === '主管') {
            return true;
        }
        // Financial users can see it unless it's their own request
        if (this.user.role === 'FINANCIAL' && !this.isSelfApprovalByFinancial(request)) {
            return true;
        }
        // Other users (regular USER role without supervisor level) generally shouldn't approve
        // unless there's a specific rule for USER role with '主管' level,
        // which is already covered by `this.user.level === '主管'`
        return false;
    },
    handleApprove(row) {
      // Double check conditions here, though button visibility/disabled state should mostly handle it
      if (row.status !== '待审批') {
        this.$message.warning("只能审批状态为 '待审批' 的申请。");
        return;
      }
      if (this.isSelfApprovalByFinancial(row)) {
        this.$message.error("财务人员不能审批自己的请假申请。");
        return;
      }

      this.currentApprovalRequest = JSON.parse(JSON.stringify(row));
      this.approvalForm = { newStatus: '审批通过', note: '' };
      this.approvalFormVisible = true;
      this.$nextTick(() => {
        this.$refs.approvalFormRef?.clearValidate();
      });
    },
    viewDetails(row) {
        this.selectedRequestForDetails = JSON.parse(JSON.stringify(row));
        this.detailsVisible = true;
    },
    saveApproval() {
      this.$refs.approvalFormRef.validate((valid) => {
        if (valid) {
          this.savingApproval = true;
          const index = this.allLeaveRequests.findIndex(req => req.id === this.currentApprovalRequest.id);
          if (index !== -1) {
            const updatedRequest = { ...this.allLeaveRequests[index] };
            updatedRequest.status = this.approvalForm.newStatus;
            updatedRequest.note = this.approvalForm.note;
            updatedRequest.approvedBy = this.user.name || this.user.username || '审批人未知';
            updatedRequest.approvalDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            updatedRequest.process = this.approvalForm.newStatus === '审批通过' ? '审批完成' : '审批驳回';

            this.$set(this.allLeaveRequests, index, updatedRequest);
            this.saveAllRequestsToLocalStorage();
            this.$message.success('审批操作成功');
            this.load(this.pageNum);
            this.approvalFormVisible = false;
          } else {
            this.$message.error('未找到要审批的申请记录');
          }
          this.savingApproval = false;
          this.currentApprovalRequest = null;
        } else {
          this.$message.error('请检查审批表单。');
          return false;
        }
      });
    }
  }
}
</script>

<style scoped>
.ask-apply-container {
  padding: 20px;
}
.search {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.search > .el-input,
.search > .el-select,
.search > .el-button {
  margin-bottom: 10px;
}
.table {
  margin-top: 0;
}
.pagination {
  margin-top: 20px;
  text-align: right;
}
.dialog-footer {
    text-align: right;
}
.el-descriptions {
    margin-bottom: 10px;
}
</style>
