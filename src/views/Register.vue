<template>
  <div
    class="register-container"
    :class="{ 'dark-mode': isDarkMode }"
    :style="{ backgroundImage: `url(${require('@/assets/imgs/registerBg.jpg')})` }"
  >
    <!-- Dark Mode Toggle Button -->
    <button class="dark-mode-toggle" @click="toggleDarkMode" :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'">
      <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
    </button>

    <div class="content-wrapper">
      <!-- 注册卡片区域 (包含 Logo 和 标题) -->
      <div :class="['register-card', 'animate__animated', 'animate__fadeInUp', { 'animate__shakeX': registerError }]" @animationend="onAnimationEnd">
        <!-- Logo 和 标题区域 -->
        <div class="logo-title-section">
          <img src="@/assets/imgs/logo.svg" alt="Logo" class="logo">
          <div class="system-title">欢迎注册</div>
        </div>

        <!-- 表单 -->
        <el-form :model="form" :rules="rules" ref="formRef">
          <el-form-item prop="username">
            <el-input
              prefix-icon="el-icon-user"
              placeholder="请输入账号"
              v-model="form.username"
              clearable
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              prefix-icon="el-icon-lock"
              placeholder="请输入密码"
              show-password
              v-model="form.password"
              clearable
            ></el-input>
          </el-form-item>
          <el-form-item prop="confirmPass">
            <el-input
              prefix-icon="el-icon-lock"
              placeholder="请确认密码"
              show-password
              v-model="form.confirmPass"
              clearable
              @keyup.enter.native="register"
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-button
              type='primary'
              class="register-button"
              @click="register"
              :loading="loading"
            >
              注 册
            </el-button>
          </el-form-item>
          <div class="extra-links">
            <div></div> <!-- Placeholder -->
            <div>
              已有账号？请 <a href="/login" class="login-link">登录</a>
            </div>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script>
import '@/assets/css/login_register.css'; // Import specific CSS
import initialUsersData from '@/data/users.json'; // Import for initial data

// Consistent key for all users list, used by Login.vue as well
const ALL_USERS_LS_KEY = 'vue_system_all_users_data';

export default {
  name: "Register",
  data() {
    const validatePassword = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请确认密码'));
      } else if (value !== this.form.password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    return {
      isDarkMode: localStorage.getItem('darkMode') === 'true' || false,
      form: {
          username: '',
          password: '',
          confirmPass: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmPass: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: validatePassword, trigger: 'blur' }
        ]
      },
      loading: false,
      registerError: false
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
          console.error("Error parsing users from localStorage in Register, falling back to initial data.", e);
          localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(initialUsersData));
          return JSON.parse(JSON.stringify(initialUsersData)); // Deep copy
        }
      } else {
        const usersCopy = JSON.parse(JSON.stringify(initialUsersData));
        localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(usersCopy));
        return usersCopy;
      }
    },
    saveAllUsers(users) {
      try {
        localStorage.setItem(ALL_USERS_LS_KEY, JSON.stringify(users));
      } catch (e) {
        console.error("Error saving users to localStorage in Register:", e);
        this.$message.error("保存用户信息失败！");
      }
    },
    register() {
      this.$refs['formRef'].validate((valid) => {
        if (valid) {
          this.loading = true;
          this.registerError = false;

          setTimeout(() => {
            const allUsers = this.getAllUsers();
            const usernameExists = allUsers.some(user => user.username === this.form.username);

            if (usernameExists) {
              this.$message.error(`账号 "${this.form.username}" 已被注册，请使用其他账号。`);
              this.triggerShake();
              this.loading = false;
              return;
            }

            const maxId = allUsers.reduce((max, user) => Math.max(max, user.id || 0), 0);
            const newId = maxId + 1;

            const newUser = {
              id: newId,
              username: this.form.username,
              password: this.form.password,
              name: this.form.username,
              role: 'USER',
              avatar: '',
              token: `fake-local-token-${newId}`,
              phone: '',
              email: '',
              departmentName: null,
              level: '员工'
            };

            allUsers.push(newUser);
            this.saveAllUsers(allUsers);

            this.$message.success('注册成功！请登录。');
            this.$router.push('/login');
            this.loading = false;
          }, 500);

        } else {
          console.log('Form validation failed');
          this.triggerShake();
          return false;
        }
      })
    },
    triggerShake() {
        this.registerError = true;
    },
    onAnimationEnd() {
        this.registerError = false;
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    }
  }
}
</script>
