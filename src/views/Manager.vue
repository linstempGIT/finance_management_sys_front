<template>
  <!-- Apply dark mode class to the root container -->
  <div class="manager-container" :class="{ 'dark-mode': isDarkMode }">
    <!--  头部  -->
    <div class="manager-header">
      <div class="manager-header-left">
        <img
          src="@/assets/imgs/logo.svg"
          class="header-logo"
          alt="System Logo"
        />
        <div class="title">企业财务管理系统</div>
      </div>

      <div class="manager-header-center">
        <el-breadcrumb separator-class="el-icon-arrow-right">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item
            v-if="$route.meta && $route.meta.name"
            :to="{ path: $route.path }"
          >
            {{ $route.meta.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="manager-header-right">
        <!-- Dark Mode Toggle Button -->
        <button
          class="dark-mode-toggle"
          @click="toggleDarkMode"
          :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
        >
          <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
        </button>

        <el-dropdown placement="bottom">
          <div class="avatar">
            <!-- Add @error handler -->
            <img
              :src="user.avatar || defaultAvatarUrl"
              @error="handleAvatarError"
              alt="User Avatar"
            />
            <div>{{ user.name || user.username || "" }}</div>
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item @click.native="goToPerson"
              >个人信息</el-dropdown-item
            >
            <el-dropdown-item @click.native="$router.push('/password')"
              >修改密码</el-dropdown-item
            >
            <el-dropdown-item @click.native="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!--  主体  -->
    <div class="manager-main">
      <!--  侧边栏  -->
      <div class="manager-main-left">
        <el-menu
          ref="mainMenu"
          :default-active="$route.path"
          :unique-opened="false"
          :default-openeds="openSubmenuIndexes"
          @open="handleMenuOpen"
          @close="handleMenuClose"
          router
          style="border: none"
        >
          <!-- 系统首页 - Visible to all logged-in users -->
          <el-menu-item index="/home">
            <i class="el-icon-s-home"></i>
            <span slot="title">系统首页</span>
          </el-menu-item>

          <!-- 信息管理 - Admin only -->
          <el-submenu index="info" v-if="user.role === 'ADMIN'">
            <template slot="title">
              <i class="el-icon-collection"></i><span>信息管理</span>
            </template>
            <el-menu-item index="/notice">公告信息</el-menu-item>
            <el-menu-item index="/department">部门信息</el-menu-item>
          </el-submenu>

          <!-- 财务管理 - Admin or Financial -->
          <el-submenu
            index="finance"
            v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'"
          >
            <template slot="title">
              <i class="el-icon-money"></i><span>财务管理</span>
            </template>
            <el-menu-item index="/voucherEntry">凭证填开</el-menu-item>
            <el-menu-item index="/voucherView">凭证查看</el-menu-item>
            <el-menu-item index="/voucherReview">凭证审核</el-menu-item>
            <el-menu-item index="/ledgerManagement" v-if="user.level === '主管' || user.role === 'ADMIN'">账簿管理</el-menu-item>
          </el-submenu>

          <!-- 报表管理 - Admin or Financial -->
          <el-submenu
            index="reports"
            v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'"
          >
            <template slot="title">
              <i class="el-icon-s-data"></i><span>报表管理</span>
            </template>
            <el-menu-item index="/report-template" v-if="user.role === 'ADMIN'">报表模板</el-menu-item>
            <el-menu-item index="/generated-report"
              >生成与查看报表</el-menu-item
            >
          </el-submenu>

          <!-- 业务管理 - MODIFIED SECTION -->
          <el-submenu
            index="matters"
            v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL' || user.role === 'USER'"
          >
            <template slot="title">
              <i class="el-icon-s-operation"></i><span>业务管理</span>
            </template>
            <!-- 薪资信息: Admin, Financial, User -->
            <el-menu-item index="/salary">薪资信息</el-menu-item>

            <!-- 财务支出: Admin, Financial -->
            <el-menu-item index="/financial" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'">财务支出</el-menu-item>
            
            <!-- 请假申请: Financial, User -->
            <el-menu-item index="/askRecord" v-if="user.role === 'FINANCIAL' || user.role === 'USER'">请假申请</el-menu-item>

            <!-- 请假审批: Admin, Financial, User (if 主管) -->
            <el-menu-item index="/askApply" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL' || (user.role === 'USER' && user.level === '主管')">请假审批</el-menu-item>
            
            <!-- 合同管理: Admin, Financial, User -->
            <el-menu-item index="/contractManagement">合同管理</el-menu-item>
            
            <!-- 报销申请: Financial, User -->
            <el-menu-item index="/reimbursementApplication" v-if="user.role === 'FINANCIAL' || user.role === 'USER'">报销申请</el-menu-item>

            <!-- 报销审批: Admin, Financial (NEW) -->
            <el-menu-item index="/reimbursementApproval" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'">报销审批</el-menu-item>
            
            <!-- 资产使用申请: Financial, User -->
            <el-menu-item index="/AssetApplication" v-if="user.role === 'FINANCIAL' || user.role === 'USER'">资产使用申请</el-menu-item>

            <!-- 资产使用审批: Admin, Financial (NEW) -->
            <el-menu-item index="/AssetApproval" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'">资产使用审批</el-menu-item>

          </el-submenu>
          <!-- END OF MODIFIED 业务管理 SECTION -->

          <!-- 用户管理 - Admin only -->
          <el-submenu index="user" v-if="user.role === 'ADMIN'">
            <template slot="title">
              <i class="el-icon-s-custom"></i><span>用户管理</span>
            </template>
            <el-menu-item index="/admin">管理员信息</el-menu-item>
            <el-menu-item index="/user">员工信息</el-menu-item>
          </el-submenu>
        </el-menu>
      </div>

      <!--  数据表格 / Content Area -->
      <div class="manager-main-right">
        <router-view @update:user="updateUser" />
      </div>
    </div>
  </div>
</template>

<script>
// Import the default avatar image
import defaultAvatar from "@/assets/imgs/defaultAvatar.png";
import "@/assets/css/manager.css";

export default {
  name: "Manager",
  data() {
    return {
      user: JSON.parse(localStorage.getItem("xm-user") || "{}"),
      isDarkMode: localStorage.getItem("darkMode") === "true" || false,
      defaultAvatarUrl: defaultAvatar,
      openSubmenuIndexes: [],
    };
  },
  watch: {
    isDarkMode(newValue) {
      localStorage.setItem("darkMode", newValue);
      document.body.classList.toggle("dark-theme-global", newValue);
      this.$nextTick(() => {
        this.refreshMenuState();
      });
    },
    '$route'() { // Watch for route changes to potentially update open menus
      this.ensureCurrentMenuOpen();
    }
  },
  created() {
    const savedOpenSubmenus = localStorage.getItem("openSubmenuIndexes");
    if (savedOpenSubmenus) {
      this.openSubmenuIndexes = JSON.parse(savedOpenSubmenus);
    } else {
      this.ensureCurrentMenuOpen(); // Ensure current menu is open if nothing is saved
    }

    if (!this.user || !this.user.id) {
      this.$router.push("/login");
      return;
    }
    if (this.isDarkMode) {
      document.body.classList.add("dark-theme-global");
    }
  },
  mounted() {
    this.$nextTick(() => {
        this.refreshMenuState();
    });
  },
  beforeDestroy() {
    document.body.classList.remove("dark-theme-global");
  },
  methods: {
    updateUser() {
      this.user = JSON.parse(localStorage.getItem("xm-user") || "{}");
      this.$nextTick(() => {
          this.refreshMenuState(); // Re-evaluate menu visibility after user update
      });
    },
    goToPerson() {
      if (this.user) {
        if (this.user.role === "ADMIN") {
          this.$router.push("/adminPerson");
        } else if (this.user.role === "USER" || this.user.role === "FINANCIAL") {
          this.$router.push("/employeePerson");
        } else {
          console.warn("Cannot determine user role for personal page navigation.");
        }
      }
    },
    logout() {
      localStorage.removeItem("xm-user");
      localStorage.removeItem("openSubmenuIndexes"); // Clear saved open menus on logout
      this.$router.push("/login");
    },
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    },
    handleAvatarError(event) {
      console.warn(
        `Avatar failed to load: ${event.target.src}. Using default.`
      );
      event.target.onerror = null; // Prevent infinite loop if default also fails
      event.target.src = this.defaultAvatarUrl;
    },
    persistOpenSubmenus() {
      localStorage.setItem(
        "openSubmenuIndexes",
        JSON.stringify(this.openSubmenuIndexes)
      );
    },
    handleMenuOpen(index) {
      if (!this.openSubmenuIndexes.includes(index)) {
        this.openSubmenuIndexes.push(index);
        this.persistOpenSubmenus();
      }
    },
    handleMenuClose(index) {
      const idx = this.openSubmenuIndexes.indexOf(index);
      if (idx > -1) {
        this.openSubmenuIndexes.splice(idx, 1);
        this.persistOpenSubmenus();
      }
    },
    ensureCurrentMenuOpen() {
      const currentPath = this.$route.path;
      let parentSubmenuIndex = null;

      // Updated menuStructure to include new routes
      const menuStructure = {
        info: ["/notice", "/department"],
        finance: ["/voucherEntry", "/voucherView", "/voucherReview", "/ledgerManagement"],
        reports: ["/report-template", "/generated-report"],
        matters: [
            "/salary", "/financial", "/askRecord", "/askApply",
            "/contractManagement", "/reimbursementApplication", "/reimbursementApproval",
            "/AssetApplication", "/assetUsageApproval"
        ],
        user: ["/admin", "/user"],
      };

      for (const submenuKey in menuStructure) {
        if (menuStructure[submenuKey].some(itemPath => currentPath.startsWith(itemPath))) {
          parentSubmenuIndex = submenuKey;
          break;
        }
      }

      if (parentSubmenuIndex && !this.openSubmenuIndexes.includes(parentSubmenuIndex)) {
        // Check if the submenu is actually rendered based on v-if conditions
        const submenuIsVisible = this.isSubmenuVisible(parentSubmenuIndex);

        if (submenuIsVisible) {
            this.openSubmenuIndexes.push(parentSubmenuIndex);
            this.persistOpenSubmenus();
            // Force Element UI to open it if it's not already
            this.$nextTick(() => {
                if (this.$refs.mainMenu && typeof this.$refs.mainMenu.open === 'function') {
                     this.$refs.mainMenu.open(parentSubmenuIndex);
                }
            });
        }
      }
    },
    isSubmenuVisible(index) {
        // Helper to check if a submenu should be visible based on its v-if condition
        // This is a simplified check; for complex conditions, you might need more robust logic
        if (index === 'info') return this.user.role === 'ADMIN';
        if (index === 'finance') return this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL';
        if (index === 'reports') return this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL';
        if (index === 'matters') return this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL' || this.user.role === 'USER';
        if (index === 'user') return this.user.role === 'ADMIN';
        return true; // Default for items without explicit v-if on submenu itself (like home)
    },
    refreshMenuState() {
        // This method tries to ensure the menu's visual state matches `openSubmenuIndexes`
        // especially after dynamic changes like dark mode toggle or user role update.
        if (this.$refs.mainMenu && this.$refs.mainMenu.submenus) {
            const allPossibleSubmenuIndices = Object.keys(this.$refs.mainMenu.submenus);

            allPossibleSubmenuIndices.forEach((index) => {
                const submenuComponent = this.$refs.mainMenu.submenus[index];
                if (submenuComponent) {
                    // Check if the submenu's root element is in the DOM
                    // This means its v-if condition was true
                    if (submenuComponent.$el && document.body.contains(submenuComponent.$el)) {
                        if (this.openSubmenuIndexes.includes(index)) {
                            if (typeof this.$refs.mainMenu.open === 'function') this.$refs.mainMenu.open(index);
                        } else {
                            if (typeof this.$refs.mainMenu.close === 'function') this.$refs.mainMenu.close(index);
                        }
                    }
                }
            });
            // After potentially closing/opening, ensure the current one is open if it should be
            this.ensureCurrentMenuOpen();
        }
    }
  },
};
</script>

<style scoped>
.header-logo {
  vertical-align: middle;
}
/* Add any other specific styles if needed */
</style>
