<template>
  <div>
    <div class="search">
      <el-input placeholder="请输入账号查询" style="width: 200px" v-model="usernameSearch"></el-input>
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
        <el-table-column prop="id" label="序号" width="70" align="center" sortable></el-table-column>
        <el-table-column label="头像" width="70">
          <template v-slot="scope">
            <div style="display: flex; align-items: center">
              <el-image style="width: 40px; height: 40px; border-radius: 50%" v-if="scope.row.avatar"
                        :src="scope.row.avatar" :preview-src-list="[scope.row.avatar]"></el-image>
              <span v-else>无</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="账号"></el-table-column>
        <el-table-column prop="name" label="姓名"></el-table-column>
        <el-table-column prop="phone" label="电话" show-overflow-tooltip></el-table-column>
        <el-table-column prop="email" label="邮箱" show-overflow-tooltip></el-table-column>
        <el-table-column prop="departmentName" label="部门"></el-table-column>
        <el-table-column prop="role" label="角色">
          <template v-slot="scope">
            <el-tag v-if="scope.row.role === 'USER'" type="success">普通用户</el-tag>
            <el-tag v-if="scope.row.role === 'FINANCIAL'" type="warning">财务</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="身份"></el-table-column>
        <el-table-column label="操作" align="center" width="180">
          <template v-slot="scope">
            <el-button size="mini" type="primary" plain @click="handleEdit(scope.row)">编辑</el-button>
            <el-button size="mini" type="danger" plain @click="del(scope.row.id)">删除</el-button>
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

    <el-dialog :title="form.id ? '编辑员工' : '新增员工'" :visible.sync="fromVisible" width="45%" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="form" label-width="100px" style="padding-right: 50px" :rules="rules" ref="formRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用户名" :disabled="!!form.id"></el-input>
        </el-form-item>
         <el-form-item label="密码" prop="password" v-if="!form.id">
          <el-input v-model="form.password" placeholder="初始密码，不填默认为123456" show-password></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="姓名"></el-input>
        </el-form-item>
        <el-form-item label="头像">
          <el-input v-model="form.avatar" placeholder="请输入头像URL"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="普通用户" value="USER"></el-option>
            <el-option label="财务" value="FINANCIAL"></el-option>
            </el-select>
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="电话"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <!-- Modified Department Select -->
        <el-form-item label="部门" prop="departmentName">
        <el-select v-model="form.departmentName" placeholder="请选择部门" style="width: 100%">
            <!-- Value is now item.name, key is item.id for uniqueness -->
            <el-option v-for="item in allDepartmentsData" :key="item.id" :label="item.name" :value="item.name"></el-option>
        </el-select>
        </el-form-item>
        <el-form-item label="身份" prop="level">
        <el-select v-model="form.level" placeholder="请选择身份" style="width: 100%">
            <el-option label="主管" value="主管"></el-option>
            <el-option label="员工" value="员工"></el-option>
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
import initialUsersSource from '@/data/users.json'; // Source for employee data
import initialDepartmentsSource from '@/data/departments.json'; // Source for department dropdown

const LOCAL_STORAGE_KEY_USERS = 'vue_local_employee_data'; // Changed key for clarity
const LOCAL_STORAGE_KEY_DEPARTMENTS_FOR_DROPDOWN = 'vue_local_employee_departments_dropdown_data'; // Changed key

export default {
  name: "Employee", // Renamed component
  data() {
    const validateUsername = (rule, value, callback) => {
      if (!this.form.id) { // Only for new employees
        // allManagedEmployeesData already filtered for non-admins
        if (this.allManagedEmployeesData.some(emp => emp.username === value)) {
          callback(new Error('用户名已存在'));
        } else {
          callback();
        }
      } else { // For existing employees, username is disabled and doesn't need this validation
        callback();
      }
    };
    return {
      allManagedEmployeesData: [], // Holds non-admin employees managed by this component
      allDepartmentsData: [],    // Holds data from departments.json for the dropdown
      tableData: [],
      pageNum: 1,
      pageSize: 10,
      total: 0,
      usernameSearch: null,
      fromVisible: false,
      form: { // departmentId removed, departmentName added
        username: '', name: '', avatar: '', role: 'USER', phone: '', email: '',
        departmentName: null, // For selected department name
        level: '员工',        // Default level
        password: ''
      },
      // user: JSON.parse(localStorage.getItem('xm-user') || '{}'), // This seems like logged-in user, might not be needed here for employee management logic
      rules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          { validator: validateUsername, trigger: 'blur' }
        ],
        name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }],
        departmentName: [{ required: true, message: '请选择部门', trigger: 'change'}], // Validating departmentName
        level: [{ required: true, message: '请选择身份', trigger: 'change'}]
      },
      ids: []
    }
  },
  created() {
    this.loadDepartmentsForDropdown();
    this.loadEmployeesFromStorageOrFile();
    this.load(1); // Initial load for display
  },
  methods: {
    _saveManagedEmployeesToLocalStorage() {
      // This function saves only the non-admin employees managed by this component.
      // If the original users.json source (and thus localStorage for all users)
      // needs to be updated with these changes while preserving admins,
      // a more complex merge strategy is needed.

      // For simplicity, this will save only the non-admin list to its specific key.
      // To update the main users.json equivalent in localStorage (like vue_local_users_data from previous examples):
      let allUsersInMasterStorage = [];
      const masterUserStorageKey = 'vue_local_users_data'; // Assuming this key holds ALL users including admins
      try {
        const storedData = localStorage.getItem(masterUserStorageKey);
        if (storedData) {
          allUsersInMasterStorage = JSON.parse(storedData);
        } else {
          // If master key is empty, populate it from the initial source file once
          allUsersInMasterStorage = JSON.parse(JSON.stringify(initialUsersSource));
        }
      } catch (e) {
        console.error(`Error parsing users from master localStorage key '${masterUserStorageKey}':`, e);
        allUsersInMasterStorage = JSON.parse(JSON.stringify(initialUsersSource)); // Fallback
      }

      const adminsFromMaster = allUsersInMasterStorage.filter(u => u.role === 'ADMIN');
      // Ensure allManagedEmployeesData does not contain departmentId
      const employeesToSave = this.allManagedEmployeesData.map(emp => {
          const { departmentId, ...rest } = emp;
          return rest;
      });
      const updatedFullUserList = [...adminsFromMaster, ...employeesToSave];

      try {
        localStorage.setItem(masterUserStorageKey, JSON.stringify(updatedFullUserList));
      } catch (e) {
        console.error(`Error saving combined user list to master localStorage key '${masterUserStorageKey}':`, e);
        this.$message.error('保存员工数据到主存储失败!');
      }

      // Also save the filtered list to its own key if desired (optional, for this component's direct use)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(this.allManagedEmployeesData));
      } catch (e) {
        console.error("Error saving managed employees to localStorage:", e);
      }
    },
    _saveDepartmentsForDropdownToLocalStorage() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_DEPARTMENTS_FOR_DROPDOWN, JSON.stringify(this.allDepartmentsData));
      } catch (e) { console.error("Error saving departments for dropdown to localStorage:", e); }
    },

    loadEmployeesFromStorageOrFile() {
      let usersToProcess = [];
      // Prefer loading from the "master" user storage if it exists and is more up-to-date
      const masterUserStorageKey = 'vue_local_users_data';
      const storedMasterData = localStorage.getItem(masterUserStorageKey);

      if (storedMasterData) {
        try {
          usersToProcess = JSON.parse(storedMasterData);
        } catch (e) {
          console.error(`Error parsing master user data from localStorage, falling back to initial file:`, e);
          usersToProcess = JSON.parse(JSON.stringify(initialUsersSource));
        }
      } else {
        // If no master data, load from initial file and prime the master storage
        usersToProcess = JSON.parse(JSON.stringify(initialUsersSource));
        try {
            localStorage.setItem(masterUserStorageKey, JSON.stringify(usersToProcess));
        } catch (e) {
            console.error("Error initially saving full user list to master localStorage:", e);
        }
      }

      // Filter for non-admins and ensure data structure consistency
      this.allManagedEmployeesData = usersToProcess
        .filter(user => user.role !== 'ADMIN')
        .map(emp => {
          // Ensure level is "主管" or "员工". If users.json has L1/L2/L3, you'd map here.
          // For this example, we assume users.json is already updated.
          const { departmentId, ...rest } = emp; // Remove departmentId if it exists
          return {
            ...rest,
            departmentName: emp.departmentName || null, // Ensure departmentName exists
            level: emp.level || '员工' // Ensure level exists, default to '员工'
          };
        });
    },

    loadDepartmentsForDropdown() {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY_DEPARTMENTS_FOR_DROPDOWN);
      if (storedData) {
        try {
          this.allDepartmentsData = JSON.parse(storedData);
        } catch (e) {
          this.allDepartmentsData = JSON.parse(JSON.stringify(initialDepartmentsSource));
          this._saveDepartmentsForDropdownToLocalStorage();
        }
      } else {
        this.allDepartmentsData = JSON.parse(JSON.stringify(initialDepartmentsSource));
        this._saveDepartmentsForDropdownToLocalStorage();
      }
    },

    handleAdd() {
      this.form = {
        username: '', name: '', avatar: '', role: 'USER',
        phone: '', email: '',
        departmentName: null, // Use departmentName
        level: '员工', password: ''
      };
      this.fromVisible = true;
      this.$nextTick(() => { if (this.$refs.formRef) this.$refs.formRef.clearValidate(); });
    },
    handleEdit(row) {
      // Ensure row has departmentName, map if necessary from an old structure
      this.form = JSON.parse(JSON.stringify({
          ...row,
          departmentName: row.departmentName || null // Ensure it's present
      }));
      // departmentId is not used in the form
      this.fromVisible = true;
       this.$nextTick(() => { if (this.$refs.formRef) this.$refs.formRef.clearValidate(); });
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          if (this.form.role === 'ADMIN') {
            this.$message.error('此界面不能管理管理员账户。');
            return;
          }
          // departmentName is directly in this.form.departmentName
          // level is directly in this.form.level

          if (this.form.id) { // Update
            const index = this.allManagedEmployeesData.findIndex(emp => emp.id === this.form.id);
            if (index !== -1) {
              // Exclude departmentId if it accidentally got into the form object
              const { departmentId, ...formDataWithoutDeptId } = this.form;
              const updatedEmployee = {
                ...this.allManagedEmployeesData[index],
                ...formDataWithoutDeptId, // This includes departmentName and level
              };
              delete updatedEmployee.password; // Don't update password from form unless intended
              this.allManagedEmployeesData.splice(index, 1, updatedEmployee);
              this.$message.success('更新成功');
            } else {
               this.$message.error('未找到要更新的员工'); this.fromVisible = false; return;
            }
          } else { // Add
            let maxId = 0;
            // Consider IDs from the original full user list to avoid conflicts
            initialUsersSource.forEach(u => { if (u.id > maxId) maxId = u.id; });
            this.allManagedEmployeesData.forEach(emp => { if (emp.id > maxId) maxId = emp.id; });
            const newId = maxId + 1;

            const { departmentId, ...formDataWithoutDeptId } = this.form;
            const newEmployee = {
              ...formDataWithoutDeptId, // This includes departmentName and level
              id: newId,
              password: this.form.password || '123456', // Default password
              token: `fake-token-${newId}-${Date.now()}`,
            };
            this.allManagedEmployeesData.push(newEmployee);
            this.$message.success('新增成功');
          }
          this._saveManagedEmployeesToLocalStorage();
          this.load(this.form.id ? this.pageNum : 1); // Reload table
          this.fromVisible = false;
        } else {
          console.log('Validation error on form submit!!');
           if(!this.form.departmentName || !this.form.level){
             this.$message.warning('员工必须选择部门和身份');
          }
          return false;
        }
      });
    },
    del(id) {
      this.$confirm('您确定删除吗？', '确认删除', { type: "warning" }).then(() => {
        const initialLength = this.allManagedEmployeesData.length;
        this.allManagedEmployeesData = this.allManagedEmployeesData.filter(item => item.id !== id);
        if (this.allManagedEmployeesData.length < initialLength) {
          this.$message.success('删除成功');
          this._saveManagedEmployeesToLocalStorage();
          // Adjust current page if last item on a page is deleted
          const totalPages = Math.ceil(this.allManagedEmployeesData.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) this.pageNum = totalPages;
          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未找到要删除的员工');
        }
      }).catch(() => { this.$message.info('已取消删除'); });
    },
    handleSelectionChange(rows) { this.ids = rows.map(v => v.id); },
    delBatch() {
      if (!this.ids.length) { this.$message.warning('请选择数据'); return; }
      this.$confirm('您确定批量删除这些数据吗？', '确认删除', { type: "warning" }).then(() => {
        const initialLength = this.allManagedEmployeesData.length;
        this.allManagedEmployeesData = this.allManagedEmployeesData.filter(item => !this.ids.includes(item.id));
        if (this.allManagedEmployeesData.length < initialLength) {
          this.$message.success('批量删除成功'); this.ids = [];
          this._saveManagedEmployeesToLocalStorage();
          const totalPages = Math.ceil(this.allManagedEmployeesData.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) this.pageNum = totalPages;
          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未删除任何员工');
        }
      }).catch(() => { this.$message.info('已取消批量删除'); });
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      // allManagedEmployeesData is already filtered (non-admins) and has correct structure
      let filteredForDisplay = [...this.allManagedEmployeesData];

      if (this.usernameSearch && this.usernameSearch.trim() !== '') {
        filteredForDisplay = filteredForDisplay.filter(item =>
          item.username && item.username.toLowerCase().includes(this.usernameSearch.toLowerCase())
        );
      }
      this.total = filteredForDisplay.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredForDisplay.slice(start, end);
    },
    reset() { this.usernameSearch = null; this.load(1); },
    handleCurrentChange(pageNum) { this.load(pageNum); },
  }
}
</script>

<style scoped>
/* Styles remain the same as previous User.vue */
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; position: relative; overflow: hidden;
}
.avatar-uploader .el-upload:hover { border-color: #409EFF; }
.avatar-uploader-icon {
  font-size: 28px; color: #8c939d; width: 100px; height: 100px; line-height: 100px; text-align: center;
}
.avatar { width: 100px; height: 100px; display: block; }
.search, .operation, .table, .pagination {
  margin-bottom: 15px;
}
</style>
