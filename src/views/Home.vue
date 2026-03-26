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
import { ref, onMounted,provide } from 'vue'
import { useRouter } from 'vue-router'
import { getPoints } from '@/api/user'
import { searchNovel as searchNovelApi, getRank, analyzeWork } from '@/api/assist'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'

import ScriptWorkspace from './components/ScriptWorkspace.vue'
import ParseWorkspace from './components/ParseWorkspace.vue'
import CharacterWorkspace from './components/CharacterWorkspace.vue'
import StoryboardWorkspace from './components/StoryboardWorkspace.vue'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user') || '{}')
const username = ref(user.username || '')
const points = ref(0)

// 全局状态
const characters = ref([])                // [{ name, description, characterPrompt }]
const storyboards = ref([])               // 分镜列表，由拆解剧本填充
const characterImages = ref({})           // { 角色名: 图片URL }

// 获取积分
const fetchPoints = async () => {
  if (!user.id) return
  try {
    const res = await getPoints(user.id)
    if (res.data.code === 200) {
      points.value = res.data.data
    } else {
      console.error('获取积分失败', res.data.msg)
    }
  } catch (err) {
    console.error('获取积分网络错误', err)
  }
}

const refreshPoints = () => {
  fetchPoints()
}
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