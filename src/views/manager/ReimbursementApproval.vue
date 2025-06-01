<template>
  <div class="reimbursement-approval-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>报销审批与处理</span> <!-- Title updated to reflect payment handling -->
        <span v-if="!canAccessPage" style="color: red; margin-left: 20px"
          >您没有权限访问此页面</span
        >
      </div>

      <template v-if="canAccessPage">
        <!-- Search and Actions -->
        <div class="actions-bar">
          <el-input
            v-model="searchFilters.reimbursementId"
            placeholder="报销单ID"
            style="width: 200px; margin-right: 10px"
            clearable
            @keyup.enter.native="loadReimbursementsForProcessing(1)"
          ></el-input>
          <el-input
            v-model="searchFilters.applicantName"
            placeholder="申请人姓名"
            style="width: 180px; margin-right: 10px"
            clearable
            @keyup.enter.native="loadReimbursementsForProcessing(1)"
          ></el-input>
          <el-button
            type="primary"
            icon="el-icon-search"
            @click="loadReimbursementsForProcessing(1)"
            >查询</el-button
          >
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <!-- Reimbursement Table -->
        <el-table
          :data="tableData"
          stripe
          style="width: 100%; margin-top: 20px"
          v-loading="loading"
        >
          <el-table-column
            prop="reimbursementId"
            label="报销单ID"
            width="180"
            sortable
            fixed
          ></el-table-column>
          <el-table-column
            prop="applicantName"
            label="申请人"
            width="120"
            sortable
          ></el-table-column>
          <el-table-column
            prop="submissionDate"
            label="提交日期"
            width="120"
            sortable
          ></el-table-column>
          <el-table-column
            prop="totalAmount"
            label="总金额"
            width="120"
            align="right"
            sortable
          >
            <template slot-scope="scope">{{
              formatAmount(scope.row.totalAmount)
            }}</template>
          </el-table-column>
          <el-table-column
            prop="remarks"
            label="事由/备注"
            width="250"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column
            prop="status"
            label="状态"
            width="100"
            align="center"
          >
            <template slot-scope="scope">
              <el-tag :type="statusTagType(scope.row.status)" size="medium">{{
                scope.row.status
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="220"
            align="center"
            fixed="right"
          >
            <template slot-scope="scope">
              <el-button size="mini" type="text" @click="viewDetails(scope.row)"
                >详情</el-button
              >
              <el-button
                v-if="canApprove(scope.row)"
                size="mini"
                type="success"
                plain
                @click="handleApprove(scope.row)"
                style="margin-left: 5px"
                >批准</el-button
              >
              <el-button
                v-if="canPay(scope.row)"
                size="mini"
                type="warning"
                plain
                @click="handlePay(scope.row)"
                style="margin-left: 5px"
              >支付</el-button>
              <el-button
                v-if="canReject(scope.row)"
                size="mini"
                type="danger"
                plain
                @click="handleReject(scope.row)"
                style="margin-left: 5px"
                >驳回</el-button
              >
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
      </template>
    </el-card>

    <!-- Details Dialog (Similar to ReimbursementApplication) -->
    <el-dialog
      title="报销详情"
      :visible.sync="detailsDialogVisible"
      width="70%"
      top="5vh"
      class="reimbursement-details-dialog"
      append-to-body
    >
      <div v-if="selectedForDetails" class="reimbursement-details">
        <el-descriptions :column="2" border size="medium">
          <el-descriptions-item label="报销单ID">{{
            selectedForDetails.reimbursementId
          }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{
            selectedForDetails.applicantName || selectedForDetails.applicantId
          }}</el-descriptions-item>
          <el-descriptions-item
            label="关联项目ID"
            :span="selectedForDetails.projectId ? 1 : 2"
            >{{ selectedForDetails.projectId || "无" }}</el-descriptions-item
          >
          <el-descriptions-item label="总金额">{{
            formatAmount(selectedForDetails.totalAmount)
          }}</el-descriptions-item>
          <el-descriptions-item label="提交日期">{{
            selectedForDetails.submissionDate || "未提交"
          }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(selectedForDetails.status)">{{
              selectedForDetails.status
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="事由/备注" :span="2">{{
            selectedForDetails.remarks || "无"
          }}</el-descriptions-item>
          <el-descriptions-item
            v-if="selectedForDetails.approverName"
            label="审批人"
            >{{ selectedForDetails.approverName }}</el-descriptions-item
          >
          <el-descriptions-item
            v-if="selectedForDetails.approvalDate"
            label="审批日期"
            >{{ selectedForDetails.approvalDate }}</el-descriptions-item
          >
          <el-descriptions-item
            v-if="selectedForDetails.paymentDate"
            label="支付日期"
            >{{ selectedForDetails.paymentDate }}</el-descriptions-item
          >
          <el-descriptions-item
            v-if="
              selectedForDetails.status === '被驳回' &&
              selectedForDetails.rejectionReason
            "
            label="驳回理由"
            :span="2"
            class="rejection-reason-item"
          >
            {{ selectedForDetails.rejectionReason }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider
          content-position="left"
          v-if="
            selectedForDetails.expenseItems &&
            selectedForDetails.expenseItems.length > 0
          "
          >费用明细</el-divider
        >
        <el-table
          :data="selectedForDetails.expenseItems"
          border
          stripe
          size="small"
          v-if="
            selectedForDetails.expenseItems &&
            selectedForDetails.expenseItems.length > 0
          "
        >
          <el-table-column
            prop="expenseDate"
            label="费用日期"
            width="120"
          ></el-table-column>
          <el-table-column
            prop="category"
            label="类别"
            width="100"
          ></el-table-column>
          <el-table-column
            prop="description"
            label="描述"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column prop="amount" label="金额" width="100" align="right">
            <template slot-scope="scope">{{
              formatAmount(scope.row.amount)
            }}</template>
          </el-table-column>
          <el-table-column
            prop="invoiceNumber"
            label="发票号"
            width="120"
          ></el-table-column>
        </el-table>

        <el-divider
          content-position="left"
          v-if="
            selectedForDetails.attachments &&
            selectedForDetails.attachments.length > 0
          "
          >附件列表</el-divider
        >
        <ul
          v-if="
            selectedForDetails.attachments &&
            selectedForDetails.attachments.length > 0
          "
          class="attachment-list"
        >
          <li
            v-for="(att, index) in selectedForDetails.attachments"
            :key="index"
          >
            {{ att }}
          </li>
        </ul>
        <p
          v-else-if="
            (!selectedForDetails.expenseItems ||
              selectedForDetails.expenseItems.length === 0) &&
            (!selectedForDetails.attachments ||
              selectedForDetails.attachments.length === 0)
          "
        >
          无费用明细和附件
        </p>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>

    <!-- Reject Dialog -->
    <el-dialog
      title="驳回报销申请"
      :visible.sync="rejectDialogVisible"
      width="400px"
      append-to-body
    >
      <el-form :model="rejectForm" ref="rejectFormRef" label-width="80px">
        <el-form-item
          label="驳回理由"
          prop="reason"
          :rules="[
            { required: true, message: '请输入驳回理由', trigger: 'blur' },
          ]"
        >
          <el-input
            type="textarea"
            :rows="3"
            v-model="rejectForm.reason"
            placeholder="请输入驳回理由"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="rejectDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmReject">确 定驳回</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { format } from "date-fns";
import initialReimbursementsData from "@/data/reimbursements.json";

const LOCAL_STORAGE_KEY = "userReimbursements";

export default {
  name: "ReimbursementApproval",
  data() {
    const currentUser = JSON.parse(localStorage.getItem("xm-user") || "{}");
    return {
      allReimbursements: [],
      tableData: [],
      loading: false,
      pageNum: 1,
      pageSize: 7,
      total: 0,
      currentUser: currentUser,
      searchFilters: {
        reimbursementId: "",
        applicantName: "",
      },
      detailsDialogVisible: false,
      selectedForDetails: null,
      rejectDialogVisible: false,
      rejectForm: {
        reimbursementToReject: null,
        reason: "",
      },
    };
  },
  computed: {
    canAccessPage() {
      return (
        this.currentUser.role === "ADMIN" ||
        this.currentUser.role === "FINANCIAL"
      );
    },
    isFinancialUser() {
      return this.currentUser.role === "FINANCIAL";
    },
    isAdminUser() {
      return this.currentUser.role === "ADMIN";
    },
  },
  created() {
    if (this.canAccessPage) {
      this.loadAllReimbursementsFromStorage();
      this.loadReimbursementsForProcessing();
    } else {
      this.$message.warning("您没有权限访问此页面。");
    }
  },
  methods: {
    loadAllReimbursementsFromStorage() {
      let reimbursements = [];
      const rawStored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let loadedFromJson = false; 

      if (rawStored) {
        try {
          reimbursements = JSON.parse(rawStored);
        } catch (e) {
          console.error(
            "Error parsing reimbursements from localStorage in Approval. Falling back to initial JSON data and overwriting localStorage.",
            e
          );
          localStorage.removeItem(LOCAL_STORAGE_KEY); 
          reimbursements = JSON.parse(JSON.stringify(initialReimbursementsData)); 
          loadedFromJson = true;
        }
      } else {
        console.log(
          "No reimbursements found in localStorage for Approval. Loading from initial JSON and populating localStorage."
        );
        reimbursements = JSON.parse(JSON.stringify(initialReimbursementsData));
        loadedFromJson = true;
      }

      this.allReimbursements = reimbursements.map(r => ({
          ...this.getEmptyReimbursementDefaults(), 
          ...r                                     
      }));

      if (loadedFromJson) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.allReimbursements));
            console.log("Primed localStorage with data from reimbursements.json in Approval component.");
        } catch (e) {
            console.error("Error priming localStorage with reimbursement data in Approval component:", e);
            this.$message.error("初始化报销数据到本地存储失败！");
        }
      }
    },
    getEmptyReimbursementDefaults() {
        return {
            reimbursementId: "",
            applicantId: "",
            applicantName: "",
            projectId: "",
            totalAmount: 0,
            expenseItems: [],
            attachments: [],
            submissionDate: null,
            paymentDate: null,
            status: "草稿", // Default status
            remarks: "",
            rejectionReason: "",
            approverId: null,
            approverName: null,
            approvalDate: null,
        };
    },
    loadReimbursementsForProcessing(pageNum = this.pageNum) { // Renamed method
      if (!this.canAccessPage) {
        this.tableData = [];
        this.total = 0;
        return;
      }
      this.loading = true;
      this.pageNum = pageNum;

      // Filter for "已提交" or "待支付" statuses
      let reimbursementsToProcess = this.allReimbursements.filter(
        (r) => r.status === "已提交" || r.status === "待支付"
      );

      if (this.searchFilters.reimbursementId) {
        reimbursementsToProcess = reimbursementsToProcess.filter((r) =>
          r.reimbursementId &&
          r.reimbursementId
            .toLowerCase()
            .includes(this.searchFilters.reimbursementId.toLowerCase())
        );
      }
      if (this.searchFilters.applicantName) {
        reimbursementsToProcess = reimbursementsToProcess.filter(
          (r) =>
            r.applicantName &&
            r.applicantName
              .toLowerCase()
              .includes(this.searchFilters.applicantName.toLowerCase())
        );
      }

      reimbursementsToProcess.sort((a, b) => {
        const dateA = a.submissionDate ? new Date(a.submissionDate) : null;
        const dateB = b.submissionDate ? new Date(b.submissionDate) : null;
        if (dateA && dateB) {
          if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
        } else if (dateA) return -1;
        else if (dateB) return 1;
        return (a.reimbursementId || "").localeCompare(b.reimbursementId || "");
      });

      this.total = reimbursementsToProcess.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = reimbursementsToProcess.slice(start, end);
      this.loading = false;
    },
    saveReimbursementsToLocalStorage() {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(this.allReimbursements)
        );
      } catch (e) {
        console.error("Error saving reimbursements to localStorage:", e);
        this.$message.error("保存报销数据到本地存储失败！");
      }
    },
    resetFilters() {
      this.searchFilters = { reimbursementId: "", applicantName: "" };
      this.loadReimbursementsForProcessing(1);
    },
    handleCurrentChange(newPage) {
      this.loadReimbursementsForProcessing(newPage);
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined) return "0.00";
      return parseFloat(amount).toFixed(2);
    },
    statusTagType(status) {
      if (status === "已支付") return "success";
      if (status === "已提交") return "primary";
      if (status === "待支付") return "warning"; // New status for pending payment
      // if (status === "审批中") return "warning"; // Kept for reference, but "待支付" is used
      if (status === "草稿") return "info";
      if (status === "被驳回") return "danger";
      return "";
    },
    canApprove(reimbursement) {
      if (reimbursement.status !== '已提交') return false;
      // Financial user cannot approve their own application
      if (
        this.isFinancialUser &&
        String(reimbursement.applicantId) === String(this.currentUser.id)
      ) {
        return false;
      }
      return this.isAdminUser || this.isFinancialUser;
    },
    canReject(reimbursement) {
      if (reimbursement.status !== '已提交') return false;
       // Financial user cannot reject their own application
      if (
        this.isFinancialUser &&
        String(reimbursement.applicantId) === String(this.currentUser.id)
      ) {
        return false;
      }
      return this.isAdminUser || this.isFinancialUser;
    },
    canPay(reimbursement) {
      if (reimbursement.status !== '待支付') return false;
      // Financial user cannot pay their own application
      if (
        this.isFinancialUser &&
        String(reimbursement.applicantId) === String(this.currentUser.id)
      ) {
        return false;
      }
      return this.isAdminUser || this.isFinancialUser;
    },
    viewDetails(row) {
      this.selectedForDetails = {
          ...this.getEmptyReimbursementDefaults(),
          ...JSON.parse(JSON.stringify(row))
      };
      this.detailsDialogVisible = true;
    },
    handleApprove(reimbursement) {
      this.$confirm(
        `确定要批准报销单 "${reimbursement.reimbursementId}" 吗?`,
        "确认批准",
        {
          confirmButtonText: "确定批准",
          cancelButtonText: "取消",
          type: "info", // Changed from success for confirmation step
        }
      )
        .then(() => {
          const index = this.allReimbursements.findIndex(
            (r) => r.reimbursementId === reimbursement.reimbursementId
          );
          if (index !== -1) {
            const today = format(new Date(), "yyyy-MM-dd");
            const updatedReimbursement = {
                ...this.allReimbursements[index],
                status: "待支付", // Status changes to Pending Payment
                approverId: this.currentUser.id,
                approverName: this.currentUser.name || this.currentUser.username,
                approvalDate: today,
                paymentDate: null, // Ensure paymentDate is null at approval
                rejectionReason: "", // Clear any previous rejection reason
            };
            this.$set(this.allReimbursements, index, updatedReimbursement);
            this.saveReimbursementsToLocalStorage();
            // Item remains in the list as its status is now '待支付', which is included in the filter
            this.loadReimbursementsForProcessing(this.pageNum); 
            this.$message.success("报销单批准成功，状态已更新为“待支付”！");
          } else {
            this.$message.error("操作失败，未找到报销单！");
          }
        })
        .catch(() => {
          this.$message.info("已取消批准");
        });
    },
    handlePay(reimbursement) {
      this.$confirm(
        `确定要支付报销单 "${reimbursement.reimbursementId}" 吗?`,
        "确认支付",
        {
          confirmButtonText: "确定支付",
          cancelButtonText: "取消",
          type: "success",
        }
      )
        .then(() => {
          const index = this.allReimbursements.findIndex(
            (r) => r.reimbursementId === reimbursement.reimbursementId
          );
          if (index !== -1) {
            const today = format(new Date(), "yyyy-MM-dd");
            const updatedReimbursement = {
                ...this.allReimbursements[index],
                status: "已支付", // Status changes to Paid
                paymentDate: today, // Set paymentDate
            };
            this.$set(this.allReimbursements, index, updatedReimbursement);
            this.saveReimbursementsToLocalStorage();
            // Item will be removed from the list as '已支付' is not included in the filter
            this.loadReimbursementsForProcessing(this.tableData.length === 1 && this.pageNum > 1 ? this.pageNum -1 : this.pageNum);
            this.$message.success("报销单支付成功，状态已更新为“已支付”！");
          } else {
            this.$message.error("操作失败，未找到报销单！");
          }
        })
        .catch(() => {
          this.$message.info("已取消支付");
        });
    },
    handleReject(reimbursement) {
      this.rejectForm.reimbursementToReject = reimbursement;
      this.rejectForm.reason = "";
      this.rejectDialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.rejectFormRef) this.$refs.rejectFormRef.clearValidate();
      });
    },
    confirmReject() {
      this.$refs.rejectFormRef.validate((valid) => {
        if (valid) {
          const reimbursement = this.rejectForm.reimbursementToReject;
          const index = this.allReimbursements.findIndex(
            (r) => r.reimbursementId === reimbursement.reimbursementId
          );
          if (index !== -1) {
             const updatedReimbursement = {
                ...this.allReimbursements[index],
                status: "被驳回",
                approverId: this.currentUser.id, // Record who rejected
                approverName: this.currentUser.name || this.currentUser.username,
                approvalDate: format(new Date(), "yyyy-MM-dd"), // Date of rejection
                rejectionReason: this.rejectForm.reason,
                paymentDate: null, // Ensure paymentDate is null
            };
            this.$set(this.allReimbursements, index, updatedReimbursement);
            this.saveReimbursementsToLocalStorage();
            // Item will be removed from the list as '被驳回' is not included in the filter
            this.loadReimbursementsForProcessing(this.tableData.length === 1 && this.pageNum > 1 ? this.pageNum -1 : this.pageNum);
            this.rejectDialogVisible = false;
            this.$message.success("报销单已驳回！");
          } else {
            this.$message.error("操作失败，未找到报销单！");
          }
        } else {
          return false;
        }
      });
    },
  },
};
</script>

<style scoped>
.reimbursement-approval-container {
  padding: 20px;
}
.box-card {
  min-width: 900px;
}
.actions-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.actions-bar > .el-input,
.actions-bar > .el-select,
.actions-bar > .el-button {
  margin-bottom: 10px;
  margin-right: 10px;
}
.actions-bar > .el-button:last-child {
    margin-right: 0;
}
.pagination-container {
  margin-top: 20px;
  text-align: right;
}
.attachment-list {
  list-style-type: disc;
  padding-left: 20px;
}
.attachment-list li {
  margin-bottom: 5px;
}
.reimbursement-details-dialog
  .rejection-reason-item
  .el-descriptions-item__content {
  color: #f56c6c;
  font-weight: bold;
}
.dialog-footer {
  text-align: right;
}
</style>
