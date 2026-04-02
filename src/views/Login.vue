<template>
    <!-- 登录页面整体容器 -->
    <div class="login-container">
        <!-- Element Plus 卡片组件，用于包裹登录表单 -->
        <el-card class="login-card">
            <!-- 卡片头部：标题 -->
            <template #header>
                <h2>漫剧创作平台</h2>
            </template>

            <!-- 登录表单
                 :model="form" 绑定表单数据对象
                 label-width="80px" 设置表单标签宽度
            -->
            <el-form :model="form" label-width="80px">
                
                <!-- 用户名输入项 -->
                <el-form-item label="用户名">
                    <!-- v-model 双向绑定输入框内容到 form.username -->
                    <el-input v-model="form.username" placeholder="请输入用户名"/>
                </el-form-item>

                <!-- 密码输入项 -->
                <el-form-item label="密码">
                    <!-- type="password" 密码隐藏
                         v-model 绑定密码
                         @keyup.enter 按回车触发登录
                    -->
                    <el-input 
                        v-model="form.password" 
                        type="password" 
                        @keyup.enter="handleLogin" 
                        placeholder="请输入密码" 
                    />
                </el-form-item>

                <!-- 登录按钮 -->
                <el-form-item>
                    <!-- type="primary" 主按钮样式
                         @click 点击触发登录
                    -->
                    <el-button 
                        type="primary" 
                        @click="handleLogin"
                    >登陆</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
// 导入 Vue3 响应式函数 ref
import { ref } from 'vue';

// 导入后端登录接口 API
import { login } from '@/api/user';  

// 导入 Element Plus 消息提示
import { ElMessage } from 'element-plus';

// 导入路由跳转工具
import { useRouter } from 'vue-router'

// 获取路由实例，用于页面跳转
const router = useRouter()

// 定义表单响应式对象，存储用户名和密码
const form = ref({
    username: '',
    password: ''
})

/**
 * 登录处理函数
 * 1. 校验输入是否为空
 * 2. 调用登录接口
 * 3. 登录成功保存用户信息、跳转到主页
 * 4. 登录失败提示错误
 */
const handleLogin = async () =>{
    // 前端校验：用户名和密码不能为空
    if(!form.value.username || !form.value.password){
        ElMessage.warning('请输入用户名和密码')
        return
    }

    try {
        // 调用后端登录接口，传入用户名、密码
        const res = await login(form.value.username, form.value.password)
        
        // 判断后端返回状态码：200 表示登录成功
        if (res.data.code === 200){
            ElMessage.success('登陆成功')
            
            // 将用户信息保存到 localStorage，用于前端判断登录状态
            localStorage.setItem('user',JSON.stringify(res.data.data))
            
            // 登录成功，跳转到主页
            router.push('/home')    
        }else{
            // 登录失败：用户名或密码错误
            ElMessage.error(res.data.msg)
        }
    }catch(err){
        // 网络异常或请求失败
        ElMessage.error('网络错误，请稍后重试')
        console.error(err)
    }
}
</script>

<!-- scoped 表示样式只作用于当前组件 -->
<style scoped>
/* 登录页面容器：垂直水平居中 */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;       /* 占满整个屏幕高度 */
    background-color: #f5f5f5;
}

/* 登录卡片宽度 */
.login-card{
    width: 400px;
}
</style>