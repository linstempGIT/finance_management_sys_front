import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

// 解决导航栏或者底部导航tabBar中的vue-router在3.0版本以上频繁点击菜单报错的问题。
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push (location) {
  return originalPush.call(this, location).catch(err => err)
}

const routes = [
  {
    path: '/',
    name: 'Manager',
    component: () => import('../views/Manager.vue'),
    redirect: '/home',  // 重定向到主页
    children: [
      { path: '403', name: 'NoAuth', meta: { name: '无权限' }, component: () => import('../views/manager/403') },
      { path: 'home', name: 'Home', meta: { name: '系统首页' }, component: () => import('../views/manager/Home') },
      { path: 'admin', name: 'Admin', meta: { name: '管理员信息' }, component: () => import('../views/manager/Admin') },
      { path: 'user', name: 'User', meta: { name: '用户信息' }, component: () => import('../views/manager/Employee') },
      { path: 'adminPerson', name: 'AdminPerson', meta: { name: '个人信息' }, component: () => import('../views/manager/AdminPerson') },
      { path: 'employeePerson', name: 'EmployeePerson', meta: { name: '个人信息' }, component: () => import('../views/manager/EmployeePerson') },
      { path: 'password', name: 'Password', meta: { name: '修改密码' }, component: () => import('../views/manager/Password') },
      { path: 'notice', name: 'Notice', meta: { name: '公告信息' }, component: () => import('../views/manager/Notice') },
      { path: 'department', name: 'Department', meta: { name: '部门信息' }, component: () => import('../views/manager/Department') },
      { path: 'salary', name: 'Salary', meta: { name: '薪资信息' }, component: () => import('../views/manager/Salary') },
      { path: 'financial', name: 'Financial', meta: { name: '财务支出' }, component: () => import('../views/manager/Financial') },
      { path: 'askRecord', name: 'AskRecord', meta: { name: '请假记录' }, component: () => import('../views/manager/AskRecord') },
      { path: 'askApply', name: 'AskApply', meta: { name: '请假审批' }, component: () => import('../views/manager/AskApply') },
      { path: 'resources', name: 'Resources', meta: { name: '资产信息' }, component: () => import('../views/manager/Resources') },
      { path: 'resourcesApply', name: 'ResourcesApply', meta: { name: '资产审批' }, component: () => import('../views/manager/ResourcesApply') },
      { path: 'resourcesMy', name: 'ResourcesMy', meta: { name: '员工资产' }, component: () => import('../views/manager/ResourcesMy') },
      { 
        path: 'voucherEntry', 
        name: 'VoucherEntry', 
        meta: { name: '凭证填开' }, 
        component: () => import('../views/manager/VoucherEntry.vue') 
      },{ // New Route for Viewing Vouchers
        path: 'voucherView',
        name: 'VoucherView',
        meta: { name: '凭证查看' },
        component: () => import('../views/manager/VoucherView.vue')
      },
      {
        path: 'voucherReview',
        name: 'VoucherReview',
        meta: { title: '凭证审核' },
        component: () => import('../views/manager/VoucherReview.vue')
      },
      {
        path: 'ledgerManagement',
        name: 'LedgerManagement',
        meta: { title: '账簿管理' },
        component: () => import('../views/manager/LedgerManagement.vue')
      },
      {
        path: 'contractManagement',
        name: 'ContractManagement',
        meta: { name: '合同管理' },
        component: () => import('../views/manager/ContractManagement.vue')
      },
      {
        path: 'reimbursementApplication',
        name: 'ReimbursementApplication',
        meta: { name: '报销申请' },
        component: () => import('../views/manager/ReimbursementApplication.vue')
      },
      {
        path: 'reimbursementApproval',
        name: 'ReimbursementApproval',
        meta: { name: '报销审批' },
        component: () => import('../views/manager/ReimbursementApproval.vue')
      },
      {
        path: 'assetApplication',
        name: 'AssetApplication',
        meta: { name: '资产使用申请' },
        component: () => import('../views/manager/AssetApplication.vue')
      },
      {
        path: 'assetApproval',
        name: 'AssetApproval',
        meta: { name: '资产使用申请审批' },
        component: () => import('../views/manager/AssetApproval.vue')
      },
      {
        path: 'report-template', // Changed from reportTemplate for consistency
        name: 'ReportTemplate',
        meta: { name: '报表模板管理' }, // Corrected meta name
        component: () => import('../views/manager/report/ReportTemplate.vue')
      },
      {
        path: 'generated-report', // Changed from generatedReport for consistency
        name: 'GeneratedReport',
        meta: { name: '报表生成与查看' }, // Corrected meta name
        component: () => import('../views/manager/report/GeneratedReport.vue')
      },
    ]
  },
  {
    path: '/front',
    name: 'Front',
    component: () => import('../views/Front.vue'),
    children: [
      { path: 'home', name: 'Home', meta: { name: '系统首页' }, component: () => import('../views/front/Home') },
      { path: 'person', name: 'Person', meta: { name: '个人信息' }, component: () => import('../views/front/Person') },
    ]
  },
  { path: '/login', name: 'Login', meta: { name: '登录' }, component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', meta: { name: '注册' }, component: () => import('../views/Register.vue') },
  { path: '*', name: 'NotFound', meta: { name: '无法访问' }, component: () => import('../views/404.vue') },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// 注：不需要前台的项目，可以注释掉该路由守卫
// 路由守卫
// router.beforeEach((to ,from, next) => {
//   let user = JSON.parse(localStorage.getItem("xm-user") || '{}');
//   if (to.path === '/') {
//     if (user.role) {
//       if (user.role === 'USER') {
//         next('/front/home')
//       } else {
//         next('/home')
//       }
//     } else {
//       next('/login')
//     }
//   } else {
//     next()
//   }
// })

export default router
