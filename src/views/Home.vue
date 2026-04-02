<template>
  <div class="home">
    <!-- 顶部导航栏（冻结） -->
    <el-menu mode="horizontal" :ellipsis="false" class="navbar">
      <div class="navbar-left">
        <el-menu-item index="script" @click="scrollTo('script')">剧本生成</el-menu-item>
        <el-menu-item index="parse" @click="scrollTo('parse')">拆解剧本</el-menu-item>
        <el-menu-item index="character" @click="scrollTo('character')">角色生成</el-menu-item>
        <el-menu-item index="storyboard" @click="scrollTo('storyboard')">分镜生成</el-menu-item>
      </div>
      <div class="navbar-right">
        <template v-if="user.id">
          <span class="username">{{ username }}</span>
          <el-tag type="success" class="points">积分：{{ points }}</el-tag>
          <el-button type="text" @click="logout">退出</el-button>
        </template>
        <template v-else>
          <el-button type="text" @click="router.push('/login')">登录</el-button>
        </template>
        <el-button type="info" @click="openInspire" style="margin-left: 10px;">灵感助手</el-button>
      </div>
    </el-menu>

    <!-- 内容区域 -->
    <div class="content">
      <section id="script">
        <h2>剧本生成</h2>
        <ScriptWorkspace />
      </section>

      <section id="parse" class="section-spacing">
        <h2>拆解剧本</h2>
        <ParseWorkspace @parsed="handleParsed" />
      </section>

      <section id="character" class="section-spacing">
        <h2>角色生成</h2>
        <CharacterWorkspace
          :characters="characters"
          :characterImages="characterImages"
          @character-generated="handleCharacterGenerated"
        />
      </section>

      <section id="storyboard" class="section-spacing">
        <h2>分镜生成</h2>
        <StoryboardWorkspace
          :storyboards="storyboards"
          :characterImages="characterImages"
        />
      </section>
    </div>

    <!-- 灵感助手对话框 -->
  <el-dialog v-model="inspireVisible" title="灵感助手" width="600px">
    <el-tabs>
      <el-tab-pane label="漫剧榜单">
        <el-table :data="rankList" style="width: 100%">
          <el-table-column prop="title" label="作品名" />
          <el-table-column prop="hotValue" label="热度值" />
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="小说IP搜索">
        <el-input v-model="searchKeyword" placeholder="输入关键词" />
        <el-button @click="searchNovel">搜索</el-button>
        <el-table :data="novelList" style="margin-top: 10px">
          <el-table-column prop="title" label="书名" />
          <el-table-column prop="author" label="作者" />
          <el-table-column prop="intro" label="简介" />
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="对标拆解">
        <el-input v-model="analyzeWorkName" placeholder="输入作品名" />
        <el-button @click="analyze">分析</el-button>
        <div v-if="analysisResult" class="analysis-result">
          <pre>{{ JSON.stringify(analysisResult, null, 2) }}</pre>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted,provide } from 'vue' // 导入 Vue3 组合式API ref: 定义响应式变量 provide: 向子组件提供方法（依赖注入）
import { useRouter } from 'vue-router'
import { getPoints } from '@/api/user'  // 导入获取用户积分的后端接口
import { searchNovel as searchNovelApi, getRank, analyzeWork } from '@/api/assist'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'

import ScriptWorkspace from './components/ScriptWorkspace.vue'
import ParseWorkspace from './components/ParseWorkspace.vue'
import CharacterWorkspace from './components/CharacterWorkspace.vue'
import StoryboardWorkspace from './components/StoryboardWorkspace.vue'

const router = useRouter()
// 从 localStorage 中读取登录后的用户信息
// 如果没有用户信息（未登录），则默认赋值为空对象 {}，避免报错
const user = JSON.parse(localStorage.getItem('user') || '{}')
const username = ref(user.username || '')
const points = ref(0)   // 定义响应式变量：存储用户当前积分

// 全局状态
const characters = ref([])                // [{ name, description, characterPrompt }]
const storyboards = ref([])               // 分镜列表，由拆解剧本填充
const characterImages = ref({})           // { 角色名: 图片URL }

/**
 * 获取用户积分方法
 * 作用：从后端查询当前用户的最新积分，并更新到页面显示
 */
const fetchPoints = async () => {
  // 如果用户未登录（没有用户ID），则不执行请求
  if (!user.id) return
  try {
    // 调用后端接口：根据用户ID获取积分
    const res = await getPoints(user.id)
    if (res.data.code === 200) {
      points.value = res.data.data  // 将后端返回的最新积分赋值给响应式变量
    } else {
      console.error('获取积分失败', res.data.msg) // 获取积分失败，打印错误信息
    }
  } catch (err) {
    console.error('获取积分网络错误', err)  // 网络异常或请求错误
  }
}
/**
 * 刷新积分方法（供外部调用）
 * 作用：子组件（如生成剧本、生成视频）消耗积分后，调用此方法刷新主页积分显示
 */
const refreshPoints = () => {
  fetchPoints()
}
/**
 * 依赖注入：将 refreshPoints 方法提供给所有子组件使用
 * 子组件通过 inject('refreshPoints') 即可调用刷新积分
 * 作用：实现跨组件刷新积分，不用一层层传递函数
 */
provide('refreshPoints', refreshPoints)

// 退出登录
const logout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}

// 滚动到指定区域
const scrollTo = (id) => {
  const element = document.getElementById(id)
  if (element) element.scrollIntoView({ behavior: 'smooth' })
}

// 处理拆解结果
const handleParsed = (data) => {
  characters.value = data.characters || []
  storyboards.value = data.storyboards || []
  // 清空之前生成的图片，避免旧数据干扰
  characterImages.value = {}
  ElMessage.success('拆解成功，可继续生成角色和分镜')
}

// 处理角色生成
const handleCharacterGenerated = ({ name, imageUrl }) => {
  characterImages.value[name] = imageUrl
}

// 页面加载时获取积分
onMounted(() => {
  fetchPoints()
})

const isLoggedIn = computed(()=>{
  const u = localStorage.getItem('user')
  return u && JSON.parse(u).id
})

// 灵感助手
const inspireVisible = ref(false)
const rankList = ref([])
const searchKeyword = ref('')
const novelList = ref([])
const analyzeWorkName = ref('')
const analysisResult = ref(null)

const openInspire = async () => {
  inspireVisible.value = true
  // 自动加载榜单
  const res = await getRank()
  if (res.data.code === 200) {
    rankList.value = res.data.data
  }
}

const searchNovel = async () => {
  if (!searchKeyword.value) return
  const res = await searchNovelApi(searchKeyword.value)
  if (res.data.code === 200) {
    novelList.value = res.data.data
  }
}

const analyze = async () => {
  if (!analyzeWorkName.value) return
  const res = await analyzeWork(analyzeWorkName.value)
  if (res.data.code === 200) {
    analysisResult.value = res.data.data
  }
}
</script>

<style scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}
.navbar {
  position: sticky;
  justify-content: space-between;
  top: 0;
  z-index: 100;
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
}
.navbar-left {
  display: flex;
}
.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-right: 20px;
}
.username {
  font-weight: 500;
}
.points {
  margin: 0;
}
.content {
  padding: 20px 0 40px;
}
.section-spacing {
  margin-top: 40px;
}
section {
  scroll-margin-top: 80px; /* 避免导航栏遮挡内容 */
}
</style>