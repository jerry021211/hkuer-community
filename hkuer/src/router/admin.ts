const adminRoutes = {
  path: '/admin',
  component: () => import('@/views/admin/AdminLayout.vue'),
  meta: { requiresAuth: true, requiresAdmin: true },
  children: [
    {path:'content',name:'admin-content',component:()=>import('@/views/admin/components/MeshContentManagement.vue')},
    {
      path: '',
      name: 'admin',
      component: () => import('@/views/admin/components/Dashboard.vue'),
    },
    {
      path: 'ban',
      name: 'admin-ban',
      component: () => import('@/views/admin/components/BanManagement.vue'),
    },
    {
      path: 'usertype',
      name: 'admin-usertype',
      component: () => import('@/views/admin/components/UserTypeManagement.vue'),
    },
    {
      path: 'reports',
      name: 'admin-reports',
      component: () => import('@/views/admin/components/ReportManagement.vue'),
    },
    {
      path: 'appeals',
      name: 'admin-appeals',
      component: () => import('@/views/admin/components/AppealManagement.vue'),
    },
  ],
}

export default adminRoutes
