<template>
  <div class="app-root">
    <!-- ===== 顶部毛玻璃导航栏 ===== -->
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-left">
          <div class="logo-box">
            <div class="logo-icon">
              <i class="fa fa-magic"></i>
            </div>
            <span class="logo-text"><span class="logo-accent">漫剧创作平台</span></span>
          </div>
          <div class="nav-links">
            <button
              v-for="item in navItems"
              :key="item.id"
              class="nav-btn"
              :class="{
                'nav-hover-script': item.id === 'script',
                'nav-hover-parse': item.id === 'parse',
                'nav-hover-character': item.id === 'character',
                'nav-hover-storyboard': item.id === 'storyboard',
                'nav-active': activeNav === item.id
              }"
              @click="scrollTo(item.id)"
            >{{ item.label }}</button>
          </div>
        </div>
        <div class="navbar-right">
          <button class="btn-inspire" @click="openInspire" :loading="inspireLoading">
            <i class="fa fa-lightbulb-o"></i> 灵感助手
          </button>
          <template v-if="user.id">
            <div class="user-menu" @mouseenter="showUserCard = true" @mouseleave="showUserCard = false">
            <!-- 用户图标（首字母） -->
             <div class="user-avatar">{{ username.charAt(0) }}</div>
             <!-- 悬停卡片 -->
              <div v-show="showUserCard" class="user-card">
                <div class="user-card-header">
                  <span class="user-card-name">{{ username }}</span>
                  <button class="user-card-logout" @click="logout">退出</button>
                </div>
                <div class="user-card-points">
                  <i class="fa fa-diamond"></i> 积分: {{ points }}
                </div>
                <div class="user-card-divider"></div>
                <div class="user-card-history-title">最近使用</div>
                <div v-if="recentHistory.length === 0" class="user-card-empty">暂无记录</div>
                <div v-else class="user-card-history-list">
                  <div
                    v-for="item in recentHistory"
                    :key="item.id"
                    class="user-card-history-item"
                    :class="{ 'history-failed': item.status === 'failed','history-pending' : item.status === 'pending' }"
                  >
                    <span class="history-tool">{{ formatToolName(item.toolType) }}</span>
                    <span class="history-preview">{{ item.inputPreview }}</span>
                    <span class="history-status">{{ item.status === 'pending' ? '生成中' : '' }}</span>
                    <span class="history-time">{{ formatTime(item.createdAt) }}</span>
                  </div>
                </div>
                <div class="user-card-divider"></div>
                <button class="user-card-view-all" @click="openHistoryDialog">
                  查看全部历史记录 <i class="fa fa-angle-right"></i>
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <el-button type="text" class="login-btn" @click="router.push('/register')">注册</el-button>
            <el-button type="text" class="login-btn" @click="router.push('/login')">登录</el-button>
          </template>
        </div>
      </div>
    </nav>

    <!-- ===== Hero 头部 ===== -->
    <section class="hero-section">
      <div class="hero-container">
        <h1 class="hero-title">
          <span class="gradient-text gradient-hero">漫剧创作平台</span>
        </h1>
        <p class="hero-subtitle">
          一键生成短剧剧本、角色形象、分镜脚本，让你的创作效率提升100倍！
        </p>
        <!-- 未登录引导 -->
        <div v-if="!user.id" class="login-tip">
          <i class="fa fa-info-circle"></i> 登录后可连续使用全部创作功能
        </div>
        <div class="hero-actions">
          <button v-if="user.id" class="btn-start" @click="scrollTo('script')">
            开始创作 <i class="fa fa-arrow-right"></i>
          </button>
          <button v-else class="btn-start" @click="router.push('/login')">
            立即登录 
          </button>
          <button class="btn-tutorial">查看教程</button>
        </div>
      </div>
    </section>

    <!-- ===== 工作区区域（直接接在Hero下面，去掉了中间的功能卡片） ===== -->
    <section class="workspace-section">
      <div class="section-container">
        <!-- 1. 剧本生成 - 粉橙主题色 -->
        <section id="script" class="workspace-card workspace-script" style="scroll-margin-top: 80px;">
          <div class="workspace-header">
            <div class="ws-icon ws-icon-script">
              <i class="fa fa-file-text-o"></i>
            </div>
            <h2 class="ws-title gradient-text gradient-script">剧本生成</h2>
            <span class="ws-desc">输入关键词，AI自动生成完整的短剧剧本</span>
            <span class="ws-note">⚠️ 内容不会自动保存，请及时下载</span>
          </div>
          <div class="workspace-body">
            <ScriptWorkspace />
          </div>
        </section>

        <!-- 2. 拆解剧本 - 蓝青主题色 -->
        <section id="parse" class="workspace-card workspace-parse" style="scroll-margin-top: 80px;">
          <div class="workspace-header">
            <div class="ws-icon ws-icon-parse">
              <i class="fa fa-puzzle-piece"></i>
            </div>
            <h2 class="ws-title gradient-text gradient-parse">拆解剧本</h2>
            <span class="ws-desc">粘贴你的剧本，AI自动拆解出角色、场景、分镜</span>
            <span class="ws-note">⚠️ 内容不会自动保存，请及时下载</span>
          </div>
          <div class="workspace-body">
            <ParseWorkspace @parsed="handleParsed" />
          </div>
        </section>

        <!-- 3. 角色生成 - 绿青主题色 -->
        <section id="character" class="workspace-card workspace-character" style="scroll-margin-top: 80px;">
          <div class="workspace-header">
            <div class="ws-icon ws-icon-character">
              <i class="fa fa-user-o"></i>
            </div>
            <h2 class="ws-title gradient-text gradient-character">角色生成</h2>
            <span class="ws-desc">根据角色描述，AI生成统一风格的角色形象图</span>
            <span class="ws-note">⚠️ 内容不会自动保存，请及时下载</span>
          </div>
          <div class="workspace-body">
            <CharacterWorkspace
              :characters="characters"
              :characterImages="characterImages"
              @character-generated="handleCharacterGenerated"
              @update-characters="(newList) => characters = newList"
            />
          </div>
        </section>

        <!-- 4. 分镜生成 - 橙黄主题色 -->
        <section id="storyboard" class="workspace-card workspace-storyboard" style="scroll-margin-top: 80px;">
          <div class="workspace-header">
            <div class="ws-icon ws-icon-storyboard">
              <i class="fa fa-film"></i>
            </div>
            <h2 class="ws-title gradient-text gradient-storyboard">分镜生成</h2>
            <span class="ws-desc">根据剧本和角色，AI自动生成分镜脚本和场景图</span>
            <span class="ws-note">⚠️ 内容不会自动保存，请及时下载</span>
          </div>
          <div class="workspace-body">
            <StoryboardWorkspace
              :storyboards="storyboards"
              :characterImages="characterImages"
              :styleDeclaration="styleDeclaration"
              @update:storyboards="storyboards = $event"
            />
          </div>
        </section>
      </div>
    </section>

    <!-- ===== 底部 ===== -->
    <footer class="app-footer">
      漫剧创作平台 · 让创作更简单
    </footer>

    <!-- ===== 灵感助手对话框 ===== -->
    <el-dialog
      v-model="inspireVisible"
      width="640px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="inspire-dialog"
      :show-close="false"
    >
      <div class="dialog-header">
        <div class="dialog-header-gradient">
          <i class="fa fa-lightbulb-o"></i> 灵感助手
        </div>
        <button class="dialog-close" @click="inspireVisible = false">
          <i class="fa fa-times"></i>
        </button>
      </div>
      <el-tabs v-model="inspireTab" class="inspire-tabs">
        <el-tab-pane label="漫剧榜单" name="rank">
          <el-table :data="rankList" stripe style="width: 100%" v-loading="rankLoading">
            <el-table-column prop="title" label="作品名" />
            <el-table-column prop="hotValue" label="热度值" width="100">
              <template #default="scope">
                <span class="hot-value">{{ scope.row.hotValue }}</span>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无榜单数据"></el-empty>
            </template>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="小说 IP 搜索" name="search">
          <div class="search-line">
            <el-input v-model="searchKeyword" placeholder="输入关键词，如：修仙、穿越" clearable />
            <el-button type="primary" @click="searchNovel" :loading="searchLoading">搜索</el-button>
          </div>
          <el-table v-if="novelList.length" :data="novelList" stripe style="width: 100%; margin-top: 12px;">
            <el-table-column prop="title" label="书名" />
            <el-table-column prop="author" label="作者" width="100" />
            <el-table-column prop="intro" label="简介" />
          </el-table>
          <el-empty v-else description="输入关键词搜索小说IP" style="margin-top: 40px;"></el-empty>
        </el-tab-pane>
        <el-tab-pane label="对标拆解" name="analyze">
          <div class="search-line">
            <el-input v-model="analyzeWorkName" placeholder="输入作品名，如：庆余年" clearable />
            <el-button type="primary" @click="analyze" :loading="analyzeLoading">分析</el-button>
          </div>
          <el-card v-if="analysisResult" shadow="hover" class="analysis-card">
            <div class="analysis-grid">
              <div v-for="(val, key) in analysisResult" :key="key" class="analysis-cell">
                <span class="cell-key">{{ key }}</span>
                <span class="cell-val">{{ val }}</span>
              </div>
            </div>
          </el-card>
          <el-empty v-else description="输入作品名进行对标分析" style="margin-top: 40px;"></el-empty>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- ===== 历史记录弹窗 ===== -->
    <el-dialog
      v-model="historyDialogVisible"
      title="历史记录"
      width="720px"
      :close-on-click-modal="true"
      class="history-dialog"
    >
      <div v-if="historyList.length === 0" class="history-dialog-empty">
        <i class="fa fa-history" style="font-size: 48px; color: #d1d5db;"></i>
        <p style="color: #9ca3af; margin-top: 16px;">暂无历史记录</p>
      </div>
      <div v-else class="history-dialog-list">
        <div
          v-for="item in historyList"
          :key="item.id"
          class="history-dialog-item"
          :class="{ 'history-failed': item.status === 'failed' }"
        >
          <div class="history-dialog-left">
            <span class="history-dialog-tool">{{ formatToolName(item.toolType) }}</span>
            <span class="history-dialog-preview">{{ item.inputPreview }}</span>
          </div>
          <div class="history-dialog-right">
            <span class="history-dialog-status" :class="`status-${item.status}`">
              {{ item.status === 'success' ? '成功' : item.status === 'pending' ? '生成中' : '失败' }}
            </span>
            <span class="history-dialog-time">{{ formatTime(item.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div v-if="historyTotal > historySize" class="history-dialog-pagination">
        <el-pagination
          v-model:current-page="historyPage"
          :page-size="historySize"
          :total="historyTotal"
          layout="prev, pager, next"
          @current-change="fetchHistoryList"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, provide, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
// 引入业务逻辑相关
import { getPoints, logout as logoutApi } from '@/api/user'
import { getRecentHistory,getHistoryList } from '@/api/history'
import { searchNovel as searchNovelApi, getRank, analyzeWork } from '@/api/assist'
import {
  loadCharacters, saveCharacters,
  loadLocalStoryboards, saveLocalStoryboards,
  loadCharacterImages, saveCharacterImages,
  clearAllStorage
} from '@/utils/storage'

// 引入子组件
import ScriptWorkspace from './components/ScriptWorkspace.vue'
import ParseWorkspace from './components/ParseWorkspace.vue'
import CharacterWorkspace from './components/CharacterWorkspace.vue'
import StoryboardWorkspace from './components/StoryboardWorkspace.vue'

const router = useRouter()
// ========== 核心业务逻辑（完全保留） ==========
const user = JSON.parse(localStorage.getItem('user') || '{}')
const username = ref(user.username || '')
const points = ref(0)

// 用户卡片相关
const showUserCard = ref(false)
const recentHistory = ref([])

// 历史记录弹窗相关
const historyDialogVisible = ref(false)
const historyList = ref([])
const historyTotal = ref(0)
const historyPage = ref(1)
const historySize = ref(20)

// 工具名称映射
const toolNameMap = {
  'script_generate': '剧本生成',
  'parse_script': '拆解剧本',
  'character_generate': '角色生成',
  'scene_generate': '场景生成',
  'keyframe_generate': '关键帧生成',
  'video_generate': '视频生成'
}

const formatToolName = (toolType) => toolNameMap[toolType] || toolType

// 相对时间格式化
const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const oneDay = 24 * 60 * 60 * 1000
  
  if (diff < oneDay && date.getDate() === now.getDate()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else if (diff < 2 * oneDay && date.getDate() === now.getDate() - 1) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 获取最近历史记录
const fetchRecentHistory = async () => {
  if (!user.id) return
  try {
    const res = await getRecentHistory(5)
    if (res.data.code === 200) {
      recentHistory.value = res.data.data
    }
  } catch (err) {
    console.error('获取最近历史失败:', err)
  }
}

// 打开历史记录弹窗
const openHistoryDialog = async () => {
  historyDialogVisible.value = true
  await fetchHistoryList()
}

// 获取全部历史记录
const fetchHistoryList = async () => {
  if (!user.id) return
  try {
    const res = await getHistoryList(historyPage.value, historySize.value)
    if (res.data.code === 200) {
      historyList.value = res.data.data.list
      historyTotal.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取历史记录失败:', err)
  }
}

// 初始化数据
const characters = ref(loadCharacters())
const storyboards = ref(loadLocalStoryboards())
const characterImages = ref(loadCharacterImages())
const styleDeclaration = ref('')

// 自动保存
watch(characters, (newVal) => saveCharacters(newVal), { deep: true })
watch(storyboards, (newVal) => saveLocalStoryboards(newVal), { deep: true })
watch(characterImages, (newVal) => saveCharacterImages(newVal), { deep: true })

// 积分相关
const fetchPoints = async () => {
  if (!user.id) return
  try {
    const res = await getPoints(user.id)
    if (res.data.code === 200) {
      points.value = res.data.data
    }
  } catch (err) {
    console.error('获取积分失败:', err)
  }
}

const refreshPoints = () => fetchPoints()
provide('refreshPoints', refreshPoints)

// 回调函数
const handleParsed = (data) => {
  styleDeclaration.value = data.styleDeclaration || ''
  characters.value = data.characters || []
  storyboards.value = data.storyboards || []
  characterImages.value = {}
  ElMessage.success('拆解成功！')
}

const handleCharacterGenerated = ({ name, imageUrl }) => {
  characterImages.value[name] = imageUrl
}

// 退出登录
const logout = async () => {
  try {
    await logoutApi()
  } catch (err) {
    console.error('登出失败:', err)
  } finally {
    localStorage.removeItem('user')
    clearAllStorage()
    router.push('/login')
  }
}

// ========== 导航相关 ==========
const navItems = [
  { id: 'script',    label: '剧本生成' },
  { id: 'parse',     label: '拆解剧本' },
  { id: 'character', label: '角色生成' },
  { id: 'storyboard',label: '分镜生成' },
]
const activeNav = ref('script')

// 平滑滚动
const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

// 滚动监听，自动高亮导航
const handleScroll = () => {
  const scrollTop = window.scrollY
  // 遍历所有工作区，找到当前滚动到的区域
  for (const item of navItems) {
    const el = document.getElementById(item.id)
    if (el) {
      const offsetTop = el.offsetTop
      const offsetHeight = el.offsetHeight
      if (scrollTop >= offsetTop - 100 && scrollTop < offsetTop + offsetHeight - 100) {
        activeNav.value = item.id
        break
      }
    }
  }
}

// ========== 灵感助手优化（加loading/错误处理/空状态） ==========
const inspireVisible = ref(false)
const inspireTab = ref('rank')
const rankList = ref([])
const searchKeyword = ref('')
const novelList = ref([])
const analyzeWorkName = ref('')
const analysisResult = ref(null)

// 加载状态
const inspireLoading = ref(false)
const rankLoading = ref(false)
const searchLoading = ref(false)
const analyzeLoading = ref(false)

const openInspire = async () => {
  if (inspireLoading.value) return
  inspireLoading.value = true
  inspireVisible.value = true
  rankLoading.value = true
  try {
    const res = await getRank()
    if (res.data.code === 200) {
      rankList.value = res.data.data
    } else {
      ElMessage.error('获取榜单失败')
    }
  } catch (err) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('获取榜单失败:', err)
  } finally {
    rankLoading.value = false
    inspireLoading.value = false
  }
}

const searchNovel = async () => {
  if (!searchKeyword.value || searchLoading.value) return
  searchLoading.value = true
  try {
    const res = await searchNovelApi(searchKeyword.value)
    if (res.data.code === 200) {
      novelList.value = res.data.data
      if (novelList.value.length === 0) {
        ElMessage.info('未找到相关小说')
      }
    } else {
      ElMessage.error('搜索失败')
    }
  } catch (err) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('搜索失败:', err)
  } finally {
    searchLoading.value = false
  }
}

const analyze = async () => {
  if (!analyzeWorkName.value || analyzeLoading.value) return
  analyzeLoading.value = true
  try {
    const res = await analyzeWork(analyzeWorkName.value)
    if (res.data.code === 200) {
      analysisResult.value = res.data.data
    } else {
      ElMessage.error('分析失败')
    }
  } catch (err) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('分析失败:', err)
  } finally {
    analyzeLoading.value = false
  }
}

onMounted(() => {
  fetchPoints()
  fetchRecentHistory()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ===== Reset & Base ===== */
.app-root {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf2f8, #f5f3ff, #eff6ff);
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #1f2937;
  scroll-behavior: smooth;
}

.gradient-text {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

/* ===== Navbar ===== */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.navbar-container {
  max-width: 1280px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; padding: 0 24px;
}
.navbar-left { display: flex; align-items: center; gap: 32px; }
.logo-box { display: flex; align-items: center; gap: 8px; }
.logo-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: linear-gradient(135deg, #ec4899, #fb923c);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 16px;
}
.logo-text { font-size: 20px; font-weight: 700; }
.logo-accent {
  background: linear-gradient(135deg, #ec4899, #a855f7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nav-links { display: flex; align-items: center; gap: 2px; }
.nav-btn {
  padding: 6px 16px; border-radius: 8px;
  background: transparent; border: none;
  font-size: 14px; font-weight: 500; color: #4b5563;
  cursor: pointer; transition: all 0.2s ease;
}
.nav-btn:hover { background: rgba(255,255,255,0.5); }
.nav-btn.nav-active {
  background: rgba(255,255,255,0.8);
  font-weight: 600;
}
/* 导航栏按钮颜色 */
.nav-hover-script:hover, .nav-hover-script.nav-active { color: #ec4899; }
.nav-hover-parse:hover, .nav-hover-parse.nav-active { color: #3b82f6; }
.nav-hover-character:hover, .nav-hover-character.nav-active { color: #22c55e; }
.nav-hover-storyboard:hover, .nav-hover-storyboard.nav-active { color: #f97316; }
.navbar-right { display: flex; align-items: center; gap: 12px; }
.btn-inspire {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 999px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: white; border: none;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(168,85,247,0.3);
}
.btn-inspire:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 20px rgba(168,85,247,0.4);
}
.user-badge {
  display: flex; align-items: center; gap: 10px;
}
.badge-name { font-size: 14px; color: #4b5563; }
.badge-points {
  display: inline-flex; align-items: center; gap: 4px;
  border: 1px solid ;
  padding: 2px 8px; border-radius: 999px;
  background: none;
  color: #6b7280; font-size: 13px; font-weight: 400;
}
.btn-logout {
  background: none; border: none;
  font-size: 13px; color: #9ca3af;
  cursor: pointer; transition: color 0.15s;
}
.btn-logout:hover { color: #ef4444; }
.login-btn {
  font-size: 14px; color: #4b5563;
  margin-left: 0 !important;
}

/* ===== 用户菜单和悬停卡片 ===== */
.user-menu {
  position: relative;
  display: flex;
  align-items: center;
}
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #a855f7);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: transform 0.2s ease;
}
.user-avatar:hover {
  transform: scale(1.08);
}
.user-card {
  position: absolute;
  top: 48px; right: 0;
  width: 320px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.12);
  padding: 20px;
  z-index: 1001;
  animation: cardSlideIn 0.2s ease;
}
@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.user-card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.user-card-name {
  font-size: 16px; font-weight: 600; color: #1f2937;
}
.user-card-logout {
  background: none; border: none;
  font-size: 13px; color: #9ca3af;
  cursor: pointer; transition: color 0.15s;
}
.user-card-logout:hover { color: #ef4444; }
.user-card-points {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: #6b7280;
  margin-bottom: 16px;
}
.user-card-points i {
  color: #ec4899;
}
.user-card-divider {
  height: 1px; background: #f0f0f0;
  margin: 12px 0;
}
.user-card-history-title {
  font-size: 13px; font-weight: 600; color: #374151;
  margin-bottom: 10px;
}
.user-card-empty {
  text-align: center; padding: 20px 0;
  color: #9ca3af; font-size: 13px;
}
.user-card-history-list {
  display: flex; flex-direction: column; gap: 8px;
}
.user-card-history-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 13px;
  transition: background 0.15s;
}
.user-card-history-item:hover {
  background: #f3f4f6;
}
.user-card-history-item.history-failed {
  opacity: 0.6;
}
.user-card-history-item.history-pending{
  opacity: 0.8;
}
.user-card-history-item.history-pending .history-status{
  color: #f59e0b;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.history-tool {
  display: inline-block;
  padding: 2px 8px; border-radius: 6px;
  background: linear-gradient(135deg, #ec4899, #a855f7);
  color: white; font-size: 11px; font-weight: 500;
  white-space: nowrap; flex-shrink: 0;
}
.history-preview {
  color: #4b5563;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1;
}
.history-time {
  color: #9ca3af; font-size: 11px;
  white-space: nowrap; flex-shrink: 0;
}
.user-card-view-all {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #4b5563;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}
.user-card-view-all:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* ===== 历史记录弹窗 ===== */
.history-dialog {
  --el-dialog-border-radius: 20px;
}
.history-dialog-empty {
  text-align: center; padding: 40px 0;
}
.history-dialog-list {
  display: flex; flex-direction: column; gap: 10px;
  max-height: 480px;
  overflow-y: auto;
}
.history-dialog-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f9fafb;
  transition: background 0.15s;
}
.history-dialog-item:hover {
  background: #f3f4f6;
}
.history-dialog-item.history-failed {
  opacity: 0.6;
}
.history-dialog-left {
  display: flex; align-items: center; gap: 12px;
  flex: 1; min-width: 0;
}
.history-dialog-tool {
  display: inline-block;
  padding: 3px 10px; border-radius: 8px;
  background: linear-gradient(135deg, #ec4899, #a855f7);
  color: white; font-size: 12px; font-weight: 500;
  white-space: nowrap; flex-shrink: 0;
}
.history-dialog-preview {
  color: #4b5563; font-size: 14px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.history-dialog-right {
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
}
.history-dialog-status {
  font-size: 12px; font-weight: 500;
  padding: 2px 8px; border-radius: 6px;
}
.status-success {
  background: #dcfce7; color: #16a34a;
}
.status-failed {
  background: #fee2e2; color: #dc2626;
}
.status-pending{
  background: #fef3c7; color: #d97706;
}
.history-dialog-time {
  color: #9ca3af; font-size: 12px;
  white-space: nowrap;
}
.history-dialog-pagination {
  margin-top: 20px;
  display: flex; justify-content: center;
}

/* ===== Hero ===== */
.hero-section {
  padding: 120px 24px 48px;
}
.hero-container {
  max-width: 800px; margin: 0 auto; text-align: center;
}
.hero-title {
  font-size: 52px; font-weight: 800; margin-bottom: 20px;
  line-height: 1.15;
}
@media (max-width: 768px) {
  .hero-title { font-size: 36px; }
}
.gradient-hero {
  background: linear-gradient(135deg, #ec4899, #a855f7, #3b82f6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-subtitle {
  font-size: 18px; color: #6b7280;
  max-width: 600px; margin: 0 auto 16px;
  line-height: 1.7;
}
.login-tip {
  font-size: 14px; color: #9ca3af;
  margin-bottom: 20px;
}
.login-tip i {
  color: #3b82f6;
  margin-right: 4px;
}
.hero-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.btn-start {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 36px; border-radius: 999px;
  background: linear-gradient(135deg, #ec4899, #a855f7);
  color: white; border: none;
  font-size: 16px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 6px 20px rgba(236,72,153,0.3);
}
.btn-start:hover {
  transform: scale(1.04);
  box-shadow: 0 8px 28px rgba(236,72,153,0.4);
}
.btn-tutorial {
  padding: 14px 36px; border-radius: 999px;
  border: 1.5px solid #d1d5db; background: transparent;
  font-size: 16px; font-weight: 500; color: #4b5563;
  cursor: pointer; transition: all 0.2s ease;
}
.btn-tutorial:hover { background: rgba(255,255,255,0.5); }

/* ===== Workspace ===== */
.workspace-section {
  padding: 0 24px 80px;
}
.section-container {
  max-width: 1100px; margin: 0 auto;
}
.workspace-card {
  background: white; border-radius: 24px;
  border: 2px solid transparent;
  padding: 32px; margin-bottom: 32px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* 每个工作台的专属主题色 */
.workspace-script {
  border-color: rgba(236,72,153,0.15);
  box-shadow: 0 10px 25px -5px rgba(236,72,153,0.08);
}
.workspace-script:hover {
  box-shadow: 0 15px 35px -5px rgba(236,72,153,0.15);
  border-color: rgba(236,72,153,0.3);
}
.workspace-parse {
  border-color: rgba(59,130,246,0.15);
  box-shadow: 0 10px 25px -5px rgba(59,130,246,0.08);
}
.workspace-parse:hover {
  box-shadow: 0 15px 35px -5px rgba(59,130,246,0.15);
  border-color: rgba(59,130,246,0.3);
}
.workspace-character {
  border-color: rgba(34,197,94,0.15);
  box-shadow: 0 10px 25px -5px rgba(34,197,94,0.08);
}
.workspace-character:hover {
  box-shadow: 0 15px 35px -5px rgba(34,197,94,0.15);
  border-color: rgba(34,197,94,0.3);
}
.workspace-storyboard {
  border-color: rgba(249,115,22,0.15);
  box-shadow: 0 10px 25px -5px rgba(249,115,22,0.08);
}
.workspace-storyboard:hover {
  box-shadow: 0 15px 35px -5px rgba(249,115,22,0.15);
  border-color: rgba(249,115,22,0.3);
}
.workspace-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}
.ws-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 20px;
}
.ws-icon-script { background: linear-gradient(135deg, #ec4899, #fb923c); }
.ws-icon-parse { background: linear-gradient(135deg, #3b82f6, #22d3ee); }
.ws-icon-character { background: linear-gradient(135deg, #22c55e, #14b8a6); }
.ws-icon-storyboard { background: linear-gradient(135deg, #f97316, #eab308); }
.ws-title {
  font-size: 24px; font-weight: 700; margin: 0;
}
.gradient-script {
  background: linear-gradient(135deg, #ec4899, #fb923c);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gradient-parse {
  background: linear-gradient(135deg, #3b82f6, #22d3ee);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gradient-character {
  background: linear-gradient(135deg, #22c55e, #14b8a6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.gradient-storyboard {
  background: linear-gradient(135deg, #f97316, #eab308);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ws-desc {
  font-size: 14px; color: #9ca3af;
  margin-left: auto;
}
.ws-note {
  font-size: 11px;
  color: #ef4444;
  white-space: nowrap;
  font-weight: 500;
}
.workspace-body {
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== Footer ===== */
.app-footer {
  text-align: center; padding: 32px;
  color: #9ca3af; font-size: 14px;
}

/* ===== 灵感助手对话框 ===== */
.inspire-dialog {
  --el-dialog-border-radius: 20px;
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.dialog-header-gradient {
  font-size: 20px; font-weight: 700;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex; align-items: center; gap: 6px;
}
.dialog-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
  color: #6b7280; cursor: pointer;
  transition: all 0.2s ease;
}
.dialog-close:hover {
  background: #e5e7eb; color: #374151;
}
.inspire-tabs {
  --el-tabs-header-text-color: #6b7280;
  --el-tabs-active-text-color: #ec4899;
  --el-tabs-border-color: #e5e7eb;
}
.search-line {
  display: flex; gap: 10px; align-items: center;
}
.analysis-card {
  margin-top: 16px;
}
.analysis-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.analysis-cell {
  display: flex; flex-direction: column; gap: 4px;
}
.cell-key {
  font-size: 12px; color: #9ca3af;
}
.cell-val {
  font-size: 14px; color: #1f2937; font-weight: 500;
}

/* ===== 响应式优化 ===== */
@media (max-width: 1024px) {
  .nav-links { display: none; }
  .ws-desc { display: none; }
}
@media (max-width: 640px) {
  .user-badge .badge-name { display: none; }
  .user-card { width: 280px; right: -40px; }
  .btn-inspire { padding: 6px 12px; font-size: 12px; }
  .navbar-container { padding: 0 12px; }
  .workspace-card { padding: 20px; }
  .ws-desc { display: none; }
}
</style>