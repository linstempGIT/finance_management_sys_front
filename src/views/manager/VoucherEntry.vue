<template>
  <div class="voucher-entry-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>记账凭证</span>
      </div>
      <el-form
        :model="voucher"
        ref="voucherForm"
        label-width="100px"
        :rules="rules"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="凭证号" prop="voucherNo">
              <el-input
                v-model="voucher.voucherNo"
                placeholder="例如：记-001"
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="凭证日期" prop="voucherDate">
              <el-date-picker
                v-model="voucher.voucherDate"
                type="date"
                placeholder="选择日期"
                value-format="yyyy-MM-dd"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="制单人员" prop="preparedBy">
              <el-input v-model="voucher.preparedBy" disabled></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input
            type="textarea"
            v-model="voucher.description"
            placeholder="凭证描述"
          ></el-input>
        </el-form-item>

        <el-divider>凭证条目</el-divider>

        <el-table
          :data="voucher.entries"
          style="width: 100%"
          show-summary
          :summary-method="getSummaries"
        >
          <el-table-column label="操作" width="60" align="center">
            <template slot-scope="scope">
              <el-button
                size="mini"
                type="danger"
                icon="el-icon-delete"
                circle
                @click="removeEntry(scope.$index)"
                :disabled="voucher.entries.length <= 1"
              ></el-button>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="摘要" width="200">
            <template slot-scope="scope">
              <el-form-item
                :prop="'entries.' + scope.$index + '.summary'"
                :rules="entryRules.summary"
                label-width="0px"
              >
                <el-input
                  v-model="scope.row.summary"
                  placeholder="摘要"
                ></el-input>
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column prop="accountCode" label="会计科目代码" width="180">
            <template slot-scope="scope">
              <el-form-item
                :prop="'entries.' + scope.$index + '.accountCode'"
                :rules="entryRules.accountCode"
                label-width="0px"
              >
                <el-select
                  v-model="scope.row.accountCode"
                  placeholder="选择科目代码"
                  filterable
                  clearable
                  style="width: 100%"
                  @change="handleAccountCodeChange(scope.$index, scope.row.accountCode)"
                >
                  <el-option
                    v-for="item in accountingItems"
                    :key="item.code"
                    :label="item.code + ' - ' + item.name"
                    :value="item.code"
                  >
                    <span style="float: left">{{ item.code }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px;">{{ item.name }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column prop="accountName" label="会计科目名称" width="200">
             <template slot-scope="scope">
                <el-input v-model="scope.row.accountName" placeholder="科目名称" disabled></el-input>
             </template>
          </el-table-column>
          <el-table-column prop="debitAmount" label="借方金额" width="170" align="right">
            <template slot-scope="scope">
              <el-form-item
                :prop="'entries.' + scope.$index + '.debitAmount'"
                :rules="entryRules.amount"
                label-width="0px"
              >
                <el-input-number
                  v-model="scope.row.debitAmount"
                  :precision="2"
                  :step="0.01"
                  :min="0"
                  @change="handleAmountChange(scope.$index, 'debit')"
                  placeholder="0.00"
                  controls-position="right"
                  style="width: 100%"
                ></el-input-number>
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column prop="creditAmount" label="贷方金额" width="170" align="right">
            <template slot-scope="scope">
              <el-form-item
                :prop="'entries.' + scope.$index + '.creditAmount'"
                :rules="entryRules.amount"
                label-width="0px"
              >
                <el-input-number
                  v-model="scope.row.creditAmount"
                  :precision="2"
                  :step="0.01"
                  :min="0"
                  @change="handleAmountChange(scope.$index, 'credit')"
                  placeholder="0.00"
                  controls-position="right"
                  style="width: 100%"
                ></el-input-number>
              </el-form-item>
            </template>
          </el-table-column>
        </el-table>
        <el-button
          @click="addEntry"
          type="text"
          icon="el-icon-plus"
          style="margin-top: 10px"
          >添加分录</el-button
        >

        <el-form-item style="margin-top: 30px; text-align: center">
          <el-button type="primary" @click="saveVoucher">保存</el-button>
          <el-button type="success" @click="submitForReview"
            >提交审核</el-button
          >
        </el-form-item>
      </el-form>
      <div style="margin-top: 20px; font-weight: bold; text-align: right">
        状态: {{ voucher.status }}
      </div>
    </el-card>
  </div>
</template>

<script>
import accountingItemsData from '@/data/accounting_items.json';

export default {
  name: "VoucherEntry",
  data() {
    const validateAmountInEntry = (rule, value, callback) => {
      if (value !== null && value !== undefined && typeof value !== "number") {
        callback(new Error("请输入有效数字"));
      } else {
        callback();
      }
    };

    return {
      user: JSON.parse(localStorage.getItem("xm-user") || "{}"),
      accountingItems: [], // To store loaded accounting items
      voucher: {
        id: null,
        voucherNo: "",
        voucherDate: new Date().toISOString().slice(0, 10),
        description: "",
        preparedBy: "",
        entries: [
          // Initial entries are now created in initializeNewVoucher or loadExistingVoucher
        ],
        status: "草稿",
      },
      rules: {
        voucherNo: [
          { required: true, message: "请输入凭证号", trigger: "blur" },
        ],
        voucherDate: [
          { required: true, message: "请选择凭证日期", trigger: "change" },
        ],
        preparedBy: [{ required: true, message: "制单人不能为空" }],
      },
      entryRules: {
        summary: [{ required: true, message: "请输入摘要", trigger: "blur" }],
        accountCode: [
          { required: true, message: "请选择会计科目", trigger: "change" }, // Trigger on change for select
        ],
        amount: [{ validator: validateAmountInEntry, trigger: "change" }],
      },
      isEditMode: false,
    };
  },
  created() {
    this.accountingItems = accountingItemsData; // Load accounting items

    if (this.user && this.user.name) {
      this.voucher.preparedBy = this.user.name;
    } else {
      this.voucher.preparedBy = "未知用户";
    }

    if (
      this.$route.params &&
      this.$route.params.voucherData &&
      this.$route.params.mode === "edit"
    ) {
      this.loadExistingVoucher(this.$route.params.voucherData);
    } else {
      this.initializeNewVoucher();
    }
  },
  methods: {
    initializeNewVoucher() {
        this.isEditMode = false;
        const timestampSuffix = new Date().getTime().toString().slice(-5);
        this.voucher = {
            ...this.voucher, // Keep preparedBy etc.
            id: `LS-V${timestampSuffix}`,
            voucherNo: `记-${timestampSuffix}`,
            voucherDate: new Date().toISOString().slice(0, 10),
            description: "",
            entries: [
                this.createEmptyEntry(),
                this.createEmptyEntry(),
            ],
            status: "草稿",
        };
    },
    loadExistingVoucher(voucherData) {
        this.isEditMode = true;
        this.voucher = JSON.parse(JSON.stringify(voucherData));
        this.voucher.entries = this.voucher.entries.map((entry) => {
            const accountItem = this.accountingItems.find(item => item.code === entry.accountCode);
            return {
                ...entry,
                id: entry.id || Date.now() + Math.random(),
                accountName: accountItem ? accountItem.name : ''
            };
        });
    },
    createEmptyEntry() {
        return {
            id: Date.now() + Math.random(),
            summary: "",
            accountCode: "",
            accountName: "", // Initialize accountName
            debitAmount: null,
            creditAmount: null,
        };
    },
    addEntry() {
      this.voucher.entries.push(this.createEmptyEntry());
    },
    removeEntry(index) {
      if (this.voucher.entries.length > 1) {
        this.voucher.entries.splice(index, 1);
      } else {
        this.$message.warning("凭证至少需要一条分录");
      }
    },
    handleAccountCodeChange(index, accountCode) {
        const entry = this.voucher.entries[index];
        if (accountCode) {
            const selectedItem = this.accountingItems.find(item => item.code === accountCode);
            if (selectedItem) {
                entry.accountName = selectedItem.name;
            } else {
                entry.accountName = ''; // Clear if code not found (e.g., after clearing select)
            }
        } else {
            entry.accountName = ''; // Clear name if code is cleared
        }
        // Manually trigger validation for accountCode as its value changed programmatically for el-select
        this.$refs.voucherForm.validateField(`entries.${index}.accountCode`);
    },
    handleAmountChange(index, type) {
      const entry = this.voucher.entries[index];
      if (type === "debit" && entry.debitAmount !== null && entry.debitAmount >= 0) { // Allow 0
        entry.creditAmount = null;
      } else if (type === "credit" && entry.creditAmount !== null && entry.creditAmount >= 0) { // Allow 0
        entry.debitAmount = null;
      }
      // Trigger validation if needed
      this.$nextTick(() => {
          if (type === 'debit' && entry.creditAmount === null) {
              const fieldCredit = `entries.${index}.creditAmount`;
              if(this.$refs.voucherForm.fields){ // Check if fields exist
                const fieldInstanceCredit = this.$refs.voucherForm.fields.find(f => f.prop === fieldCredit);
                if (fieldInstanceCredit) fieldInstanceCredit.clearValidate(); // Clear validation if it becomes null
              }
          }
          if (type === 'credit' && entry.debitAmount === null) {
              const fieldDebit = `entries.${index}.debitAmount`;
               if(this.$refs.voucherForm.fields){ // Check if fields exist
                const fieldInstanceDebit = this.$refs.voucherForm.fields.find(f => f.prop === fieldDebit);
                if (fieldInstanceDebit) fieldInstanceDebit.clearValidate();
              }
          }
      });
    },
    validateVoucherEntries() {
      let isValid = true;
      let totalDebit = 0;
      let totalCredit = 0;

      if (this.voucher.entries.length === 0) {
        this.$message.error("凭证至少需要一条分录。");
        return false;
      }

      for (let i = 0; i < this.voucher.entries.length; i++) {
        const entry = this.voucher.entries[i];
        if (!entry.summary || !entry.accountCode) {
          this.$message.error(`第 ${i + 1} 条分录的摘要或会计科目未填写。`);
          isValid = false;
          break;
        }
        const debit = parseFloat(entry.debitAmount) || 0;
        const credit = parseFloat(entry.creditAmount) || 0;

        if (debit === 0 && credit === 0 && (entry.debitAmount !== null || entry.creditAmount !== null)) {
          // This case means one of them was explicitly set to 0, and the other is null or 0.
          // Allow this if one field is 0 and the other is null (implicitly 0).
          // The original error: "借方金额和贷方金额不能同时为0"
          // This should only be an error if *both* are explicitly 0 and nothing else,
          // or if both are null (meaning nothing entered).
          // Let's rephrase: at least one must be non-zero if any amount is entered.
        } else if (entry.debitAmount === null && entry.creditAmount === null) {
            this.$message.error(`第 ${i + 1} 条分录的借方金额或贷方金额至少填写一项。`);
            isValid = false;
            break;
        }


        if (debit < 0 || credit < 0) {
          this.$message.error(`第 ${i + 1} 条分录的金额不能为负。`);
          isValid = false;
          break;
        }
        // Allow one to be 0 if the other has a value
        if (entry.debitAmount !== null && entry.creditAmount !== null && debit > 0 && credit > 0) {
          this.$message.error(
            `第 ${i + 1} 条分录的借方金额和贷方金额不能同时有值 (大于0)。`
          );
          isValid = false;
          break;
        }
        totalDebit += debit;
        totalCredit += credit;
      }

      if (!isValid) return false;

      if (totalDebit.toFixed(2) !== totalCredit.toFixed(2)) {
        this.$message.error(
          `借贷不平衡！借方总计: ${totalDebit.toFixed(
            2
          )}, 贷方总计: ${totalCredit.toFixed(2)}`
        );
        return false;
      }
      return true;
    },
    _saveToLocalStorage() {
      try {
        let vouchers = JSON.parse(localStorage.getItem("userVouchers") || "[]");
        const voucherToSave = JSON.parse(JSON.stringify(this.voucher)); // Deep copy
        
        // Clean up entries: ensure amounts are numbers or null
        voucherToSave.entries = voucherToSave.entries.map(e => ({
            ...e,
            debitAmount: e.debitAmount === undefined ? null : Number(e.debitAmount),
            creditAmount: e.creditAmount === undefined ? null : Number(e.creditAmount),
        }));

        const existingIndex = vouchers.findIndex(
          (v) => v.id === voucherToSave.id
        );

        if (existingIndex > -1) {
          vouchers[existingIndex] = voucherToSave;
        } else {
          vouchers.push(voucherToSave);
        }
        localStorage.setItem("userVouchers", JSON.stringify(vouchers));
        return true;
      } catch (e) {
        console.error("Error saving to localStorage:", e);
        this.$message.error("保存到本地存储失败！");
        return false;
      }
    },
    _handleSaveSuccess() {
        this.$message.success(
            `凭证 ${this.isEditMode ? "更新" : "保存"}成功 (本地)`
        );
        if (!this.isEditMode) {
            this.initializeNewVoucher(); // Reset form for new entry
            this.$nextTick(() => {
                if (this.$refs.voucherForm) {
                     this.$refs.voucherForm.clearValidate();
                }
            });
        } else {
            this.$router.push("/voucherView"); // Go back to list after editing
        }
    },
    saveVoucher() {
      this.$refs.voucherForm.validate((valid) => {
        if (valid) {
          if (this.validateVoucherEntries()) {
            this.voucher.status = "草稿";
            if (this._saveToLocalStorage()) {
              this._handleSaveSuccess();
            }
          }
        } else {
          this.$message.error("请检查表单必填项！");
          return false;
        }
      });
    },
    submitForReview() {
      this.$refs.voucherForm.validate((valid) => {
        if (valid) {
          if (this.validateVoucherEntries()) {
            this.voucher.status = "待审核";
            if (this._saveToLocalStorage()) {
                this.$message.success(`凭证已提交审核 (本地)`);
                 if (!this.isEditMode) {
                    this.initializeNewVoucher();
                    this.$nextTick(() => {
                        if (this.$refs.voucherForm) {
                            this.$refs.voucherForm.clearValidate();
                        }
                    });
                } else {
                    this.$router.push("/voucherView");
                }
            }
          }
        } else {
          this.$message.error("请检查表单必填项！");
          return false;
        }
      });
    },
    getSummaries(param) {
        const { columns, data } = param;
        const sums = [];
        columns.forEach((column, index) => {
            if (index === 0) { // First column (Operation)
                sums[index] = '合计';
                return;
            }
            // Check if column.property is 'debitAmount' or 'creditAmount'
            // These are the props we set on the el-table-column
            if (column.property === 'debitAmount' || column.property === 'creditAmount') {
                const values = data.map(item => {
                    // Access the value directly using column.property
                    const val = item[column.property];
                    return Number(val); // Ensure it's a number, handles null/undefined as 0
                });

                if (values.length > 0 && !values.every(value => isNaN(value))) {
                    sums[index] = values.reduce((prev, curr) => {
                        const value = Number(curr);
                        return prev + (isNaN(value) ? 0 : value); // Add current value if it's a number
                    }, 0);
                    sums[index] = parseFloat(sums[index]).toFixed(2); // Format to 2 decimal places
                } else {
                    sums[index] = '0.00'; // Default to 0.00 if no valid numbers
                }
            } else {
                sums[index] = ''; // For other columns
            }
        });
        return sums;
    }
  },
};
</script>

<style scoped>
.voucher-entry-container {
  padding: 20px;
}
.box-card {
  min-width: 950px; /* Adjusted for new column */
}
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both;
}
.el-input-number {
  width: 100%;
}
.el-table .el-form-item {
  margin-bottom: 0; /* Keep this for compact table rows */
}
.el-select-dropdown__item {
  height: auto; /* Allow options to wrap if needed */
}
</style>
