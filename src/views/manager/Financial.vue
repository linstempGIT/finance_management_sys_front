<template>
  <div>
    <div class="search">
      <el-input placeholder="请输入支出说明查询" style="width: 200px" v-model="searchName"></el-input> <!-- Changed v-model to searchName -->
      <el-button type="info" plain style="margin-left: 10px" @click="load(1)">查询</el-button>
      <el-button type="warning" plain style="margin-left: 10px" @click="reset">重置</el-button>
    </div>

    <div class="operation">
      <el-button type="primary" plain @click="handleAdd">新增</el-button>
      <el-button type="danger" plain @click="delBatch">批量删除</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange" v-loading="loading">
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="序号" width="80" align="center" sortable></el-table-column>
        <el-table-column prop="name" label="支出说明" show-overflow-tooltip></el-table-column>
        <el-table-column prop="price" label="支出金额" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ scope.row.price ? parseFloat(scope.row.price).toFixed(2) : '0.00' }}
          </template>
        </el-table-column>
        <el-table-column prop="time" label="支出时间"></el-table-column>
        <el-table-column prop="departmentName" label="支出部门"></el-table-column>

        <el-table-column label="操作" width="180" align="center">
          <template v-slot="scope">
            <el-button plain type="primary" @click="handleEdit(scope.row)" size="mini">编辑</el-button>
            <el-button plain type="danger" size="mini" @click="del(scope.row.id)">删除</el-button>
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


    <el-dialog title="财务支出信息" :visible.sync="fromVisible" width="40%" :close-on-click-modal="false" destroy-on-close @close="clearFormValidation">
      <el-form label-width="100px" style="padding-right: 50px" :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="departmentId" label="选择部门">
          <el-select v-model="form.departmentId" placeholder="请选择部门" style="width: 100%">
            <el-option v-for="item in departmentData" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item prop="time" label="支出时间">
          <el-date-picker style="width: 100%"
              v-model="form.time"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              placeholder="选择日期时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item prop="price" label="支出金额">
          <el-input v-model="form.price" autocomplete="off" placeholder="请输入数字"></el-input>
        </el-form-item>
        <el-form-item prop="name" label="支出说明">
          <el-input v-model="form.name" autocomplete="off" type="textarea" :rows="2"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="fromVisible = false">取 消</el-button>
        <el-button type="primary" @click="save" :loading="saving">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import initialFinancials from '@/data/financials.json';
import initialDepartments from '@/data/departments.json';
import { format } from 'date-fns'; // For consistent date formatting if needed, though el-date-picker handles it.

const FINANCIAL_STORAGE_KEY = 'vue_local_financial_data';

export default {
  name: "Financial", // Changed to "Financial" for clarity
  data() {
    return {
      allFinancialData: [], // Stores all financial records
      tableData: [],  // Data for the current page
      pageNum: 1,
      pageSize: 10,
      total: 0,
      searchName: null, // Renamed from `name` to avoid conflict with form.name
      fromVisible: false,
      form: { // Initialize form object to prevent undefined errors
        departmentId: null,
        time: null,
        price: null,
        name: null,
      },
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        departmentId: [
          { required: true, message: '请选择部门', trigger: 'change' }, // Changed trigger to change for select
        ],
        time: [
          { required: true, message: '请选择支出时间', trigger: 'blur' },
        ],
        price: [
          { required: true, message: '请输入支出金额', trigger: 'blur' },
          { pattern: /^[0-9]+(\.[0-9]{1,2})?$/, message: '请输入有效的金额', trigger: 'blur' }
        ],
        name: [
            { required: true, message: '请输入支出说明', trigger: 'blur' }
        ]
      },
      ids: [],
      departmentData: [],
      loading: false,
      saving: false,
    }
  },
  created() {
    this.loadDepartments();
    this.loadInitialFinancialData();
    this.load(1);
  },
  methods: {
    loadDepartments() {
      // Directly use imported data or simulate async if needed for consistency
      this.departmentData = initialDepartments;
      // If departments were also in localStorage:
      // const storedDepartments = localStorage.getItem('vue_local_departments_data');
      // if (storedDepartments) {
      //   this.departmentData = JSON.parse(storedDepartments);
      // } else {
      //   this.departmentData = initialDepartments;
      //   localStorage.setItem('vue_local_departments_data', JSON.stringify(initialDepartments));
      // }
    },
    loadInitialFinancialData() {
        this.loading = true;
        try {
            const storedData = localStorage.getItem(FINANCIAL_STORAGE_KEY);
            if (storedData) {
                this.allFinancialData = JSON.parse(storedData);
            } else {
                // Map departmentName to initial data if not present
                this.allFinancialData = initialFinancials.map(f => {
                    const dept = this.departmentData.find(d => d.id === f.departmentId);
                    return {
                        ...f,
                        departmentName: dept ? dept.name : '未知部门'
                    };
                });
                this.saveAllFinancialDataToLocalStorage();
            }
        } catch (e) {
            console.error("Error loading financial data from localStorage:", e);
            this.allFinancialData = initialFinancials.map(f => {
                const dept = this.departmentData.find(d => d.id === f.departmentId);
                return {
                    ...f,
                    departmentName: dept ? dept.name : '未知部门'
                };
            });
            this.saveAllFinancialDataToLocalStorage(); // Save initial if error
            this.$message.error("加载本地财务数据失败，已重置为初始数据。");
        }
        this.loading = false;
    },
    saveAllFinancialDataToLocalStorage() {
        try {
            localStorage.setItem(FINANCIAL_STORAGE_KEY, JSON.stringify(this.allFinancialData));
        } catch (e) {
            console.error("Error saving financial data to localStorage:", e);
            this.$message.error("保存财务数据到本地存储失败！");
        }
    },
    clearFormValidation() {
      if (this.$refs.formRef) {
        this.$refs.formRef.clearValidate();
      }
    },
    handleAdd() {
      this.form = { departmentId: null, time: null, price: null, name: null }; // Clear form for new entry
      this.fromVisible = true;
      this.$nextTick(() => { // Ensure dialog is rendered before clearing validation
        this.clearFormValidation();
      });
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row));
      this.fromVisible = true;
       this.$nextTick(() => {
        this.clearFormValidation();
      });
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          this.saving = true;
          const department = this.departmentData.find(d => d.id === this.form.departmentId);
          this.form.departmentName = department ? department.name : '未知部门';

          if (this.form.id) { // Update
            const index = this.allFinancialData.findIndex(item => item.id === this.form.id);
            if (index !== -1) {
              this.$set(this.allFinancialData, index, { ...this.form }); // Use $set for reactivity
            }
          } else { // Add
            this.form.id = this.allFinancialData.length > 0 ? Math.max(...this.allFinancialData.map(item => item.id)) + 1 : 1;
            this.allFinancialData.push({ ...this.form });
          }
          this.saveAllFinancialDataToLocalStorage();
          this.$message.success('保存成功');
          this.load(this.form.id ? this.pageNum : 1); // Stay on current page for edit, go to first for new
          this.fromVisible = false;
          this.saving = false;
        } else {
          this.$message.error('请检查表单信息');
          return false;
        }
      });
    },
    del(id) {
      this.$confirm('您确定删除吗？', '确认删除', { type: "warning" }).then(() => {
        this.allFinancialData = this.allFinancialData.filter(item => item.id !== id);
        this.saveAllFinancialDataToLocalStorage();
        this.$message.success('删除成功');
        // Adjust pageNum if the last item on a page is deleted
        const maxPage = Math.ceil(this.allFinancialData.length / this.pageSize);
        if (this.pageNum > maxPage && maxPage > 0) {
            this.pageNum = maxPage;
        } else if (this.allFinancialData.length === 0) {
            this.pageNum = 1;
        }
        this.load(this.pageNum);
      }).catch(() => {});
    },
    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id);
    },
    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择数据');
        return;
      }
      this.$confirm('您确定批量删除这些数据吗？', '确认删除', { type: "warning" }).then(() => {
        this.allFinancialData = this.allFinancialData.filter(item => !this.ids.includes(item.id));
        this.saveAllFinancialDataToLocalStorage();
        this.$message.success('批量删除成功');
        const maxPage = Math.ceil(this.allFinancialData.length / this.pageSize);
        if (this.pageNum > maxPage && maxPage > 0) {
            this.pageNum = maxPage;
        } else if (this.allFinancialData.length === 0) {
            this.pageNum = 1;
        }
        this.load(this.pageNum);
        this.ids = []; // Clear selection
      }).catch(() => {});
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      this.loading = true;

      let filteredData = [...this.allFinancialData];

      if (this.searchName) {
        filteredData = filteredData.filter(item => item.name && item.name.toLowerCase().includes(this.searchName.toLowerCase()));
      }

      // Sort by ID descending to show newer items first, or by time
      filteredData.sort((a, b) => b.id - a.id);


      this.total = filteredData.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredData.slice(start, end);
      this.loading = false;
    },
    reset() {
      this.searchName = null;
      this.load(1);
    },
    handleCurrentChange(pageNum) {
      this.load(pageNum);
    },
  }
}
</script>

<style scoped>
.search, .operation, .table, .pagination {
  margin-bottom: 15px;
}
.pagination {
  text-align: right;
  margin-top: 15px;
}
</style>
