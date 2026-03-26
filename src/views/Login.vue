<template>
    <div class="login-container">
        <el-card class="login-card">
            <template #header>
                <h2>漫剧创作平台</h2>
            </template>
            <el-form :model="form" label-width="80px">
                <el-form-item label="用户名">
                    <el-input v-model="form.username" placeholder="请输入用户名"/>
                </el-form-item>
                <el-form-item label="密码">
                    <el-input v-model="form.password" type ="password" @keyup.enter="handleLogin" placeholder="请输入密码" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleLogin" @keyup.enter="handleLogin">登陆</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { login } from '@/api/user';  // 使用 @ 代表 src 目录
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router'


const router = useRouter()
const form = ref({
    username: '',
    password: ''
})
const handleLogin = async () =>{
    if(!form.value.username || !form.value.password){
        ElMessage.warning('请输入用户名和密码')
        return
    }
    try {
        const res = await login(form.value.username, form.value.password)
        if (res.data.code === 200){
            ElMessage.success('登陆成功')
            // 保存用户信息到 localStorage（简单处理）
            localStorage.setItem('user',JSON.stringify(res.data.data))
            router.push('/home')    // 跳转到主页
        }else{
            ElMessage.error(res.data.msg)
        }
    }catch(err){
        ElMessage.error('网络错误，请稍后重试')
        console.error(err)
    }
}
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f5f5f5;
}
.login-card{
    width: 400px;
}
</style>