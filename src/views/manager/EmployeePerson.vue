<template>
  <div>
    <el-card style="width: 50%">
      <el-form :model="user" label-width="100px" style="padding-right: 50px">
        <div style="margin: 15px; text-align: center">
          <el-upload
              class="avatar-uploader"
              :action="$baseUrl + '/files/upload'"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              title="点击上传头像 (注意: 本地演示时实际文件上传将不会成功)"
          >
            <img v-if="user.avatar" :src="user.avatar" class="avatar" />
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </div>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="user.username" placeholder="用户名" disabled></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="user.name" placeholder="姓名"></el-input>
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="user.phone" placeholder="电话"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="user.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <div style="text-align: center; margin-bottom: 20px">
          <el-button type="primary" @click="update">保 存</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
const ALL_USERS_LS_KEY = 'vue_system_all_users_data'; // Key for all users in localStorage

export default {
  name: "EmployeePerson",
  data() {
    return {
      user: JSON.parse(localStorage.getItem('xm-user') || '{}')
    }
  },
  created() {
    // Ensure user object has phone and email, if not present from initial login
    if (!('phone' in this.user)) {
      this.$set(this.user, 'phone', '');
    }
    if (!('email' in this.user)) {
      this.$set(this.user, 'email', '');
    }
  },
  methods: {
    update() {
      try {
        // 1. Get all users from localStorage
        const storedUsers = localStorage.getItem(ALL_USERS_LS_KEY);
        let allUsers = [];
        if (storedUsers) {
          allUsers = JSON.parse(storedUsers);
        } else {
          this.$message.error('无法找到用户列表，请重新登录后再试。');
          return;
        }

        // 2. Find the current user in the list and update their details
        const userIndex = allUsers.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
           allUsers[userIndex] = {
            ...allUsers[userIndex], // Preserve other fields
            name: this.user.name,
            phone: this.user.phone,
            email: this.user.email,
            avatar: this.user.avatar
          };
        } else {
          this.$message.error('当前用户信息无法在列表中找到，更新失败。');
          return;
        }

        // 3. Save the updated list of all users back to localStorage
        localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(allUsers));

        // 4. Update the currently logged-in user's details in localStorage ('xm-user')
        localStorage.setItem('xm-user', JSON.stringify(this.user));

        // 5. Success message and emit event
        this.$message.success('用户信息保存成功 (本地)');
        this.$emit('update:user', this.user);

      } catch (e) {
        console.error("Error updating user in localStorage:", e);
        this.$message.error('保存用户信息时发生错误。');
      }
    },
    handleAvatarSuccess(response, file, fileList) {
      // This method is called if the el-upload :action were to succeed.
      // response.data is assumed to be the new avatar URL.
      if (response && response.data) {
        this.$set(this.user, 'avatar', response.data);
        this.$message.success('头像已更新 (本地预览), 请保存以持久化更改。');
      } else {
        console.warn("Avatar upload success handler called, but response.data is missing. Avatar not updated via upload.");
      }
    },
  }
}
</script>

<style scoped>
::v-deep .el-form-item__label {
  font-weight: bold;
}
::v-deep .el-upload {
  border-radius: 50%;
}
::v-deep .avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
}
::v-deep .avatar-uploader .el-upload:hover {
  border-color: #409EFF;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  border-radius: 50%;
}
.avatar {
  width: 120px;
  height: 120px;
  display: block;
  border-radius: 50%;
}
</style>
