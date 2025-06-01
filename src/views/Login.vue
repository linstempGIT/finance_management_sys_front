<template>
  <div class="login-container" :class="{ 'dark-mode': isDarkMode }"
    :style="{ backgroundImage: `url(${require('@/assets/imgs/loginBg.jpg')})` }">
    <!-- Dark Mode Toggle Button -->
    <button class="dark-mode-toggle" @click="toggleDarkMode" :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'">
      <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
    </button>

    <div class="content-wrapper">
      <!-- 登录表单区域 (包含 Logo 和 标题) -->
      <div :class="['login-card', 'animate__animated', 'animate__fadeInUp', { 'animate__shakeX': loginError }]"
        @animationend="onAnimationEnd">
        <!-- Logo 和 标题区域 -->
        <div class="logo-title-section">
          <img src="@/assets/imgs/logo.svg" alt="Logo" class="logo">
          <div class="system-title">欢迎登录企业财务管理系统</div>
        </div>

        <!-- 表单 -->
        <el-form :model="form" :rules="rules" ref="formRef">
          <el-form-item prop="username">
            <el-input prefix-icon="el-icon-user" placeholder="请输入账号" v-model="form.username" clearable></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input prefix-icon="el-icon-lock" placeholder="请输入密码" show-password v-model="form.password" clearable
              @keyup.enter.native="login"></el-input>
          </el-form-item>
          <el-form-item prop="role">
            <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
              <el-option label="管理员" value="ADMIN"></el-option>
              <el-option label="员工" value="USER"></el-option>
              <el-option label="财务人员" value="FINANCIAL"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type='primary' class="login-button" @click="login" :loading="loading">
              登 录
            </el-button>
          </el-form-item>
          <div class="extra-links">
            <div></div> <!-- Placeholder -->
            <div>
              还没有账号？请 <a href="/register" class="register-link">注册</a>
            </div>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script>
import '@/assets/css/login_register.css'; // Import specific CSS
import initialUsersData from '@/data/users.json'; // Import for initial data fallback

// Consistent key for all users list, used by Register.vue as well
const ALL_USERS_LS_KEY = 'vue_system_all_users_data';

export default {
  name: "Login",
  data() {
    return {
      isDarkMode: localStorage.getItem('darkMode') === 'true' || false,
      form: {
        username: '',
        password: '',
        role: null,
      },
      rules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
        ],
        role: [
          { required: true, message: '请选择角色', trigger: 'change' },
        ]
      },
      loading: false,
      loginError: false
    }
  },
  watch: {
    isDarkMode(newValue) {
      localStorage.setItem('darkMode', newValue);
      document.body.classList.toggle('dark-theme-global', newValue);
    }
  },
  mounted() {
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme-global');
    }
    // Ensure localStorage is initialized if empty
    this.getAllUsers();
  },
  beforeDestroy() {
    document.body.classList.remove('dark-theme-global');
  },
  methods: {
    getAllUsers() {
      const storedUsers = localStorage.getItem(ALL_USERS_LS_KEY);
      if (storedUsers) {
        try {
          return JSON.parse(storedUsers);
        } catch (e) {
          console.error("Error parsing users from localStorage in Login, falling back to initial data.", e);
          // If parsing fails, reset with initial data
          localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(initialUsersData));
          return JSON.parse(JSON.stringify(initialUsersData)); // Deep copy
        }
      } else {
        // If no data in localStorage, initialize from file and save it
        const usersCopy = JSON.parse(JSON.stringify(initialUsersData)); // Deep copy
        localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(usersCopy));
        return usersCopy;
      }
    },
    login() {
      this.$refs['formRef'].validate((valid) => {
        if (valid) {
          this.loading = true;
          this.loginError = false;

          setTimeout(() => {
            const { username, password, role } = this.form;
            const allUsers = this.getAllUsers();

            const foundUser = allUsers.find(
              user => user.username === username && user.password === password && user.role === role
            );

            if (foundUser) {
              const userToStore = {
                id: foundUser.id,
                username: foundUser.username,
                name: foundUser.name || '',
                role: foundUser.role,
                avatar: foundUser.avatar || '',
                token: foundUser.token || `fake-token-for-${foundUser.id}`,
                level: foundUser.level || null,
                departmentName: foundUser.departmentName || '未分配部门',
                phone: foundUser.phone || '', // ADDED
                email: foundUser.email || ''  // ADDED
              };
              localStorage.setItem("xm-user", JSON.stringify(userToStore)); // This is for the currently logged-in user
              this.$router.push('/');
              this.$message.success('登录成功');
            } else {
              this.$message.error('账号、密码或角色不匹配，请检查您的凭据');
              this.triggerShake();
            }
            this.loading = false;
          }, 500);

        } else {
          console.log('Form validation failed');
          this.triggerShake();
          return false;
        }
      });
    },
    triggerShake() {
      this.loginError = true;
    },
    onAnimationEnd() {
      if (this.loginError) {
        this.loginError = false;
      }
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    }
  }
}
</script>
