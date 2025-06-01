<template>
  <div>
    <div class="search">
      <el-input placeholder="请输年月：例如 2024-02" style="width: 200px" v-model="searchYearMonth" @keyup.enter.native="load(1)"></el-input>
      <el-button type="info" plain style="margin-left: 10px" @click="load(1)">查询</el-button>
      <el-button type="warning" plain style="margin-left: 10px" @click="reset">重置</el-button>
    </div>

    <div class="operation" v-if="canPerformWriteActions">
      <el-button type="primary" plain @click="handleAdd">新增</el-button>
      <el-button type="danger" plain @click="delBatch">批量删除</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" v-if="canPerformWriteActions"></el-table-column>
        <el-table-column prop="id" label="序号" width="80" align="center" sortable></el-table-column>
        <el-table-column prop="employeeName" label="员工姓名" show-overflow-tooltip></el-table-column>
        <el-table-column prop="departmentName" label="所属部门" show-overflow-tooltip></el-table-column>
        <el-table-column prop="year" label="年月"></el-table-column>
        <el-table-column prop="time" label="发放时间"></el-table-column>
        <el-table-column prop="price" label="发放薪资">
           <template v-slot="scope">
            {{ typeof scope.row.price === 'number' ? scope.row.price.toFixed(2) : scope.row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注说明" show-overflow-tooltip></el-table-column>

        <el-table-column label="操作" width="180" align="center" v-if="canPerformWriteActions">
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


    <el-dialog title="薪资信息" :visible.sync="fromVisible" width="40%" :close-on-click-modal="false" destroy-on-close>
      <el-form label-width="100px" style="padding-right: 50px" :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="employeeId" label="选择员工">
          <el-select v-model="form.employeeId" placeholder="请选择员工" style="width: 100%" filterable @change="handleEmployeeSelect">
            <el-option v-for="item in employeeData" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item prop="year" label="发放年月">
          <el-date-picker style="width: 100%"
              v-model="form.year"
              type="month"
              value-format="yyyy-MM"
              placeholder="选择月">
          </el-date-picker>
        </el-form-item>
        <el-form-item prop="time" label="发放时间">
          <el-date-picker style="width: 100%"
              v-model="form.time"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              placeholder="选择日期时间">
          </el-date-picker>
        </el-form-item>
        <el-form-item prop="price" label="发放薪资">
          <el-input-number v-model="form.price" :precision="2" :step="100" controls-position="right" style="width: 100%;"></el-input-number>
        </el-form-item>
        <el-form-item prop="note" label="备注说明">
          <el-input type="textarea" :rows="2" v-model="form.note" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="fromVisible = false">取 消</el-button>
        <el-button type="primary" @click="save">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import initialSalaryData from '@/data/selfSalary.json';
import initialEmployeeData from '@/data/usersForSalary.json'; // For employee dropdown

const SALARY_STORAGE_KEY = 'vue_salary_data_v1';
const EMPLOYEES_FOR_SALARY_KEY = 'vue_employees_for_salary_v1';

export default {
  name: "Salary", // Changed from "Department"
  data() {
    return {
      allSalaryData: [], // Holds all salary records from localStorage or initial JSON
      tableData: [],  // Data displayed in the current page
      pageNum: 1,
      pageSize: 10,
      total: 0,
      searchYearMonth: null, // Renamed from 'year' to be more specific
      fromVisible: false,
      form: { // Initialize form fields to prevent undefined issues
        employeeId: null,
        employeeName: null,
        departmentName: null,
        year: null,
        time: null,
        price: 0, // Initialize as number for el-input-number
        note: null,
      },
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        employeeId: [{ required: true, message: '请选择员工', trigger: 'change' }],
        year: [{ required: true, message: '请选择发放年月', trigger: 'change' }],
        price: [
          { required: true, message: '请输入发放薪资', trigger: 'blur' },
          { type: 'number', message: '薪资必须为数字值'}
        ],
        time: [{ required: true, message: '请选择发放时间', trigger: 'change'}]
      },
      ids: [],
      employeeData: [], // For the employee dropdown
    }
  },
  computed: {
    canPerformWriteActions() {
      return this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL';
    }
  },
  created() {
    this.loadEmployeeData(); // Load employee dropdown data
    this.loadInitialSalaryData(); // Load main salary data
    this.load(1); // Load first page of table
  },
  methods: {
    loadInitialSalaryData() {
      let storedSalaries = [];
      try {
        const raw = localStorage.getItem(SALARY_STORAGE_KEY);
        if (raw) {
          storedSalaries = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Error parsing salaries from localStorage:", e);
        localStorage.removeItem(SALARY_STORAGE_KEY);
      }

      if (storedSalaries.length > 0) {
        this.allSalaryData = storedSalaries;
      } else {
        // Deep copy initial data to prevent modification of imported array
        this.allSalaryData = JSON.parse(JSON.stringify(initialSalaryData));
        this.saveAllSalariesToLocalStorage();
      }
    },
    saveAllSalariesToLocalStorage() {
      try {
        localStorage.setItem(SALARY_STORAGE_KEY, JSON.stringify(this.allSalaryData));
      } catch (e) {
        console.error("Error saving salaries to localStorage:", e);
        this.$message.error("保存薪资数据到本地存储失败！");
      }
    },
    loadEmployeeData() {
      // Simulating loading employee data for the dropdown
      // In a real app, this might also come from localStorage or be static
      let storedEmployees = [];
      try {
        const raw = localStorage.getItem(EMPLOYEES_FOR_SALARY_KEY);
        if (raw) {
          storedEmployees = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Error parsing employees for salary from localStorage:", e);
        localStorage.removeItem(EMPLOYEES_FOR_SALARY_KEY);
      }

      if (storedEmployees.length > 0) {
          this.employeeData = storedEmployees;
      } else {
          this.employeeData = JSON.parse(JSON.stringify(initialEmployeeData));
          try {
            localStorage.setItem(EMPLOYEES_FOR_SALARY_KEY, JSON.stringify(this.employeeData));
          } catch (e) {
            console.error("Error saving initial employees for salary to localStorage:", e);
          }
      }
      // Filter out admins from employee selection if needed, though your JSON doesn't have them.
      // this.employeeData = this.employeeData.filter(emp => emp.role !== 'ADMIN');
    },
    handleEmployeeSelect(employeeId) {
        const selectedEmp = this.employeeData.find(emp => emp.id === employeeId);
        if (selectedEmp) {
            this.form.employeeName = selectedEmp.name;
            this.form.departmentName = selectedEmp.departmentName;
        }
    },
    handleAdd() {
      this.form = { price: 0 }; // Reset form, ensure price is a number
      this.fromVisible = true;
      this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row));
      // Ensure price is a number for el-input-number
      if (typeof this.form.price === 'string') {
        this.form.price = parseFloat(this.form.price) || 0;
      }
      this.fromVisible = true;
       this.$nextTick(() => {
        if (this.$refs.formRef) {
          this.$refs.formRef.clearValidate();
        }
      });
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          if (typeof this.form.price !== 'number') {
            this.form.price = parseFloat(this.form.price);
            if (isNaN(this.form.price)) {
                 this.$message.error('薪资必须是一个有效的数字');
                 return;
            }
          }

          const employee = this.employeeData.find(e => e.id === this.form.employeeId);
          if (employee) {
              this.form.employeeName = employee.name;
              this.form.departmentName = employee.departmentName;
          }


          if (this.form.id) { // Update
            const index = this.allSalaryData.findIndex(item => item.id === this.form.id);
            if (index !== -1) {
              this.$set(this.allSalaryData, index, { ...this.form }); // Use $set for reactivity
            }
          } else { // Add
            this.form.id = this.allSalaryData.length > 0 ? Math.max(...this.allSalaryData.map(item => item.id)) + 1 : 1;
            this.allSalaryData.unshift({ ...this.form }); // Add to the beginning for better UX
          }
          this.saveAllSalariesToLocalStorage();
          this.$message.success('保存成功');
          this.load(this.form.id ? this.pageNum : 1); // Reload current or first page
          this.fromVisible = false;
        } else {
            this.$message.error('请检查表单填写是否正确');
        }
      });
    },
    del(id) {
      this.$confirm('您确定删除这条薪资记录吗？', '确认删除', { type: "warning" }).then(() => {
        this.allSalaryData = this.allSalaryData.filter(item => item.id !== id);
        this.saveAllSalariesToLocalStorage();
        this.$message.success('删除成功');
        this.load(this.pageNum); // Reload current page
      }).catch(() => {});
    },
    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id);
    },
    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择要删除的数据');
        return;
      }
      this.$confirm(`您确定批量删除选中的 ${this.ids.length} 条薪资记录吗？`, '确认删除', { type: "warning" }).then(() => {
        this.allSalaryData = this.allSalaryData.filter(item => !this.ids.includes(item.id));
        this.saveAllSalariesToLocalStorage();
        this.$message.success('批量删除成功');
        this.load(1); // Reload to first page
        this.ids = []; // Clear selection
      }).catch(() => {});
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;

      let filteredData = [...this.allSalaryData];

      // Role-based filtering
      if (this.user.role === 'USER') {
        filteredData = filteredData.filter(item => item.employeeId === this.user.id);
      }

      // Search filtering
      if (this.searchYearMonth) {
        filteredData = filteredData.filter(item => item.year && item.year.includes(this.searchYearMonth));
      }

      // Sort by newest first (optional, based on 'time' or 'id')
      filteredData.sort((a, b) => (b.time || "").localeCompare(a.time || "") || b.id - a.id);


      this.total = filteredData.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredData.slice(start, end);
    },
    reset() {
      this.searchYearMonth = null;
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
.el-input-number.is-controls-right .el-input__inner {
  text-align: left; /* Align text to left for el-input-number */
}
</style>
