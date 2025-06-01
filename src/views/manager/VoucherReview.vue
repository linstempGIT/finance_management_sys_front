<template>
    <div class="voucher-review-container">
      <el-card class="box-card">
        <div slot="header" class="clearfix">
          <span>凭证审核</span>
          <el-button style="float: right; padding: 3px 0" type="text" @click="loadPendingVouchers">刷新列表</el-button>
        </div>
  
        <div v-if="!currentUser.name" class="no-user-warning">
            <el-alert
              title="无法获取当前用户信息"
              type="warning"
              description="请确保您已登录，否则无法执行审核操作。"
              show-icon
              :closable="false"
            ></el-alert>
        </div>
  
        <el-table :data="pendingVouchers" stripe style="width: 100%; margin-top: 20px;" v-loading="loading">
          <el-table-column prop="voucherNo" label="凭证号" width="150" sortable></el-table-column>
          <el-table-column prop="voucherDate" label="凭证日期" width="120" sortable></el-table-column>
          <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
          <el-table-column prop="preparedBy" label="制单人员" width="120"></el-table-column>
          <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="scope">
                  <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
              </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center">
              <template slot-scope="scope">
                   <el-button
                      size="mini"
                      type="text"
                      @click="viewDetails(scope.row)"
                      style="margin-right: 5px;">详情</el-button>
                  <el-button
                      size="mini"
                      type="success"
                      @click="approveVoucher(scope.row)"
                      :disabled="!canReview(scope.row)"
                      icon="el-icon-check"
                  >通过</el-button>
                  <el-button
                      size="mini"
                      type="danger"
                      @click="rejectVoucher(scope.row)"
                      :disabled="!canReview(scope.row)"
                      icon="el-icon-close"
                  >驳回</el-button>
              </template>
          </el-table-column>
        </el-table>
  
        <div v-if="!loading && pendingVouchers.length === 0" style="text-align: center; margin-top: 20px; color: #909399;">
            暂无待审核凭证
        </div>
      </el-card>
  
      <!-- Details Dialog -->
      <el-dialog
        title="凭证详情"
        :visible.sync="detailsDialogVisible"
        width="70%"
        :before-close="handleCloseDetailsDialog"
        top="5vh"
      >
        <div v-if="selectedVoucherForDetails">
          <el-descriptions :column="2" border size="medium">
            <el-descriptions-item label="凭证号">{{ selectedVoucherForDetails.voucherNo }}</el-descriptions-item>
            <el-descriptions-item label="凭证日期">{{ selectedVoucherForDetails.voucherDate }}</el-descriptions-item>
            <el-descriptions-item label="制单人员">{{ selectedVoucherForDetails.preparedBy }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(selectedVoucherForDetails.status)">{{ selectedVoucherForDetails.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ selectedVoucherForDetails.description }}</el-descriptions-item>
             <el-descriptions-item
              v-if="selectedVoucherForDetails.status === '已驳回' && selectedVoucherForDetails.reviewComment"
              label="驳回理由"
              :span="2"
            >
              <span style="color: red;">{{ selectedVoucherForDetails.reviewComment }}</span>
            </el-descriptions-item>
          </el-descriptions>
  
          <h4 style="margin-top: 20px; margin-bottom: 10px">凭证条目</h4>
          <el-table :data="selectedVoucherForDetails.entries" border size="small" stripe>
            <el-table-column prop="summary" label="摘要"></el-table-column>
            <el-table-column prop="accountCode" label="会计科目代码" width="150"></el-table-column>
            <el-table-column prop="accountName" label="会计科目名称" width="200"></el-table-column>
            <el-table-column prop="debitAmount" label="借方金额" align="right">
              <template slot-scope="entryScope">{{ formatAmount(entryScope.row.debitAmount) }}</template>
            </el-table-column>
            <el-table-column prop="creditAmount" label="贷方金额" align="right">
              <template slot-scope="entryScope">{{ formatAmount(entryScope.row.creditAmount) }}</template>
            </el-table-column>
          </el-table>
        </div>
        <span slot="footer" class="dialog-footer">
          <el-button @click="handleCloseDetailsDialog">关 闭</el-button>
        </span>
      </el-dialog>
  
    </div>
  </template>
  
  <script>
  import initialVouchersFromJson from '@/data/vouchers.json';
  import accountingItemsData from '@/data/accounting_items.json';
  
  export default {
    name: "VoucherReview",
    data() {
      return {
        allVouchers: [],
        pendingVouchers: [],
        loading: false,
        currentUser: JSON.parse(localStorage.getItem("xm-user") || "{}"),
        accountingItemsMap: {},
        detailsDialogVisible: false,
        selectedVoucherForDetails: null,
      };
    },
    created() {
      this.accountingItemsMap = accountingItemsData.reduce((map, item) => {
        map[item.code] = item.name;
        return map;
      }, {});
      this.loadAllVouchers();
    },
    methods: {
      loadAllVouchers() {
          this.loading = true;
          try {
              const rawStored = localStorage.getItem('userVouchers');
              let storedVouchers = rawStored ? JSON.parse(rawStored) : [];
  
              const enrichVoucher = voucher => ({
                  ...voucher,
                  entries: voucher.entries.map(entry => ({
                      ...entry,
                      accountName: entry.accountName || this.accountingItemsMap[entry.accountCode] || '未知科目'
                  }))
              });
  
              const enrichedInitialVouchers = initialVouchersFromJson.map(enrichVoucher);
              const enrichedStoredVouchers = storedVouchers.map(enrichVoucher);
  
              const combinedMap = new Map();
              // Add initial vouchers first
              enrichedInitialVouchers.forEach(v => combinedMap.set(v.id || v.voucherNo, v));
              // Then add/overwrite with stored vouchers (localStorage takes precedence)
              enrichedStoredVouchers.forEach(v => combinedMap.set(v.id || v.voucherNo, v));
  
              this.allVouchers = Array.from(combinedMap.values());
              this.filterPendingVouchers();
          } catch (e) {
              console.error("Error loading or parsing vouchers:", e);
              this.$message.error("加载凭证数据失败！");
              this.allVouchers = [];
              this.pendingVouchers = [];
          } finally {
              this.loading = false;
          }
      },
      filterPendingVouchers() {
          this.pendingVouchers = this.allVouchers.filter(
              (v) => v.status === "待审核"
          );
      },
      loadPendingVouchers() {
          this.loadAllVouchers();
      },
      canReview(voucher) {
          if (!this.currentUser || !this.currentUser.name) {
              return false;
          }
          return voucher.preparedBy !== this.currentUser.name;
      },
      updateVoucherStatus(voucherId, newStatus, reviewComment, successMessage) {
          this.loading = true;
          try {
              // It's crucial to update the master list in localStorage,
              // not just the `initialVouchersFromJson` or a copy.
              const rawStored = localStorage.getItem('userVouchers');
              let vouchersInStorage = rawStored ? JSON.parse(rawStored) : [];
  
              // Also get all vouchers (including those from JSON if they are part of the reviewable pool)
              // to find the one to update, then persist only to localStorage.
              // This assumes IDs are unique across JSON and localStorage, or localStorage overwrites.
  
              let allKnownVouchers = [];
              const combinedMapForUpdate = new Map();
              initialVouchersFromJson.forEach(v => combinedMapForUpdate.set(v.id || v.voucherNo, {...v})); // clone
              vouchersInStorage.forEach(v => combinedMapForUpdate.set(v.id || v.voucherNo, {...v}));// clone and overwrite
  
              allKnownVouchers = Array.from(combinedMapForUpdate.values());
  
              const voucherIndexInAll = allKnownVouchers.findIndex(v => v.id === voucherId);
              let voucherToUpdate = null;
  
              if (voucherIndexInAll > -1) {
                  voucherToUpdate = allKnownVouchers[voucherIndexInAll];
                  voucherToUpdate.status = newStatus;
                  if (newStatus === "已驳回" && reviewComment) {
                      voucherToUpdate.reviewComment = reviewComment;
                  } else {
                      delete voucherToUpdate.reviewComment; // Clear if not rejected or no comment
                  }
  
                  // Now, update localStorage.
                  // If the voucher originated from JSON and isn't in localStorage, add it.
                  // If it's already in localStorage, update it.
                  const storageIndex = vouchersInStorage.findIndex(v => v.id === voucherId);
                  if (storageIndex > -1) {
                      vouchersInStorage[storageIndex] = voucherToUpdate;
                  } else {
                      // This case implies a voucher from vouchers.json was reviewed.
                      // It should now be persisted in localStorage with its new status.
                      vouchersInStorage.push(voucherToUpdate);
                  }
                  localStorage.setItem('userVouchers', JSON.stringify(vouchersInStorage));
                  this.$message.success(successMessage);
                  this.loadAllVouchers(); // Refresh list from all sources
              } else {
                  this.$message.error("未找到凭证，无法更新状态！");
              }
          } catch (e) {
              console.error("Error updating voucher status:", e);
              this.$message.error("更新凭证状态失败！");
          } finally {
              this.loading = false;
          }
      },
      approveVoucher(voucher) {
        if (!this.canReview(voucher)) {
          this.$message.warning("您不能审核自己填开的凭证！");
          return;
        }
        this.$confirm(`确定要审核通过凭证 "${voucher.voucherNo}" 吗?`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.updateVoucherStatus(voucher.id, "已审核", null, `凭证 "${voucher.voucherNo}" 已审核通过`);
        }).catch(() => {
          this.$message.info('操作已取消');
        });
      },
      rejectVoucher(voucher) {
        if (!this.canReview(voucher)) {
          this.$message.warning("您不能审核自己填开的凭证！");
          return;
        }
        this.$prompt('请输入驳回原因', '驳回凭证', { // Reason is now mandatory for "已驳回"
          confirmButtonText: '确定驳回',
          cancelButtonText: '取消',
          inputValidator: (value) => {
              if (!value || value.trim() === '') {
                  return '驳回原因不能为空';
              }
              return true;
          },
          // inputErrorMessage: '驳回原因不能为空' // Covered by validator
        }).then(({ value }) => {
          this.updateVoucherStatus(voucher.id, "已驳回", value.trim(), `凭证 "${voucher.voucherNo}" 已驳回`);
        }).catch(() => {
          this.$message.info('操作已取消');
        });
      },
      viewDetails(voucher) {
        this.selectedVoucherForDetails = {
            ...voucher,
        };
        this.detailsDialogVisible = true;
      },
      handleCloseDetailsDialog() {
        this.detailsDialogVisible = false;
        this.selectedVoucherForDetails = null;
      },
      formatAmount(amount) {
        if (amount === null || amount === undefined) return "";
        return parseFloat(amount).toFixed(2);
      },
      statusTagType(status) {
        if (status === "已审核") return "success";
        if (status === "已过账") return "info";
        if (status === "待审核") return "warning";
        if (status === "已驳回") return "danger"; // New
        return ""; // 草稿
      },
    },
  };
  </script>
  
  <style scoped>
  .voucher-review-container {
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
  .no-user-warning {
      margin-bottom: 20px;
  }
  </style>
  