<template>
  <div>
    <div class="search">
      <el-input placeholder="请输入部门名称查询" style="width: 200px" v-model="nameSearch"></el-input>
      <el-button type="info" plain style="margin-left: 10px" @click="load(1)">查询</el-button>
      <el-button type="warning" plain style="margin-left: 10px" @click="reset">重置</el-button>
    </div>

    <div class="operation">
      <el-button type="primary" plain @click="handleAdd">新增</el-button>
      <el-button type="danger" plain @click="delBatch">批量删除</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="序号" width="80" align="center" sortable></el-table-column>
        <el-table-column prop="name" label="部门名称" show-overflow-tooltip></el-table-column>
        <el-table-column prop="description" label="部门描述" show-overflow-tooltip></el-table-column>
        <el-table-column prop="employeeName" label="部门主管"></el-table-column>

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
            :page-sizes="[5, 10, 20]"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="total">
        </el-pagination>
      </div>
    </div>

    <el-dialog title="部门信息" :visible.sync="fromVisible" width="40%" :close-on-click-modal="false" destroy-on-close>
      <el-form label-width="100px" style="padding-right: 50px" :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="name" label="部门名称">
          <el-input v-model="form.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item prop="description" label="部门描述">
          <el-input v-model="form.description" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item prop="employeeId" label="部门主管">
          <el-select v-model="form.employeeId" placeholder="请选择主管" style="width: 100%">
            <el-option v-for="item in headerData" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
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
import importedEmployeeDataFromFile from '@/data/employees.json';
import importedDepartmentDataFromFile from '@/data/departments.json';

const LOCAL_STORAGE_KEY_DEPARTMENTS = 'vue_local_departments_data';
const LOCAL_STORAGE_KEY_EMPLOYEES = 'vue_local_employees_data'; // For consistency, though not modified here

export default {
  name: "Department",
  data() {
    return {
      allMockDepartmentData: [], // Source of truth for departments
      allMockEmployeeData: [],   // Source of truth for employees (used for dropdown)
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      nameSearch: null,
      fromVisible: false,
      form: {},
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        name: [
          {required: true, message: '请输入部门名称', trigger: 'blur'},
        ],
        employeeId: [
          {required: true, message: '请选择部门主管', trigger: 'change'},
        ]
      },
      ids: [],
      headerData: [],
    }
  },
  created() {
    this.loadEmployeesFromStorageOrFile(); // Load employees first for the dropdown
    this.loadDepartmentsFromStorageOrFile();
    this.loadHeaderData(); // Populate dropdown based on loaded employees
    this.load(1);
  },
  methods: {
    _saveDepartmentsToLocalStorage() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_DEPARTMENTS, JSON.stringify(this.allMockDepartmentData));
      } catch (e) {
        console.error("Error saving departments to localStorage:", e);
        this.$message.error('保存部门数据到本地存储失败!');
      }
    },
    _saveEmployeesToLocalStorage() { // Though not modified, good to have for initial seed
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_EMPLOYEES, JSON.stringify(this.allMockEmployeeData));
      } catch (e) {
        console.error("Error saving employees to localStorage:", e);
      }
    },
    loadDepartmentsFromStorageOrFile() {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_DEPARTMENTS);
      if (storedData) {
        try {
          this.allMockDepartmentData = JSON.parse(storedData);
        } catch (e) {
          console.error("Error parsing departments from localStorage:", e);
          this.$message.error('本地存储的部门数据格式错误，将使用默认数据。');
          this.allMockDepartmentData = JSON.parse(JSON.stringify(importedDepartmentDataFromFile));
          this._saveDepartmentsToLocalStorage();
        }
      } else {
        this.allMockDepartmentData = JSON.parse(JSON.stringify(importedDepartmentDataFromFile));
        this._saveDepartmentsToLocalStorage();
      }
    },
    loadEmployeesFromStorageOrFile() {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_EMPLOYEES);
      if (storedData) {
        try {
          this.allMockEmployeeData = JSON.parse(storedData);
        } catch (e) {
          console.error("Error parsing employees from localStorage:", e);
          this.allMockEmployeeData = JSON.parse(JSON.stringify(importedEmployeeDataFromFile));
          this._saveEmployeesToLocalStorage();
        }
      } else {
        this.allMockEmployeeData = JSON.parse(JSON.stringify(importedEmployeeDataFromFile));
        this._saveEmployeesToLocalStorage();
      }
    },
    loadHeaderData() {
      this.headerData = this.allMockEmployeeData.filter(emp => emp.name);
    },
    handleAdd() {
      this.form = {};
      this.fromVisible = true;
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row));
      this.fromVisible = true;
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          const selectedEmployee = this.allMockEmployeeData.find(emp => emp.id === this.form.employeeId);
          const employeeName = selectedEmployee ? selectedEmployee.name : null;

          if (this.form.id) { // Update
            const index = this.allMockDepartmentData.findIndex(dept => dept.id === this.form.id);
            if (index !== -1) {
              const updatedDepartment = {
                ...this.allMockDepartmentData[index],
                ...this.form,
                employeeName: employeeName
              };
              this.allMockDepartmentData.splice(index, 1, updatedDepartment);
              this.$message.success('更新成功');
            } else {
              this.$message.error('未找到要更新的部门');
              this.fromVisible = false;
              return;
            }
          } else { // Add
            const newId = this.allMockDepartmentData.length > 0
                           ? Math.max(...this.allMockDepartmentData.map(d => d.id)) + 1
                           : 1;
            const newDepartment = {
              ...this.form,
              id: newId,
              employeeName: employeeName
            };
            this.allMockDepartmentData.push(newDepartment);
            this.$message.success('新增成功');
          }
          this._saveDepartmentsToLocalStorage(); // Persist changes
          this.load(this.form.id ? this.pageNum : 1);
          this.fromVisible = false;
        } else {
            console.log('error submit!!');
            return false;
        }
      });
    },
    del(id) {
      this.$confirm('您确定删除吗？', '确认删除', {type: "warning"}).then(() => {
        const initialLength = this.allMockDepartmentData.length;
        this.allMockDepartmentData = this.allMockDepartmentData.filter(item => item.id !== id);
        
        if (this.allMockDepartmentData.length < initialLength) {
          this.$message.success('删除成功');
          this._saveDepartmentsToLocalStorage(); // Persist changes
          const totalPages = Math.ceil(this.allMockDepartmentData.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) {
            this.pageNum = totalPages;
          }
          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未找到要删除的部门');
        }
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id);
    },
    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择数据');
        return;
      }
      this.$confirm('您确定批量删除这些数据吗？', '确认删除', {type: "warning"}).then(() => {
        const initialLength = this.allMockDepartmentData.length;
        this.allMockDepartmentData = this.allMockDepartmentData.filter(item => !this.ids.includes(item.id));
        
        if (this.allMockDepartmentData.length < initialLength) {
            this.$message.success('批量删除成功');
            this.ids = [];
            this._saveDepartmentsToLocalStorage(); // Persist changes
            const totalPages = Math.ceil(this.allMockDepartmentData.length / this.pageSize);
            if (this.pageNum > totalPages && totalPages > 0) {
                this.pageNum = totalPages;
            }
            this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
            this.$message.error('未删除任何部门，请检查选择');
        }
      }).catch(() => {
        this.$message.info('已取消批量删除');
      });
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      let filteredData = [...this.allMockDepartmentData];
      if (this.nameSearch && this.nameSearch.trim() !== '') {
        filteredData = filteredData.filter(item =>
          item.name && item.name.toLowerCase().includes(this.nameSearch.toLowerCase())
        );
      }
      this.total = filteredData.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredData.slice(start, end);
    },
    reset() {
      this.nameSearch = null;
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
</style>
