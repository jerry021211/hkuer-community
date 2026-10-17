const userHomeRoutes = {
    path: "/user",
    component: () => import("@/views/user/index.vue"),
    children: [
        {
            path: "home",
            component: () => import("@/views/user/components/Home.vue"),
        },
        {
            path: "schoollife/:page?",
            component: () => import("@/views/user/components/schoolLife.vue"),
        },
        {
            path: "learningexchange/:page?",
            component: () => import("@/views/user/components/learningExchange.vue"),
        },
        {
            path: "employment/:page?",
            component: () => import("@/views/user/components/Employment.vue"),
        },
        {
            path: "intership/:page?",
            component: () => import("@/views/user/components/Intership.vue"),
        },
        {
            path: "treehole/:page?",
            component: () => import("@/views/user/components/treeHole.vue"),
        },
        {
            path: "rating/:page?",
            component: () => import("@/views/user/components/Rating.vue"),
        },
        {
            path: "teacher/:id",
            component: () => import("@/views/user/components/TeacherDetail.vue"),
        },
        {
            path: "post",
            component: () => import("@/views/user/components/Post.vue"),
        },
        {
            path: "post/:id",
            component: () => import("@/views/user/components/PostDetail.vue"),
        },
        {
            path: "comment",
            component: () => import("@/views/user/components/Comment.vue"),
        },
        {
            path: "like/:page?",
            component: () => import("@/views/user/components/Like.vue"),
        },
        {
            path: "favorite/:page?",
            component: () => import("@/views/user/components/Favorite.vue"),
        },
        {
            path: "history/:page?",
            component: () => import("@/views/user/components/History.vue"),
        },
        {
            path: "pay-success",
            component: () => import("@/views/user/components/PaySuccess.vue"),
        },
    ]
}

export default userHomeRoutes