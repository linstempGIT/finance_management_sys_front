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
              :headers="uploadHeaders"
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
  name: "AdminPerson",
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
  computed: {
    uploadHeaders() {
      const user = JSON.parse(localStorage.getItem('xm-user') || '{}');
      return {
        token: user.token // This token won't be used effectively without a backend
      };
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
          // This case should ideally not happen if Login.vue initializes it
          this.$message.error('无法找到用户列表，请重新登录后再试。');
          return;
        }

        // 2. Find the current user in the list and update their details
        const userIndex = allUsers.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
          allUsers[userIndex] = {
            ...allUsers[userIndex], // Preserve other fields like password, role, etc.
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
        // this.user is already updated via v-model and handleAvatarSuccess
        localStorage.setItem('xm-user', JSON.stringify(this.user));

        // 5. Success message and emit event
        this.$message.success('用户信息保存成功 (本地)');
        this.$emit('update:user', this.user); // Emit with the updated user object

      } catch (e) {
        console.error("Error updating user in localStorage:", e);
        this.$message.error('保存用户信息时发生错误。');
      }
    },
    handleAvatarSuccess(response, file, fileList) {
      // This method is called if the el-upload :action were to succeed.
      // For local demo, response.data would be the new avatar URL.
      // If you are testing without a backend, this might not get called,
      // or response.data might be undefined or an error object.
      // You might need to manually set user.avatar for testing if upload doesn't work.

      let newAvatarUrl = '';
      if (response && response.data) {
         newAvatarUrl = response.data; // Assuming response.data is the URL string
         // The complex URL manipulation logic from your original code:
          try {
            const url = new URL(newAvatarUrl); // Fails if newAvatarUrl is not a full URL
            url.protocol = "https:";
            url.hostname = "www.lingl.site";
            url.port = ""; // Port 80/443 is often implicit
            url.pathname = `/api${url.pathname}`;
            this.$set(this.user, 'avatar', url.toString());
          } catch (e) {
            // Fallback for relative paths or if URL constructor fails
            const baseUrl = process.env.VUE_APP_API_BASE_URL || "https://www.lingl.site/api"; // Adjusted for common case
            // Ensure no double slashes if newAvatarUrl starts with /
            const pathSegment = newAvatarUrl.startsWith('/') ? newAvatarUrl : `/${newAvatarUrl}`;
            this.$set(this.user, 'avatar', `${baseUrl}${pathSegment}`);
          }
      } else {
        // Fallback or for direct URL pasting simulation
        // For local testing, you might just use a placeholder or a direct URL
        // e.g., this.$set(this.user, 'avatar', 'path/to/new/local-avatar.png');
        console.warn("Avatar upload success handler called, but response.data is missing. Avatar not updated via upload.");
        // If you want to allow pasting a URL for avatar change in local demo:
        // let pastedUrl = prompt("Enter new avatar URL:");
        // if (pastedUrl) this.$set(this.user, 'avatar', pastedUrl);
        return; // Prevent further processing if no valid URL
      }
      this.$message.success('头像已更新 (本地预览), 请保存以持久化更改。');
    },
  }
}
</script>

<style scoped>
/deep/.el-form-item__label {
  font-weight: bold;
}
/deep/.el-upload {
  border-radius: 50%;
}
/deep/.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
}
/deep/.avatar-uploader .el-upload:hover {
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
