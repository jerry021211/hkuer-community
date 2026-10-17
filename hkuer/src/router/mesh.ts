import type { RouteRecordRaw } from 'vue-router'
const publicMeta = { requiresAuth: false, mesh: true }
const feed = () => import('@/mesh/pages/FeedPage.vue')
export const meshRoutes: RouteRecordRaw = {
    path: '/',
    component: () => import('@/mesh/MeshLayout.vue'),
    meta: publicMeta,
    children: [
        { path: '', redirect: '/home' },
        { path: 'home', component: feed, meta: { ...publicMeta, section: 'qa', kind: 'qa' } },
        { path: 'login', name: 'login', component: feed, meta: { ...publicMeta, section: 'qa', kind: 'qa' } },
        { path: 'register', name: 'register', component: feed, meta: { ...publicMeta, section: 'qa', kind: 'qa' } },
        { path: 'forgot-password', component: () => import('@/mesh/pages/ForgotPasswordPage.vue'), meta: publicMeta },
        { path: 'jobs', component: feed, meta: { ...publicMeta, section: 'job', kind: 'job' } },
        { path: 'life', component: feed, meta: { ...publicMeta, section: 'life', kind: 'life' } },
        { path: 'jobs/:id', component: () => import('@/mesh/pages/DiscoveryPage.vue'), meta: {...publicMeta,section:'job'} },
        { path: 'life/:id', component: () => import('@/mesh/pages/DiscoveryPage.vue'), meta: {...publicMeta,section:'life'} },
        { path: 'rental/:id', component: () => import('@/mesh/pages/RentalDetailPage.vue'), meta: {...publicMeta,section:'rental'} },
        { path: 'roommates/:id', component: () => import('@/mesh/pages/RentalDetailPage.vue'), meta: {...publicMeta,section:'rental'} },
        { path: 'marketplace/:id', component: () => import('@/mesh/pages/MarketDetailPage.vue'), meta: {...publicMeta,section:'market'} },
        {
            path: 'courses',
            component: () => import('@/mesh/pages/CoursesPage.vue'),
            meta: { ...publicMeta, section: 'course' }
        },
        {
            path: 'courses/pk',
            component: () => import('@/mesh/pages/CoursePkPage.vue'),
            meta: { ...publicMeta, section: 'course' }
        },
        {
            path: 'courses/:id',
            component: () => import('@/mesh/pages/CourseDetailPage.vue'),
            meta: { ...publicMeta, section: 'course' }
        },
        {
            path: 'marketplace',
            component: () => import('@/mesh/pages/CommercePage.vue'),
            meta: { ...publicMeta, section: 'market' }
        },
        {
            path: 'rental',
            component: () => import('@/mesh/pages/CommercePage.vue'),
            meta: { ...publicMeta, section: 'rental' }
        },
        {
            path: 'create/:kind(market|rental)',
            component: () => import('@/mesh/pages/CommerceCreatePage.vue'),
            meta: { ...publicMeta, section: 'market' }
        },
        { path: 'profile/:section?', component: () => import('@/mesh/pages/ProfilePage.vue'), meta: { ...publicMeta } },
        { path: 'edit/:id', component: () => import('@/mesh/pages/EditContentPage.vue'), meta: { ...publicMeta } },
        { path: 'u/:id', component: () => import('@/mesh/pages/ProfilePage.vue'), meta: { ...publicMeta } },
        { path: 'chat/:id?', component: () => import('@/mesh/pages/ChatPage.vue'), meta: { ...publicMeta } },
        {
            path: 'notifications',
            component: () => import('@/mesh/pages/NotificationsPage.vue'),
            meta: { ...publicMeta }
        },
        { path: 'course-pk', redirect: '/courses/pk' },
        {
            path: 'search',
            component: () => import('@/mesh/pages/SearchPage.vue'),
            meta: { ...publicMeta, section: 'qa', kind: 'all' }
        },
        { path: 'tag/:tag', component: feed, meta: { ...publicMeta, section: 'qa', kind: 'qa' } },
        {
            path: 'question/:id',
            component: () => import('@/mesh/pages/QuestionPage.vue'),
            meta: { ...publicMeta, section: 'qa' }
        },
        {
            path: 'create/:kind(qa|job|life)',
            component: () => import('@/mesh/pages/CreatePage.vue'),
            meta: { ...publicMeta, section: 'qa' }
        },
        { path: 'me/notifications', redirect: '/notifications' },
        { path: 'announcements/:id', component: () => import('@/mesh/pages/InfoPage.vue'), meta: publicMeta },
        { path: 'announcements', component: () => import('@/mesh/pages/InfoPage.vue'), meta: publicMeta },
        { path: 'about', component: () => import('@/mesh/pages/InfoPage.vue'), meta: publicMeta },
        { path: 'app-guide', component: () => import('@/mesh/pages/InfoPage.vue'), meta: publicMeta }
    ]
}
