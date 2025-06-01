<template>
  <div class="reimbursement-application-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>我的报销申请</span>
      </div>

      <!-- Search and Actions -->
      <div class="actions-bar">
        <el-input
          v-model="searchFilters.reimbursementId"
          placeholder="报销单ID"
          style="width: 200px; margin-right: 10px"
          clearable
          @keyup.enter.native="loadReimbursements(1)"
        ></el-input>
        <el-select
          v-model="searchFilters.status"
          placeholder="报销状态"
          clearable
          style="width: 150px; margin-right: 10px"
          @change="loadReimbursements(1)"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
        <el-button
          type="primary"
          icon="el-icon-search"
          @click="loadReimbursements(1)"
          >查询</el-button
        >
        <el-button @click="resetFilters">重置</el-button>
        <el-button
          type="success"
          icon="el-icon-plus"
          @click="handleAdd"
          style="float: right"
          >新增报销</el-button
        >
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
          prop="remarks"
          label="事由/备注"
          width="250"
          show-overflow-tooltip
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
          prop="submissionDate"
          label="提交日期"
          width="120"
          sortable
        ></el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="medium">{{
              scope.row.status
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="projectId"
          label="关联项目ID"
          width="150"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="viewDetails(scope.row)"
              >详情</el-button
            >
            <el-button
              v-if="canEdit(scope.row.status)"
              size="mini"
              type="text"
              @click="handleEdit(scope.row)"
              style="margin-left: 5px"
              >编辑</el-button
            >
            <el-button
              v-if="canSubmit(scope.row.status)"
              size="mini"
              type="text"
              @click="handleSubmitApplication(scope.row)"
              style="margin-left: 5px; color: #67c23a"
              >提交</el-button
            >
            <el-button
              v-if="scope.row.status === '草稿'"
              size="mini"
              type="text"
              @click="handleDeleteDraft(scope.row)"
              style="margin-left: 5px; color: #f56c6c"
              >删除</el-button
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
    </el-card>

    <!-- Add/Edit Reimbursement Dialog -->
    <el-dialog
      :title="formMode === 'add' ? '新增报销申请' : '编辑报销申请'"
      :visible.sync="dialogVisible"
      width="75%"
      top="5vh"
      :close-on-click-modal="false"
      :before-close="handleDialogClose"
      append-to-body
      class="reimbursement-dialog"
    >
      <el-form
        :model="reimbursementForm"
        :rules="formRules"
        ref="reimbursementFormRef"
        label-width="100px"
        class="reimbursement-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item
              label="报销单ID"
              prop="reimbursementId"
              v-if="formMode === 'edit'"
            >
              <el-input
                v-model="reimbursementForm.reimbursementId"
                :disabled="true"
              ></el-input>
            </el-form-item>
            <el-form-item label="申请人" prop="applicantName">
              <el-input
                v-model="reimbursementForm.applicantName"
                :disabled="true"
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联项目ID" prop="projectId">
              <el-input
                v-model="reimbursementForm.projectId"
                placeholder="请输入关联项目ID (可选)"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="事由/备注" prop="remarks">
          <el-input
            type="textarea"
            :rows="2"
            v-model="reimbursementForm.remarks"
            placeholder="请输入报销事由或备注"
          ></el-input>
        </el-form-item>

        <el-divider content-position="left">费用明细</el-divider>
        <div
          v-for="(item, index) in reimbursementForm.expenseItems"
          :key="item.itemId || index"
          class="expense-item-row"
        >
          <el-row :gutter="10">
            <el-col :span="5">
              <!-- 日期 - Was 5, now 4 -->
              <el-form-item
                label-width="50px"
                label-position="top"
                :label="'日期'"
                :prop="'expenseItems.' + index + '.expenseDate'"
                :rules="{
                  required: true,
                  message: '请选择费用日期',
                  trigger: 'change',
                }"
              >
                <el-date-picker
                  v-model="item.expenseDate"
                  type="date"
                  placeholder="费用日期"
                  value-format="yyyy-MM-dd"
                  style="width: 100%"
                ></el-date-picker>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <!-- 类别 - Was 4, now 5 -->
              <el-form-item
                label-width="50px"
                label-position="top"
                :label="'类别'"
                :prop="'expenseItems.' + index + '.category'"
                :rules="{
                  required: true,
                  message: '请选择费用类别',
                  trigger: 'change',
                }"
              >
                <el-select
                  v-model="item.category"
                  placeholder="类别"
                  style="width: 100%"
                >
                  <el-option label="交通费" value="交通费"></el-option>
                  <el-option label="餐饮费" value="餐饮费"></el-option>
                  <el-option label="住宿费" value="住宿费"></el-option>
                  <el-option label="办公用品" value="办公用品"></el-option>
                  <el-option label="差旅费" value="差旅费"></el-option>
                  <el-option label="其他" value="其他"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <!-- 描述 - Was 6, now 4 -->
              <el-form-item
                label-width="50px"
                label-position="top"
                :label="'描述'"
                :prop="'expenseItems.' + index + '.description'"
                :rules="{
                  required: true,
                  message: '请输入费用描述',
                  trigger: 'blur',
                }"
              >
                <el-input
                  v-model="item.description"
                  placeholder="费用描述"
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="5">
              <!-- 金额 - Was 4, now 5 -->
              <el-form-item
                label-width="50px"
                label-position="top"
                :label="'金额'"
                :prop="'expenseItems.' + index + '.amount'"
                :rules="[
                  { required: true, message: '金额不能为空' },
                  { type: 'number', message: '金额必须为数字' },
                ]"
              >
                <el-input-number
                  v-model="item.amount"
                  :precision="2"
                  :step="10"
                  :min="0.01"
                  controls-position="right"
                  style="width: 100%"
                  @change="calculateTotalAmount"
                ></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="5">
              <!-- 票号 - Was 4, now 5 -->
              <el-form-item label-width="50px" label-position="top" :label="'票号'">
                <el-input
                  v-model="item.invoiceNumber"
                  placeholder="发票号(可选)"
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="1" class="action-col">
              <!-- 删除按钮 - Unchanged -->
              <el-button
                type="danger"
                icon="el-icon-delete"
                circle
                size="mini"
                @click="removeExpenseItem(index)"
                v-if="reimbursementForm.expenseItems.length > 1"
              ></el-button>
            </el-col>
          </el-row>
        </div>
        <el-button
          type="text"
          icon="el-icon-plus"
          @click="addExpenseItem"
          style="margin-bottom: 15px"
          >添加费用明细</el-button
        >

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="总金额" prop="totalAmount">
              <el-input
                v-model="formattedTotalAmount"
                :disabled="true"
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="附件列表" prop="attachments">
              <el-input
                type="textarea"
                :rows="1"
                v-model="reimbursementForm.attachmentsInput"
                placeholder="附件文件名，用英文逗号隔开"
              ></el-input>
              <small
                >当前:
                {{
                  reimbursementForm.attachments &&
                  reimbursementForm.attachments.length > 0
                    ? reimbursementForm.attachments.join(", ")
                    : "无"
                }}</small
              >
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态" prop="status" v-if="formMode === 'edit'">
          <el-tag :type="statusTagType(reimbursementForm.status)">{{
            reimbursementForm.status
          }}</el-tag>
          <span
            v-if="
              reimbursementForm.status === '被驳回' &&
              reimbursementForm.rejectionReason
            "
            style="color: #f56c6c; margin-left: 10px"
          >
            驳回理由: {{ reimbursementForm.rejectionReason }}
          </span>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="handleDialogClose">取 消</el-button>
        <el-button
          type="info"
          @click="submitForm('草稿')"
          :loading="submitLoadingDraft"
          v-if="canEdit(reimbursementForm.status)"
          >保存草稿</el-button
        >
        <el-button
          type="primary"
          @click="submitForm('已提交')"
          :loading="submitLoadingSubmit"
          v-if="canEdit(reimbursementForm.status)"
          >提交申请</el-button
        >
      </span>
    </el-dialog>

    <!-- Details Dialog -->
    <el-dialog
      title="报销详情"
      :visible.sync="detailsDialogVisible"
      width="70%"
      top="5vh"
      class="reimbursement-details-dialog"
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
          <el-descriptions-item label="支付日期">{{
            selectedForDetails.paymentDate || "未支付"
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
          <el-table-column prop="amount" label="金额" width="50" align="right">
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
            !selectedForDetails.expenseItems ||
            selectedForDetails.expenseItems.length === 0
          "
        >
          无附件
        </p>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import initialReimbursementsData from "@/data/reimbursements.json"; // Load mock data
import { format } from "date-fns"; // npm install date-fns
import { v4 as uuidv4 } from "uuid"; // npm install uuid

export default {
  name: "ReimbursementApplication",
  data() {
    const currentUser = JSON.parse(localStorage.getItem("xm-user") || "{}");
    return {
      allReimbursements: [],
      tableData: [],
      loading: false,
      submitLoadingDraft: false,
      submitLoadingSubmit: false,
      pageNum: 1,
      pageSize: 7,
      total: 0,
      currentUser: currentUser,
      searchFilters: {
        reimbursementId: "",
        status: "",
      },
      dialogVisible: false,
      detailsDialogVisible: false,
      selectedForDetails: null,
      formMode: "add", // 'add' or 'edit'
      reimbursementForm: this.getEmptyForm(),
      statusOptions: [
        { value: "草稿", label: "草稿" },
        { value: "已提交", label: "已提交" },
        { value: "审批中", label: "审批中" },
        { value: "已支付", label: "已支付" },
        { value: "被驳回", label: "被驳回" },
      ],
      formRules: {
        remarks: [
          { required: true, message: "请输入事由或备注", trigger: "blur" },
        ],
        // expenseItems validation is handled per item
      },
    };
  },
  computed: {
    formattedTotalAmount() {
      return this.formatAmount(this.reimbursementForm.totalAmount);
    },
  },
  created() {
    this.loadInitialData();
    this.loadReimbursements();
  },
  methods: {
    getEmptyForm() {
      const currentUser = JSON.parse(localStorage.getItem("xm-user") || "{}");
      return {
        reimbursementId: "",
        applicantId: currentUser.id || "unknown",
        applicantName: currentUser.name || "Unknown User",
        projectId: "",
        totalAmount: 0,
        expenseItems: [this.getEmptyExpenseItem()],
        attachments: [],
        attachmentsInput: "",
        submissionDate: null,
        paymentDate: null,
        status: "草稿",
        remarks: "",
        rejectionReason: "",
      };
    },
    getEmptyExpenseItem() {
      return {
        itemId: uuidv4(), // Unique key for v-for
        expenseDate: "",
        category: "",
        description: "",
        amount: 0,
        invoiceNumber: "",
      };
    },
    loadInitialData() {
      let storedReimbursements = [];
      try {
        const rawStored = localStorage.getItem("userReimbursements");
        if (rawStored) {
          storedReimbursements = JSON.parse(rawStored);
        }
      } catch (e) {
        console.error("Error parsing reimbursements from localStorage:", e);
        localStorage.removeItem("userReimbursements");
      }

      const combinedMap = new Map();
      initialReimbursementsData.forEach((r) =>
        combinedMap.set(r.reimbursementId, { ...r })
      );
      storedReimbursements.forEach((r) =>
        combinedMap.set(r.reimbursementId, { ...r })
      );
      this.allReimbursements = Array.from(combinedMap.values());

      if (
        storedReimbursements.length === 0 &&
        initialReimbursementsData.length > 0
      ) {
        this.saveReimbursementsToLocalStorage();
      }
    },
    loadReimbursements(pageNum = this.pageNum) {
      this.loading = true;
      this.pageNum = pageNum;

      // Filter by current user first
      let userReimbursements = this.allReimbursements.filter(
        (r) => r.applicantId === this.currentUser.id
      );

      if (this.searchFilters.reimbursementId) {
        userReimbursements = userReimbursements.filter((r) =>
          r.reimbursementId
            .toLowerCase()
            .includes(this.searchFilters.reimbursementId.toLowerCase())
        );
      }
      if (this.searchFilters.status) {
        userReimbursements = userReimbursements.filter(
          (r) => r.status === this.searchFilters.status
        );
      }

      userReimbursements.sort((a, b) => {
        // Sort by submissionDate desc (if exists), then by reimbursementId desc
        if (a.submissionDate && b.submissionDate) {
          return b.submissionDate.localeCompare(a.submissionDate);
        } else if (a.submissionDate) {
          return -1;
        } else if (b.submissionDate) {
          return 1;
        }
        return b.reimbursementId.localeCompare(a.reimbursementId);
      });

      this.total = userReimbursements.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = userReimbursements.slice(start, end);
      this.loading = false;
    },
    saveReimbursementsToLocalStorage() {
      try {
        localStorage.setItem(
          "userReimbursements",
          JSON.stringify(this.allReimbursements)
        );
      } catch (e) {
        console.error("Error saving reimbursements to localStorage:", e);
        this.$message.error("保存报销数据到本地存储失败！");
      }
    },
    resetFilters() {
      this.searchFilters = { reimbursementId: "", status: "" };
      this.loadReimbursements(1);
    },
    handleCurrentChange(newPage) {
      this.loadReimbursements(newPage);
    },
    formatAmount(amount) {
      if (amount === null || amount === undefined) return "0.00";
      return parseFloat(amount).toFixed(2); // Simpler formatting for amounts
    },
    statusTagType(status) {
      if (status === "已支付") return "success";
      if (status === "已提交") return "primary";
      if (status === "审批中") return "warning";
      if (status === "草稿") return "info";
      if (status === "被驳回") return "danger";
      return "";
    },
    canEdit(status) {
      return ["草稿", "被驳回"].includes(status);
    },
    canSubmit(status) {
      return ["草稿", "被驳回"].includes(status);
    },
    handleAdd() {
      this.formMode = "add";
      this.reimbursementForm = this.getEmptyForm();
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.reimbursementFormRef)
          this.$refs.reimbursementFormRef.clearValidate();
      });
    },
    handleEdit(row) {
      if (!this.canEdit(row.status)) {
        this.$message.warning(`状态为 "${row.status}" 的报销单无法编辑。`);
        return;
      }
      this.formMode = "edit";
      this.reimbursementForm = {
        ...JSON.parse(JSON.stringify(row)), // Deep clone
        attachmentsInput: row.attachments ? row.attachments.join(", ") : "",
        // Ensure expenseItems have unique keys if they don't have itemId
        expenseItems: row.expenseItems.map((item) => ({
          ...item,
          itemId: item.itemId || uuidv4(),
        })),
      };
      this.calculateTotalAmount(); // Recalculate on load
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.reimbursementFormRef)
          this.$refs.reimbursementFormRef.clearValidate();
      });
    },
    viewDetails(row) {
      this.selectedForDetails = { ...JSON.parse(JSON.stringify(row)) }; // Deep clone
      this.detailsDialogVisible = true;
    },
    handleDialogClose() {
      this.dialogVisible = false;
      if (this.$refs.reimbursementFormRef)
        this.$refs.reimbursementFormRef.resetFields();
      this.reimbursementForm = this.getEmptyForm(); // Reset to ensure clean state
    },
    generateReimbursementId() {
      const now = new Date();
      const year = now.getFullYear();
      let maxNum = 0;
      this.allReimbursements.forEach((r) => {
        if (r.reimbursementId.startsWith(`REIM-${year}-`)) {
          const numPart = parseInt(r.reimbursementId.split("-")[2], 10);
          if (numPart > maxNum) maxNum = numPart;
        }
      });
      return `REIM-${year}-${String(maxNum + 1).padStart(3, "0")}`;
    },
    addExpenseItem() {
      this.reimbursementForm.expenseItems.push(this.getEmptyExpenseItem());
    },
    removeExpenseItem(index) {
      if (this.reimbursementForm.expenseItems.length > 1) {
        this.reimbursementForm.expenseItems.splice(index, 1);
        this.calculateTotalAmount();
      } else {
        this.$message.warning("至少需要一个费用明细项。");
      }
    },
    calculateTotalAmount() {
      this.reimbursementForm.totalAmount =
        this.reimbursementForm.expenseItems.reduce((sum, item) => {
          return sum + (Number(item.amount) || 0);
        }, 0);
    },
    submitForm(targetStatus) {
      this.$refs.reimbursementFormRef
        .validate((valid) => {
          if (valid) {
            if (targetStatus === "草稿") this.submitLoadingDraft = true;
            else this.submitLoadingSubmit = true;

            this.calculateTotalAmount(); // Ensure total is up-to-date
            if (
              this.reimbursementForm.expenseItems.length === 0 &&
              targetStatus === "已提交"
            ) {
              this.$message.error("提交申请至少需要一个费用明细项。");
              if (targetStatus === "草稿") this.submitLoadingDraft = false;
              else this.submitLoadingSubmit = false;
              return;
            }

            this.reimbursementForm.attachments =
              this.reimbursementForm.attachmentsInput
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            this.reimbursementForm.status = targetStatus;
            if (targetStatus === "已提交") {
              this.reimbursementForm.submissionDate = format(
                new Date(),
                "yyyy-MM-dd"
              );
              this.reimbursementForm.rejectionReason = ""; // Clear rejection reason on resubmit
            }

            if (this.formMode === "add") {
              this.reimbursementForm.reimbursementId =
                this.generateReimbursementId();
              this.reimbursementForm.applicantId = this.currentUser.id; // ensure
              this.reimbursementForm.applicantName = this.currentUser.name;

              this.allReimbursements.push({ ...this.reimbursementForm });
            } else {
              // Edit mode
              const index = this.allReimbursements.findIndex(
                (r) =>
                  r.reimbursementId === this.reimbursementForm.reimbursementId
              );
              if (index !== -1) {
                this.$set(this.allReimbursements, index, {
                  ...this.reimbursementForm,
                });
              } else {
                this.$message.error("未找到要编辑的报销单！");
                if (targetStatus === "草稿") this.submitLoadingDraft = false;
                else this.submitLoadingSubmit = false;
                return;
              }
            }
            this.saveReimbursementsToLocalStorage();
            this.loadReimbursements(
              this.formMode === "add" && targetStatus === "已提交"
                ? 1
                : this.pageNum
            );
            this.dialogVisible = false;
            this.$message.success(
              `报销单已${targetStatus === "草稿" ? "保存为草稿" : "成功提交"}！`
            );
          } else {
            this.$message.error("请检查表单填写是否正确！");
            return false;
          }
        })
        .finally(() => {
          if (targetStatus === "草稿") this.submitLoadingDraft = false;
          else this.submitLoadingSubmit = false;
        });
    },
    handleSubmitApplication(row) {
      // Direct submit from table action
      if (!this.canSubmit(row.status)) {
        this.$message.warning(`状态为 "${row.status}" 的报销单无法直接提交。`);
        return;
      }
      this.$confirm(
        `确定要提交报销单 "${row.reimbursementId}" 吗?`,
        "确认提交",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "info",
        }
      )
        .then(() => {
          const index = this.allReimbursements.findIndex(
            (r) => r.reimbursementId === row.reimbursementId
          );
          if (index !== -1) {
            if (this.allReimbursements[index].expenseItems.length === 0) {
              this.$message.error(
                "提交申请至少需要一个费用明细项。请编辑后添加。"
              );
              return;
            }
            this.allReimbursements[index].status = "已提交";
            this.allReimbursements[index].submissionDate = format(
              new Date(),
              "yyyy-MM-dd"
            );
            this.allReimbursements[index].rejectionReason = ""; // Clear rejection reason on resubmit
            this.saveReimbursementsToLocalStorage();
            this.loadReimbursements(this.pageNum);
            this.$message.success("报销单提交成功！");
          }
        })
        .catch(() => {
          this.$message.info("已取消提交");
        });
    },
    handleDeleteDraft(row) {
      if (row.status !== "草稿") {
        this.$message.warning("只能删除草稿状态的报销单。");
        return;
      }
      this.$confirm(
        `确定要删除草稿报销单 "${row.reimbursementId}" 吗? 此操作无法撤销。`,
        "警告",
        {
          confirmButtonText: "确定删除",
          cancelButtonText: "取消",
          type: "warning",
        }
      )
        .then(() => {
          this.allReimbursements = this.allReimbursements.filter(
            (r) => r.reimbursementId !== row.reimbursementId
          );
          this.saveReimbursementsToLocalStorage();
          this.loadReimbursements(this.pageNum); // Reload current page or page 1 if current page becomes empty
          this.$message.success("草稿报销单删除成功！");
        })
        .catch(() => {
          this.$message.info("已取消删除");
        });
    },
  },
};
</script>

<style scoped>
.reimbursement-application-container {
  padding: 20px;
}
.box-card {
  min-width: 900px;
}
.actions-bar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* Allow items to wrap on smaller screens */
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
.expense-item-row {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fcfcfc;
}
.expense-item-row .el-form-item {
  margin-bottom: 0; /* Reduce margin for items in a row */
}
.action-col {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* Align with input height */
}
.reimbursement-dialog .el-dialog__body {
  padding-bottom: 0; /* Reduce padding if footer is used for main actions */
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
</style>
