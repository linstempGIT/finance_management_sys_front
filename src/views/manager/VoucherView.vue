<template>
  <div class="voucher-view-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>凭证查看</span>
      </div>

      <!-- Search Filters -->
      <div class="search-filters">
        <el-input
          v-model="filters.voucherNo"
          placeholder="凭证号"
          style="width: 200px; margin-right: 10px"
          clearable
          @keyup.enter.native="loadVouchers(1)"
        ></el-input>
        <el-input
          v-model="filters.preparedBy"
          placeholder="制单人员"
          style="width: 180px; margin-right: 10px"
          clearable
          @keyup.enter.native="loadVouchers(1)"
        ></el-input>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          style="width: 380px; margin-right: 10px"
          clearable
          @change="loadVouchers(1)"
        ></el-date-picker>
        <el-button type="primary" icon="el-icon-search" @click="loadVouchers(1)"
          >查询</el-button
        >
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <!-- Voucher Table -->
      <el-table :data="tableData" stripe style="width: 100%; margin-top: 20px">
        <el-table-column
          prop="voucherNo"
          label="凭证号"
          width="150"
          sortable
        ></el-table-column>
        <el-table-column
          prop="voucherDate"
          label="凭证日期"
          width="120"
          sortable
        ></el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column
          prop="preparedBy"
          label="制单人员"
          width="120"
        ></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{
              scope.row.status
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="text"
              @click="viewDetails(scope.row)"
              style="margin-right: 5px;"
              >详情</el-button
            >
            <el-button
              size="mini"
              type="text"
              @click="editVoucher(scope.row)"
              :disabled="!isEditable(scope.row.status)"
              >编辑</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div
        class="pagination-container"
        style="margin-top: 20px; text-align: right"
      >
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
          <el-descriptions-item label="凭证号">{{
            selectedVoucherForDetails.voucherNo
          }}</el-descriptions-item>
          <el-descriptions-item label="凭证日期">{{
            selectedVoucherForDetails.voucherDate
          }}</el-descriptions-item>
          <el-descriptions-item label="制单人员">{{
            selectedVoucherForDetails.preparedBy
          }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(selectedVoucherForDetails.status)">{{
              selectedVoucherForDetails.status
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{
            selectedVoucherForDetails.description
          }}</el-descriptions-item>
          <el-descriptions-item
            v-if="selectedVoucherForDetails.status === '已驳回' && selectedVoucherForDetails.reviewComment"
            label="驳回理由"
            :span="2"
          >
            <span style="color: red;">{{ selectedVoucherForDetails.reviewComment }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px; margin-bottom: 10px">凭证条目</h4>
        <el-table
          :data="selectedVoucherForDetails.entries"
          border
          size="small"
          stripe
        >
          <el-table-column prop="summary" label="摘要"></el-table-column>
          <el-table-column
            prop="accountCode"
            label="会计科目代码"
            width="150"
          ></el-table-column>
          <el-table-column
            prop="accountName"
            label="会计科目名称"
            width="200"
          ></el-table-column>
          <el-table-column prop="debitAmount" label="借方金额" align="right">
            <template slot-scope="entryScope">{{
              formatAmount(entryScope.row.debitAmount)
            }}</template>
          </el-table-column>
          <el-table-column prop="creditAmount" label="贷方金额" align="right">
            <template slot-scope="entryScope">{{
              formatAmount(entryScope.row.creditAmount)
            }}</template>
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
import initialVouchersFromJson from "@/data/vouchers.json";
import accountingItemsData from "@/data/accounting_items.json";

export default {
  name: "VoucherView",
  data() {
    return {
      allVouchers: [],
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      filters: {
        voucherNo: "",
        preparedBy: "",
        dateRange: [],
      },
      detailsDialogVisible: false,
      selectedVoucherForDetails: null,
      accountingItemsMap: {},
    };
  },
  created() {
    this.accountingItemsMap = accountingItemsData.reduce((map, item) => {
      map[item.code] = item.name;
      return map;
    }, {});
    this.loadInitialData();
    this.loadVouchers();
  },
  methods: {
    loadInitialData() {
      let storedVouchers = [];
      try {
        const rawStored = localStorage.getItem("userVouchers");
        if (rawStored) {
          storedVouchers = JSON.parse(rawStored);
        }
      } catch (e) {
        console.error("Error parsing vouchers from localStorage:", e);
        localStorage.removeItem("userVouchers");
      }

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
      enrichedInitialVouchers.forEach(v => combinedMap.set(v.id || v.voucherNo, v));
      enrichedStoredVouchers.forEach(v => combinedMap.set(v.id || v.voucherNo, v));
      this.allVouchers = Array.from(combinedMap.values());
    },
    loadVouchers(pageNum = this.pageNum) {
      this.pageNum = pageNum;
      let filtered = [...this.allVouchers];

      if (this.filters.voucherNo) {
        filtered = filtered.filter((v) =>
          v.voucherNo
            .toLowerCase()
            .includes(this.filters.voucherNo.toLowerCase())
        );
      }

      if (this.filters.preparedBy) {
        filtered = filtered.filter((v) =>
          v.preparedBy
            .toLowerCase()
            .includes(this.filters.preparedBy.toLowerCase())
        );
      }

      if (this.filters.dateRange && this.filters.dateRange.length === 2) {
        const startDate = this.filters.dateRange[0];
        const endDate = this.filters.dateRange[1];
        filtered = filtered.filter((v) => {
          const voucherDate = v.voucherDate;
          return voucherDate >= startDate && voucherDate <= endDate;
        });
      }

      this.total = filtered.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filtered.slice(start, end);
    },
    resetFilters() {
      this.filters.voucherNo = "";
      this.filters.preparedBy = "";
      this.filters.dateRange = [];
      this.loadVouchers(1);
    },
    handleCurrentChange(newPage) {
      this.loadVouchers(newPage);
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
      return ""; //草稿 or other
    },
    isEditable(status) {
      // Editable if it's '草稿', '待审核', or '已驳回'
      return !["已审核", "已过账"].includes(status);
    },
    editVoucher(voucher) {
      if (!this.isEditable(voucher.status)) {
        this.$message.warning("该凭证状态无法编辑！");
        return;
      }
      this.$router.push({
        name: "VoucherEntry",
        params: { voucherData: voucher, mode: "edit" },
      });
    },
    viewDetails(voucher) {
      this.selectedVoucherForDetails = {
          ...voucher,
          entries: voucher.entries.map(entry => ({ // Ensure accountName is present
              ...entry,
              accountName: entry.accountName || this.accountingItemsMap[entry.accountCode] || '未知科目'
          }))
      };
      this.detailsDialogVisible = true;
    },
    handleCloseDetailsDialog() {
      this.detailsDialogVisible = false;
      this.selectedVoucherForDetails = null;
    },
  },
};
</script>

<style scoped>
.voucher-view-container {
  padding: 20px;
}
.box-card {
  min-width: 900px;
}
.search-filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.search-filters > * {
  margin-bottom: 10px;
}
.el-descriptions {
  margin-top: 10px;
}
</style>
