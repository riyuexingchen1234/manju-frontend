import { createRouter, createWebHistory } from "vue-router"
import Login from "@/views/Login.vue"
import Home from '@/views/Home.vue'

const routes = [
    { path: '/', component: Home },           // 根路径直接进入主页
    { path: '/login', component: Login },
    { path: '/home', component: Home }        // 保留 /home 也可以访问
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
    const user = localStorage.getItem('user')
    // 如果用户已登录且试图进入登录页，则重定向到主页
    if (user && to.path === '/login') {
        next('/home')
    } else {
        // 其他所有情况都放行（包括未登录访问 / 或 /home）
        next()
    }
})

export default router