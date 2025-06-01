<template>
  <div class="ledger-management-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>账簿管理</span>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab">
        <el-tab-pane label="历史账簿" name="history">
          <div style="margin-bottom: 15px;">
            <el-button @click="loadHistoricalLedgers" icon="el-icon-refresh" size="small">刷新历史账簿</el-button>
          </div>
          <el-table :data="historicalLedgers" stripe border style="width: 100%" v-loading="loadingHistory">
            <el-table-column prop="period" label="会计期间" width="120" sortable></el-table-column>
            <el-table-column prop="settledDate" label="结账日期" width="150" sortable></el-table-column>
            <el-table-column prop="settledBy" label="操作员" width="120"></el-table-column>
            <el-table-column prop="summary" label="摘要" show-overflow-tooltip></el-table-column>
            <el-table-column prop="totalVouchers" label="凭证数" width="100" align="center"></el-table-column>
            <el-table-column prop="remarks" label="备注" show-overflow-tooltip></el-table-column>
          </el-table>
          <div v-if="!loadingHistory && historicalLedgers.length === 0" class="empty-state">
            暂无历史账簿记录
          </div>
        </el-tab-pane>

        <el-tab-pane label="本期操作" name="actions">
          <div class="actions-panel">
            <h4>当前会计期间: {{ currentPeriodDisplay }}</h4>
            <el-button
              type="primary"
              @click="attemptSettleCurrentPeriod"
              :loading="settlementCheckLoading"
              icon="el-icon-finished"
              style="margin-right: 10px;"
            >
              本期结账
            </el-button>
            <el-button
              type="warning"
              @click="openReversePostingDialog"
              icon="el-icon-refresh-left"
            >
              已过账凭证反记账
            </el-button>
            <el-button @click="loadAllVoucherData" icon="el-icon-refresh" style="margin-left:10px;">刷新凭证状态</el-button>

            <div v-if="unapprovedVouchers.length > 0 && settlementCheckAttempted" style="margin-top: 20px;">
              <el-alert
                title="存在未审核/待处理凭证"
                type="warning"
                show-icon
                :closable="false"
              >
                <p>以下凭证需要处理后才能结账:</p>
                <ul>
                  <li v-for="voucher in unapprovedVouchers.slice(0, 5)" :key="voucher.id">
                    凭证号: {{ voucher.voucherNo }} (状态: {{ voucher.status }}, 制单: {{ voucher.preparedBy }})
                  </li>
                  <li v-if="unapprovedVouchers.length > 5">...等共 {{ unapprovedVouchers.length }} 张凭证</li>
                </ul>
                <el-button type="text" @click="$router.push({ name: 'VoucherReview' })" v-if="hasPendingReview">前往凭证审核</el-button>
                <el-button type="text" @click="$router.push({ name: 'VoucherView' })" style="margin-left:10px;">前往凭证查看</el-button>
              </el-alert>
            </div>
             <div v-if="settlementMessage" :class="['settlement-status', settlementMessageType]">
                {{ settlementMessage }}
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Reverse Posting Dialog -->
    <el-dialog
      title="选择要反记账的凭证"
      :visible.sync="reverseDialogVisible"
      width="75%"
      top="5vh"
      :close-on-click-modal="false"
    >
      <el-table
        ref="reverseTable"
        :data="postedVouchersForReversal"
        stripe
        border
        style="width: 100%"
        v-loading="loadingReversalVouchers"
        @selection-change="handleReverseSelectionChange"
        height="400px"
      >
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="voucherNo" label="凭证号" width="150" sortable></el-table-column>
        <el-table-column prop="voucherDate" label="凭证日期" width="120" sortable></el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
        <el-table-column prop="preparedBy" label="制单人员" width="120"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container" style="margin-top: 15px; text-align: right;" v-if="totalPostedVouchers > reversePageSize">
          <el-pagination
            small
            background
            @current-change="handleReversePageChange"
            :current-page="reversePageNum"
            :page-size="reversePageSize"
            layout="total, prev, pager, next"
            :total="totalPostedVouchers">
          </el-pagination>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="reverseDialogVisible = false">取 消</el-button>
        <el-button
          type="primary"
          @click="confirmReversePosting"
          :disabled="selectedVouchersForReversal.length === 0"
          :loading="reversingLoading"
        >
          确定反记账 ({{ selectedVouchersForReversal.length }})
        </el-button>
      </span>
    </el-dialog>

    <!-- Settlement Details Dialog (New) -->
    <el-dialog
      title="确认本期结账信息"
      :visible.sync="settlementDetailsDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="settlementCheckLoading = false"
    >
      <el-form :model="settlementForm" :rules="settlementFormRules" ref="settlementFormRef" label-width="80px">
        <el-form-item label="会计期间">
          <el-input :value="currentPeriodDisplay" disabled></el-input>
        </el-form-item>
        <el-form-item label="摘要" prop="summary">
          <el-input v-model="settlementForm.summary" placeholder="请输入本期结账摘要"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remarks">
          <el-input type="textarea" v-model="settlementForm.remarks" placeholder="请输入备注信息 (可选)"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="settlementDetailsDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleConfirmSettlementWithDetails" :loading="performingSettlementLoading">
          确定结账
        </el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import initialLedgersDataFromFile from '@/data/ledgers.json'; // Renamed for clarity
import initialVouchersData from '@/data/vouchers.json';
import { format } from 'date-fns';

const HISTORICAL_LEDGERS_LS_KEY = 'vue_historical_ledgers_data';
const VOUCHERS_LS_KEY = 'userVouchers';

export default {
  name: "LedgerManagement",
  data() {
    return {
      activeTab: 'history',
      historicalLedgers: [],
      loadingHistory: false,
      allVouchers: [],
      loadingVouchers: false,
      currentUser: JSON.parse(localStorage.getItem("xm-user") || "{}"),

      // Settlement
      currentPeriodDisplay: this.getCurrentPeriodFormatted(),
      settlementCheckLoading: false, // Loading for initial voucher check
      performingSettlementLoading: false, // Loading for the actual settlement process
      unapprovedVouchers: [],
      settlementMessage: "",
      settlementMessageType: "info",
      settlementCheckAttempted: false, // To show unapproved vouchers only after an attempt

      // New Settlement Details Dialog
      settlementDetailsDialogVisible: false,
      settlementForm: {
        summary: '',
        remarks: ''
      },
      settlementFormRules: {
        summary: [
          { required: true, message: '请输入结账摘要', trigger: 'blur' }
        ]
      },

      // Reverse Posting
      reverseDialogVisible: false,
      allPostedVouchers: [],
      postedVouchersForReversal: [],
      selectedVouchersForReversal: [],
      loadingReversalVouchers: false,
      reversingLoading: false,
      reversePageNum: 1,
      reversePageSize: 10,
      totalPostedVouchers: 0,
    };
  },
  computed: {
    hasPendingReview() {
      return this.unapprovedVouchers.some(v => v.status === '待审核');
    }
  },
  created() {
    this.loadHistoricalLedgers();
    this.loadAllVoucherData();
  },
  methods: {
    getCurrentPeriodFormatted() {
      return format(new Date(), 'yyyy-MM');
    },
    _saveHistoricalLedgersToLocalStorage() {
      try {
        localStorage.setItem(HISTORICAL_LEDGERS_LS_KEY, JSON.stringify(this.historicalLedgers));
      } catch (e) {
        console.error("Error saving historical ledgers to localStorage:", e);
        this.$message.error("保存历史账簿数据失败！");
      }
    },
    loadHistoricalLedgers() {
      this.loadingHistory = true;
      setTimeout(() => { // Simulate API delay
        const storedLedgers = localStorage.getItem(HISTORICAL_LEDGERS_LS_KEY);
        if (storedLedgers) {
          try {
            this.historicalLedgers = JSON.parse(storedLedgers);
          } catch (e) {
            console.error("Error parsing historical ledgers from localStorage, using initial data:", e);
            this.historicalLedgers = JSON.parse(JSON.stringify(initialLedgersDataFromFile));
            this._saveHistoricalLedgersToLocalStorage();
          }
        } else {
          this.historicalLedgers = JSON.parse(JSON.stringify(initialLedgersDataFromFile));
          this._saveHistoricalLedgersToLocalStorage();
        }
        this.historicalLedgers.sort((a, b) => b.period.localeCompare(a.period));
        this.loadingHistory = false;
      }, 300);
    },
    loadAllVoucherData() {
      this.loadingVouchers = true;
      this.settlementMessage = "";
      try {
        const rawStored = localStorage.getItem(VOUCHERS_LS_KEY);
        let storedVouchers = rawStored ? JSON.parse(rawStored) : [];

        const combinedMap = new Map();
        initialVouchersData.forEach(v => combinedMap.set(v.id || v.voucherNo, { ...v }));
        storedVouchers.forEach(v => combinedMap.set(v.id || v.voucherNo, { ...v })); // localStorage overrides file data
        this.allVouchers = Array.from(combinedMap.values());
        this.checkVouchersForSettlement();
      } catch (e) {
        console.error("Error loading vouchers:", e);
        this.$message.error("加载凭证数据失败！");
        this.allVouchers = [];
      } finally {
        this.loadingVouchers = false;
      }
    },

    // --- Settlement Logic ---
    checkVouchersForSettlement() {
      this.unapprovedVouchers = this.allVouchers.filter(
        (v) => v.status !== "已过账" && v.status !== "已审核"
      );
      return this.unapprovedVouchers.length === 0;
    },
    attemptSettleCurrentPeriod() {
      this.settlementCheckLoading = true;
      this.settlementCheckAttempted = true; // Mark that an attempt was made
      this.settlementMessage = "";
      this.loadAllVoucherData();

      setTimeout(() => {
        if (!this.checkVouchersForSettlement()) {
          this.$message.error("存在未审核或状态不正确的凭证，无法结账！请检查凭证列表。");
          this.settlementMessageType = 'error';
          // settlementMessage will be implicitly handled by the unapprovedVouchers display
          this.settlementCheckLoading = false;
          return;
        }
        // All clear, open dialog for details
        this.settlementForm = { summary: '', remarks: '' };
        if (this.$refs.settlementFormRef) {
            this.$refs.settlementFormRef.clearValidate();
        }
        this.settlementDetailsDialogVisible = true;
        // settlementCheckLoading will be set to false when dialog is closed or on successful next step
      }, 500);
    },
    handleConfirmSettlementWithDetails() {
      this.$refs.settlementFormRef.validate((valid) => {
        if (valid) {
          this.$confirm(
            `确定要对当前会计期间 (${this.currentPeriodDisplay}) 进行结账吗? 摘要: "${this.settlementForm.summary}"`,
            "确认结账",
            {
              confirmButtonText: "确定结账",
              cancelButtonText: "取消",
              type: "warning",
            }
          )
          .then(() => {
            this.settlementDetailsDialogVisible = false;
            this.performSettlement(this.settlementForm.summary, this.settlementForm.remarks);
          })
          .catch(() => {
            this.$message.info("结账操作已取消。");
            this.settlementCheckLoading = false; // Reset if cancelled here
          });
        } else {
          this.$message.error('请填写必要的结账信息 (摘要)。');
          return false;
        }
      });
    },
    performSettlement(summary, remarks) {
      this.performingSettlementLoading = true;
      this.settlementCheckLoading = false; // Ensure initial button loading stops
      let changedCount = 0;

      const currentMonthVouchersToPost = this.allVouchers.filter(v => v.status === "已审核");

      if (currentMonthVouchersToPost.length === 0) {
          this.$message.info("没有找到可标记为“已过账”的已审核凭证。");
          this.settlementMessageType = 'info';
          this.settlementMessage = "没有需要过账的凭证。";
          this.performingSettlementLoading = false;
          return;
      }

      try {
        const rawStored = localStorage.getItem(VOUCHERS_LS_KEY);
        let storedVouchers = rawStored ? JSON.parse(rawStored) : [];
        const storedVouchersMap = new Map(storedVouchers.map(v => [v.id || v.voucherNo, v]));

        currentMonthVouchersToPost.forEach(voucherToPost => {
            const key = voucherToPost.id || voucherToPost.voucherNo;
            const existingVoucher = storedVouchersMap.get(key);
            if (existingVoucher) {
                existingVoucher.status = "已过账";
                storedVouchersMap.set(key, existingVoucher); // Update map
            } else {
                // This voucher was from initialVouchersData and not yet in localStorage
                const updatedVoucher = { ...voucherToPost, status: "已过账" };
                storedVouchersMap.set(key, updatedVoucher);
            }
            changedCount++;
        });

        localStorage.setItem(VOUCHERS_LS_KEY, JSON.stringify(Array.from(storedVouchersMap.values())));

        this.$message.success(`结账成功！${changedCount} 张凭证已标记为“已过账”。`);
        this.settlementMessageType = 'success';
        this.settlementMessage = `期间 ${this.currentPeriodDisplay} 结账成功。${changedCount} 张凭证状态更新为“已过账”。`;

        const newLedgerEntry = {
            id: `ledger-${this.currentPeriodDisplay}-${Date.now()}`,
            period: this.currentPeriodDisplay,
            settledDate: format(new Date(), 'yyyy-MM-dd'),
            settledBy: this.currentUser.name || 'System',
            summary: summary,
            totalVouchers: changedCount,
            remarks: remarks || ''
        };
        this.historicalLedgers.unshift(newLedgerEntry);
        this.historicalLedgers.sort((a, b) => b.period.localeCompare(a.period));
        this._saveHistoricalLedgersToLocalStorage(); // Save updated historical ledgers

        this.loadAllVoucherData(); // Refresh voucher states
        this.activeTab = 'history'; // Switch to history tab
      } catch (e) {
        console.error("Error during settlement:", e);
        this.$message.error("结账过程中发生错误！");
        this.settlementMessageType = 'error';
        this.settlementMessage = "结账失败，请检查控制台日志。";
      } finally {
        this.performingSettlementLoading = false;
      }
    },

    // --- Reverse Posting Logic (remains largely the same) ---
    openReversePostingDialog() {
      this.loadAllVoucherData();
      this.allPostedVouchers = this.allVouchers.filter(v => v.status === "已过账")
                                         .sort((a,b) => (b.voucherDate || '').localeCompare(a.voucherDate || '') || (b.voucherNo || '').localeCompare(a.voucherNo || ''));
      this.totalPostedVouchers = this.allPostedVouchers.length;
      this.reversePageNum = 1;
      this.paginateReverseVouchers();
      this.selectedVouchersForReversal = [];
      if (this.$refs.reverseTable) {
        this.$refs.reverseTable.clearSelection();
      }
      this.reverseDialogVisible = true;
    },
    paginateReverseVouchers() {
        const start = (this.reversePageNum - 1) * this.reversePageSize;
        const end = start + this.reversePageSize;
        this.postedVouchersForReversal = this.allPostedVouchers.slice(start, end);
    },
    handleReversePageChange(newPage) {
        this.reversePageNum = newPage;
        this.paginateReverseVouchers();
    },
    handleReverseSelectionChange(selection) {
      this.selectedVouchersForReversal = selection;
    },
    confirmReversePosting() {
      if (this.selectedVouchersForReversal.length === 0) {
        this.$message.warning("请至少选择一张凭证进行反记账。");
        return;
      }
      this.$confirm(
        `确定要对选中的 ${this.selectedVouchersForReversal.length} 张凭证进行反记账吗? 它们的状态将恢复为“已审核”。`,
        "确认反记账",
        {
          confirmButtonText: "确定反记账",
          cancelButtonText: "取消",
          type: "warning",
        }
      )
      .then(() => {
        this.performReversePosting();
      })
      .catch(() => {
        this.$message.info("反记账操作已取消。");
      });
    },
    performReversePosting() {
      this.reversingLoading = true;
      let changedCount = 0;
      try {
        const rawStored = localStorage.getItem(VOUCHERS_LS_KEY);
        let storedVouchers = rawStored ? JSON.parse(rawStored) : [];
        const storedVouchersMap = new Map(storedVouchers.map(v => [v.id || v.voucherNo, v]));

        this.selectedVouchersForReversal.forEach(voucherToReverse => {
            const key = voucherToReverse.id || voucherToReverse.voucherNo;
            const existingVoucher = storedVouchersMap.get(key);
            if (existingVoucher) {
                existingVoucher.status = "已审核";
                storedVouchersMap.set(key, existingVoucher);
            } else {
                const updatedVoucher = { ...voucherToReverse, status: "已审核" };
                storedVouchersMap.set(key, updatedVoucher);
            }
            changedCount++;
        });

        localStorage.setItem(VOUCHERS_LS_KEY, JSON.stringify(Array.from(storedVouchersMap.values())));
        this.$message.success(`反记账成功！${changedCount} 张凭证状态已更新为“已审核”。`);
        this.reverseDialogVisible = false;
        this.loadAllVoucherData();
      } catch (e) {
        console.error("Error during reverse posting:", e);
        this.$message.error("反记账过程中发生错误！");
      } finally {
        this.reversingLoading = false;
      }
    },
    statusTagType(status) {
      if (status === "已审核") return "success";
      if (status === "已过账") return "info";
      if (status === "待审核") return "warning";
      if (status === "已驳回") return "danger";
      return "";
    },
  },
};
</script>

<style scoped>
.ledger-management-container {
  padding: 20px;
}
.box-card {
  min-width: 900px;
}
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both;
}
.actions-panel {
  padding: 15px;
}
.actions-panel h4 {
  margin-bottom: 15px;
}
.empty-state {
  text-align: center;
  color: #909399;
  padding: 20px;
}
.settlement-status {
    margin-top: 20px;
    padding: 8px 16px;
    border-radius: 4px;
}
.settlement-status.info {
    background-color: #e6a23c20; /* Lighter yellow for info */
    color: #e6a23c;
    border: 1px solid #e6a23c80;
}
.settlement-status.success {
    background-color: #67c23a20; /* Lighter green for success */
    color: #67c23a;
    border: 1px solid #67c23a80;
}
.settlement-status.error {
    background-color: #f56c6c20; /* Lighter red for error */
    color: #f56c6c;
    border: 1px solid #f56c6c80;
}
.pagination-container {
    margin-top: 15px;
    text-align: right;
}
</style>
