<template>
  <div>
    <div class="search">
      <el-input placeholder="请输入管理员账号查询" style="width: 200px" v-model="usernameSearch"></el-input>
      <el-button type="info" plain style="margin-left: 10px" @click="load(1)">查询</el-button>
      <el-button type="warning" plain style="margin-left: 10px" @click="reset">重置</el-button>
    </div>

    <div class="operation">
      <el-button type="primary" plain @click="handleAdd">新增管理员</el-button>
      <el-button type="danger" plain @click="delBatch">批量删除</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="序号" width="70" align="center" sortable></el-table-column>
        <el-table-column prop="username" label="账号"></el-table-column>
        <el-table-column prop="name" label="姓名"></el-table-column>
        <el-table-column prop="phone" label="电话" show-overflow-tooltip></el-table-column>
        <el-table-column prop="email" label="邮箱" show-overflow-tooltip></el-table-column>
        <el-table-column label="头像" width="70">
          <template v-slot="scope">
            <div style="display: flex; align-items: center">
              <el-image style="width: 40px; height: 40px; border-radius: 50%" v-if="scope.row.avatar"
                        :src="scope.row.avatar" :preview-src-list="[scope.row.avatar]"></el-image>
              <span v-else>无</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色">
          <template v-slot="scope">
            <el-tag v-if="scope.row.role === 'ADMIN'" type="primary">管理员</el-tag>
          </template>
        </el-table-column>
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

    <el-dialog :title="form.id ? '编辑管理员' : '新增管理员'" :visible.sync="fromVisible" width="45%" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="form" label-width="100px" style="padding-right: 50px" :rules="rules" ref="formRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用户名" :disabled="!!form.id"></el-input>
        </el-form-item>
        <el-form-item label="初始密码" prop="password" v-if="!form.id">
          <el-input v-model="form.password" placeholder="不填默认为admin123" show-password></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="姓名"></el-input>
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="电话"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="form.avatar" placeholder="请输入头像链接"></el-input>
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
import initialAllUsersSource from '@/data/users.json';

const LOCAL_STORAGE_ALL_USERS_KEY = 'vue_local_users_data'; // Master key for all users

export default {
  name: "AdminManagement", // Changed name for clarity
  data() {
    const validateUsername = (rule, value, callback) => {
      if (!this.form.id) { // Only for new admins
        // Check against all users in the system to ensure username uniqueness
        const allUsersInSystem = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ALL_USERS_KEY) || '[]');
        if (allUsersInSystem.some(user => user.username === value)) {
          callback(new Error('用户名已存在'));
        } else {
          callback();
        }
      } else {
        callback();
      }
    };
    return {
      allUsersDataInternal: [], // Holds ALL users (admins and non-admins) from localStorage or file
      tableData: [],      // Admins to be displayed in the table
      pageNum: 1,
      pageSize: 10,
      total: 0,
      usernameSearch: null, // Renamed from username to avoid conflict with form.username
      fromVisible: false,
      form: { // Form model for adding/editing an admin
        username: '',
        name: '',
        phone: '',
        email: '',
        avatar: '',
        password: '', // For new admins
        role: 'ADMIN' // Role is fixed
      },
      // user: JSON.parse(localStorage.getItem('xm-user') || '{}'), // For logged-in user, not directly used for managing other admins here
      rules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          { validator: validateUsername, trigger: 'blur' }
        ],
        name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        // Add other rules as needed, e.g., for email format
      },
      ids: [] // For batch delete
    }
  },
  created() {
    this.loadAllUsersFromStorageOrFile(); // Load all users into allUsersDataInternal
    this.load(1); // Then load admins into tableData
  },
  methods: {
    _saveAllUsersToLocalStorage() {
      try {
        localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(this.allUsersDataInternal));
      } catch (e) {
        console.error("Error saving all users to localStorage:", e);
        this.$message.error('保存用户数据到本地存储失败!');
      }
    },

    loadAllUsersFromStorageOrFile() {
      const storedData = localStorage.getItem(LOCAL_STORAGE_ALL_USERS_KEY);
      if (storedData) {
        try {
          this.allUsersDataInternal = JSON.parse(storedData);
        } catch (e) {
          console.error("Error parsing all users from localStorage, using initial from file:", e);
          this.allUsersDataInternal = JSON.parse(JSON.stringify(initialAllUsersSource));
          this._saveAllUsersToLocalStorage(); // Save initial data if localStorage was corrupt/empty
        }
      } else {
        this.allUsersDataInternal = JSON.parse(JSON.stringify(initialAllUsersSource));
        this._saveAllUsersToLocalStorage(); // Save initial data if localStorage was empty
      }
    },

    handleAdd() {
      this.form = {
        username: '', name: '', phone: '', email: '', avatar: '',
        password: '', role: 'ADMIN'
      };
      this.fromVisible = true;
      this.$nextTick(() => { if (this.$refs.formRef) this.$refs.formRef.clearValidate(); });
    },

    handleEdit(row) {
      // Make a deep copy to avoid modifying the table data directly
      this.form = JSON.parse(JSON.stringify(row));
      // Password is not typically edited in this kind of form, so we don't load it for editing.
      // If password change is needed, it's usually a separate "Change Password" feature.
      delete this.form.password;
      this.fromVisible = true;
      this.$nextTick(() => { if (this.$refs.formRef) this.$refs.formRef.clearValidate(); });
    },

    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          if (this.form.id) { // Update existing admin
            const index = this.allUsersDataInternal.findIndex(u => u.id === this.form.id && u.role === 'ADMIN');
            if (index !== -1) {
              // Preserve original password if not changing it via this form
              const originalPassword = this.allUsersDataInternal[index].password;
              this.allUsersDataInternal.splice(index, 1, {
                ...this.allUsersDataInternal[index], // keep original fields like token, etc.
                ...this.form, // apply form changes
                password: originalPassword, // ensure password isn't blanked if form doesn't include it for edit
                role: 'ADMIN' // Ensure role is ADMIN
              });
              this.$message.success('更新成功');
            } else {
              this.$message.error('未找到要更新的管理员');
              this.fromVisible = false; return;
            }
          } else { // Add new admin
            let maxId = 0;
            this.allUsersDataInternal.forEach(u => { if (u.id > maxId) maxId = u.id; });
            const newId = maxId + 1;

            const newAdmin = {
              ...this.form,
              id: newId,
              password: this.form.password || 'admin123', // Default password for new admin
              role: 'ADMIN',
              token: `fake-admin-token-${newId}-${Date.now()}` // Generate a mock token
              // Remove departmentName and level if they accidentally get into the form
            };
            delete newAdmin.departmentName;
            delete newAdmin.level;

            this.allUsersDataInternal.push(newAdmin);
            this.$message.success('新增成功');
          }
          this._saveAllUsersToLocalStorage();
          this.load(this.form.id ? this.pageNum : 1); // Reload table
          this.fromVisible = false;
        } else {
          console.log('Validation error on form submit!');
          return false;
        }
      });
    },

    del(id) {
      this.$confirm('您确定删除该管理员吗？', '确认删除', { type: "warning" }).then(() => {
        const initialLength = this.allUsersDataInternal.length;
        this.allUsersDataInternal = this.allUsersDataInternal.filter(user => !(user.id === id && user.role === 'ADMIN'));
        if (this.allUsersDataInternal.length < initialLength) {
          this.$message.success('删除成功');
          this._saveAllUsersToLocalStorage();
          // Adjust current page if last item on a page is deleted
          const admins = this.allUsersDataInternal.filter(u => u.role === 'ADMIN');
          const totalPages = Math.ceil(admins.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) this.pageNum = totalPages;

          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未找到要删除的管理员或操作被阻止');
        }
      }).catch(() => { this.$message.info('已取消删除'); });
    },

    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id);
    },

    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择要删除的管理员');
        return;
      }
      this.$confirm('您确定批量删除这些管理员吗？', '确认删除', { type: "warning" }).then(() => {
        const initialLength = this.allUsersDataInternal.length;
        this.allUsersDataInternal = this.allUsersDataInternal.filter(user =>
            !(user.role === 'ADMIN' && this.ids.includes(user.id))
        );
        if (this.allUsersDataInternal.length < initialLength) {
          this.$message.success('批量删除成功');
          this.ids = [];
          this._saveAllUsersToLocalStorage();

          const admins = this.allUsersDataInternal.filter(u => u.role === 'ADMIN');
          const totalPages = Math.ceil(admins.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) this.pageNum = totalPages;

          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未删除任何管理员或操作被阻止');
        }
      }).catch(() => { this.$message.info('已取消批量删除'); });
    },

    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;

      // Filter only admins from the internal full list
      let adminsToDisplay = this.allUsersDataInternal.filter(user => user.role === 'ADMIN');

      // Apply search filter if usernameSearch is provided
      if (this.usernameSearch && this.usernameSearch.trim() !== '') {
        adminsToDisplay = adminsToDisplay.filter(admin =>
          admin.username && admin.username.toLowerCase().includes(this.usernameSearch.toLowerCase())
        );
      }

      this.total = adminsToDisplay.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = adminsToDisplay.slice(start, end);
    },

    reset() {
      this.usernameSearch = null;
      this.load(1);
    },

    handleCurrentChange(pageNum) {
      this.load(pageNum);
    },
    // handleAvatarSuccess is removed as we are using an input field for avatar URL
  }
}
</script>

<style scoped>
/* Add any specific styles if needed */
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader .el-upload:hover {
  border-color: #409EFF;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px; /* Adjust as needed */
  height: 100px; /* Adjust as needed */
  line-height: 100px;
  text-align: center;
}
.avatar {
  width: 100px; /* Adjust as needed */
  height: 100px; /* Adjust as needed */
  display: block;
}
.search, .operation, .table, .pagination {
  margin-bottom: 15px;
}
</style>
