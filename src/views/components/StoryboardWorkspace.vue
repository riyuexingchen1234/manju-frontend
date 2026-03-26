<template>
  <div class="storyboard-workspace">
    <!-- 工具栏 -->
    <div class="storyboard-toolbar">
      
      <div class="actions">
        <el-button type="primary" @click="previewAllVideos" :disabled="!hasVideos">
          预览所有子视频
        </el-button>
        <el-button type="success" @click="downloadAllVideos" :disabled="!hasVideos">
          合并下载
        </el-button>
      </div>
    </div>

    <!-- 分镜列表 -->
    <div class="storyboard-list">
      <el-card
        v-for="(story, idx) in localStoryboards"
        :key="story.id"
        class="storyboard-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <span>分镜 {{ idx + 1 }}</span>
            <el-button
              type="danger"
              size="small"
              icon="Delete"
              circle
              @click="removeStoryboard(idx)"
            />
          </div>
        </template>

        <div class="card-content">
          <!-- 分镜描述 -->
          <div class="block">
            <div class="block-title">分镜描述</div>
            <el-input
              v-model="story.description"
              type="textarea"
              :rows="6"
              placeholder="分镜描述"
            />
          </div>

          <!-- 涉及角色 -->
          <div class="block">
            <div class="block-title">涉及角色</div>
            <el-select
              v-model="story.characters"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或创建角色"
            >
              <el-option
                v-for="(url, name) in characterImages"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
          </div>

          <!-- 场景生成 -->
          <div class="block">
            <div class="block-title">场景图</div>
            <div class="image-box">
              <el-image
                v-if="story.sceneImageUrl" 
                :src="story.sceneImageUrl" 
                :preview-src-list="[story.sceneImageUrl]"
                fit="cover"
                class="block-image" />
              <div v-else class="image-placeholder">未生成</div>
            </div>
            <el-input
              v-model="story.scenePrompt"
              type="textarea"
              :rows="6"
              placeholder="场景提示词"
              class="prompt-input"
            />
            <div class="button-group">
              <el-upload
                class="upload-btn"
                :show-file-list="false"
                :http-request="(options) => handleSceneUpload(idx, options)"
              >
                <el-button size="small" type="default">上传场景图</el-button>
              </el-upload>
              <el-button
                type="primary"
                @click="generateScene(idx)"
                :loading="sceneLoading[idx]"
                size="small"
              >
                生成场景图 10分
              </el-button>
            </div>
          </div>

          <!-- 关键帧生成 -->
          <div class="block">
            <div class="block-title">关键帧</div>
            <div class="image-box">
              <el-image
               v-if="story.keyframeImageUrl" 
               :src="story.keyframeImageUrl" 
               :preview-src-list="[story.keyframeImageUrl]"
               fit="cover"
               class="block-image" />
              <div v-else class="image-placeholder">未生成</div>
            </div>
            <el-input
              v-model="story.keyframePrompt"
              type="textarea"
              :rows="6"
              placeholder="关键帧提示词"
              class="prompt-input"
            />
            <el-button
              type="primary"
              @click="generateKeyframe(idx)"
              :loading="keyframeLoading[idx]"
              size="small"
              :disabled="!story.sceneImageUrl || story.characters.length === 0"
            >
              生成关键帧 10分
            </el-button>
            <div class="hint" v-if="!story.sceneImageUrl || story.characters.length === 0">
              需场景图+角色
            </div>
          </div>

          <!-- 视频生成 -->
          <div class="block">
            <div class="block-title">视频</div>
            <div class="image-box">
              <video v-if="story.videoUrl" controls style="width:100%; height:100%;">
                <source :src="story.videoUrl" type="video/mp4" />
              </video>
              <div v-else class="image-placeholder">未生成</div>
            </div>
            <el-input
              v-model="story.videoPrompt"
              type="textarea"
              :rows="6"
              placeholder="视频提示词（描述镜头运动、动态等）"
              class="prompt-input"
            />
            <div class="button-group">
              <!-- 新增：上传测试视频按钮，v-if=false隐藏测试按钮 -->
              <el-upload

              v-if="false"     
                class="upload-btn"
                :show-file-list="false"
                :http-request="(options) => handleVideoUpload(idx, options)"
              >
                <el-button size="small" type="default">上传测试视频</el-button>
              </el-upload>
              <el-button
                type="primary"
                @click="generateVideo(idx)"
                :loading="videoLoading[idx]"
                size="small"
                :disabled="!story.keyframeImageUrl || !story.videoPrompt.trim()"
              >
                生成视频 20分
              </el-button>
            </div>
            <div class="hint" v-if="!story.keyframeImageUrl">
              需先有关键帧
            </div>
            <div class="hint" v-else-if="!story.videoPrompt.trim()">
              请输入视频提示词
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="add-button-container">
      <el-button type="primary" @click="addStoryboard" class="add-storyboard-btn">添加分镜</el-button>
    </div>

    <!-- 视频预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="视频预览"
      width="25%"
      :close-on-click-modal="false"
      @close="stopPreview"
    >
      <video
        ref="previewPlayerRef"
        controls
        style="width: 100%; height: auto;"
      ></video>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick } from 'vue'
import { ref, computed, watch, inject } from 'vue'  // 补全 watch 导入
import { ElMessage } from 'element-plus'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateScene as generateSceneApi } from '@/api/scene'
import { generateKeyframe as generateKeyframeApi } from '@/api/keyframe'
import { createVideoTask, queryVideoTask } from '@/api/video'

const props = defineProps({
  storyboards: { type: Array, default: () => [] },
  characterImages: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['keyframe-generated', 'video-generated'])
const refreshPoints = inject('refreshPoints')

const localStoryboards = ref([])
const sceneLoading = ref({})
const keyframeLoading = ref({})
const videoLoading = ref({})
const playerRef = ref(null)  // 预览播放器 ref

const generateId = () => Date.now() + '-' + Math.random().toString(36).substr(2, 6)

const initFromProps = () => {
  if (props.storyboards?.length) {
    localStoryboards.value = props.storyboards.map(s => ({
      id: generateId(),
      description: s.description || '',
      characters: s.characters || [],
      scenePrompt: s.scenePrompt || '',
      sceneImageUrl: '',
      keyframePrompt: s.detailedDescription || '',
      keyframeImageUrl: '',
      videoPrompt: s.videoPrompt || s.detailedDescription || '',
      videoUrl: ''
    }))
  } else {
    localStoryboards.value = [{
      id: generateId(),
      description: '',
      characters: [],
      scenePrompt: '',
      sceneImageUrl: '',
      keyframePrompt: '',
      keyframeImageUrl: '',
      videoPrompt: '',
      videoUrl: ''
    }]
  }
}

const addStoryboard = () => {
  localStoryboards.value.push({
    id: generateId(),
    description: '',
    characters: [],
    scenePrompt: '',
    sceneImageUrl: '',
    keyframePrompt: '',
    keyframeImageUrl: '',
    videoPrompt: '',
    videoUrl: ''
  })
  setTimeout(() => {
    const lastCard = document.querySelector('.storyboard-card:last-child')
    lastCard?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

const removeStoryboard = (index) => {
  localStoryboards.value.splice(index, 1)
  if (localStoryboards.value.length === 0) addStoryboard()
}

// 上传场景图（临时）
const handleSceneUpload = (index, options) => {
  const file = options.file
  if (!file) return
  const blobUrl = URL.createObjectURL(file)
  localStoryboards.value[index].sceneImageUrl = blobUrl
  ElMessage.success('场景图已临时加载，刷新后失效')
  refreshPoints()
}

// 生成场景图
const generateScene = async (index) => {
  const story = localStoryboards.value[index]
  if (!story.scenePrompt.trim()) return ElMessage.warning('请输入场景提示词')
  sceneLoading.value[index] = true
  try {
    const res = await generateSceneApi(story.scenePrompt)
    if (res.data.code === 200) {
      let imageUrl = res.data.data;
      if (typeof imageUrl === 'object' && imageUrl.imageUrl !== undefined) {
        imageUrl = imageUrl.imageUrl;
      }
      story.sceneImageUrl = imageUrl
      ElMessage.success('场景图生成成功')
      refreshPoints()
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (err) {
    ElMessage.error('生成失败')
  } finally {
    sceneLoading.value[index] = false
  }
}

// 生成关键帧
const generateKeyframe = async (index) => {
  const story = localStoryboards.value[index]
  if (!story.keyframePrompt.trim()) return ElMessage.warning('请输入关键帧提示词')
  if (!story.characters.length) return ElMessage.warning('请至少选择一个角色')
  if (!story.sceneImageUrl) return ElMessage.warning('请先生成场景图')
  const firstCharacter = story.characters[0]
  const characterImageUrl = props.characterImages[firstCharacter]
  if (!characterImageUrl) return ElMessage.warning(`角色 ${firstCharacter} 尚未生成图片`)

  keyframeLoading.value[index] = true
  try {
    const res = await generateKeyframeApi(story.keyframePrompt, characterImageUrl, story.sceneImageUrl)
    if (res.data.code === 200) {
      let imageUrl = res.data.data;
      if (typeof imageUrl === 'object' && imageUrl.imageUrl !== undefined) {
        imageUrl = imageUrl.imageUrl;
      }
      story.keyframeImageUrl = imageUrl
      ElMessage.success('关键帧生成成功')
      emit('keyframe-generated', { index, imageUrl: story.keyframeImageUrl })
      refreshPoints()
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (err) {
    ElMessage.error('生成失败')
  } finally {
    keyframeLoading.value[index] = false
  }
}

// 上传测试视频（仅用于本地测试，不调用后端）
const handleVideoUpload = (index, options) => {
  const file = options.file
  if (!file) return
  if (!file.type.startsWith('video/')) {
    ElMessage.error('请选择视频文件')
    return
  }
  // 创建临时 URL
  const blobUrl = URL.createObjectURL(file)
  // 更新当前分镜的视频 URL
  localStoryboards.value[index].videoUrl = blobUrl
  ElMessage.success('测试视频已加载（刷新页面后失效）')
}

// 生成视频
const generateVideo = async (index) => {
  const story = localStoryboards.value[index]
  if (!story.keyframeImageUrl) {
    ElMessage.warning('请先生成关键帧')
    return
  }
  if (!story.videoPrompt.trim()) {
    ElMessage.warning('请输入视频提示词')
    return
  }
  videoLoading.value[index] = true

   try {
    const res = await createVideoTask(story.keyframeImageUrl, story.videoPrompt)
    if (res.data.code === 200) {
      const taskId = res.data.data.taskId
      ElMessage.info('视频生成中，请稍候...')
      const poll = setInterval(async () => {
        try {
          const result = await queryVideoTask(taskId)
          if (result.data.code === 200) {
            const status = result.data.data.status
            if (status === 'SUCCEEDED') {
              story.videoUrl = result.data.data.videoUrl
              clearInterval(poll)
              ElMessage.success('视频生成成功')
              videoLoading.value[index] = false
              // 刷新积分
              refreshPoints()
            } else if (status === 'FAILED') {
              clearInterval(poll)
              ElMessage.error('视频生成失败：' + result.data.data.error)
              videoLoading.value[index] = false
            }
          }
        } catch (err) {
          console.error('轮询出错', err)
        }
      }, 15000)
    } else {
      ElMessage.error(res.data.msg)
      videoLoading.value[index] = false
    }
  } catch (err) {
    ElMessage.error('发起视频生成失败')
    videoLoading.value[index] = false
  }
}

// 预览所有视频
const hasVideos = computed(() => localStoryboards.value.some(s => s.videoUrl))

// 预览相关变量
const previewDialogVisible = ref(false)
const previewPlayerRef = ref(null)
let previewIndex = 0
let previewVideoList = []
let isPreviewing = false   // 防止重复调用

// 停止预览
const stopPreview = () => {
  if (previewPlayerRef.value) {
    previewPlayerRef.value.pause()
    previewPlayerRef.value.src = ''
    // 移除事件监听，避免残留
    previewPlayerRef.value.onended = null
    previewPlayerRef.value.onerror = null
  }
  previewDialogVisible.value = false
  isPreviewing = false
}

// 播放单个视频
const playPreviewVideo = () => {
  if (!previewPlayerRef.value) {
    // 如果播放器还没渲染，等待一下
    setTimeout(playPreviewVideo, 100)
    return
  }
  if (previewIndex >= previewVideoList.length) {
    stopPreview()
    ElMessage.success('播放完成')
    return
  }
  const currentUrl = previewVideoList[previewIndex]
  previewPlayerRef.value.src = currentUrl
  previewPlayerRef.value.play()
  previewPlayerRef.value.onended = () => {
    previewIndex++
    playPreviewVideo()
  }
  previewPlayerRef.value.onerror = () => {
    ElMessage.error(`视频 ${previewIndex+1} 加载失败，跳过`)
    previewIndex++
    playPreviewVideo()
  }
}

// 预览所有视频
const previewAllVideos = async () => {
  // 防止重复调用
  if (isPreviewing) {
    ElMessage.warning('正在播放中，请稍后')
    return
  }
  const videoUrls = localStoryboards.value.map(s => s.videoUrl).filter(Boolean)
  if (!videoUrls.length) {
    ElMessage.warning('暂无视频可预览')
    return
  }
  // 如果已有对话框打开，先关闭
  if (previewDialogVisible.value) {
    stopPreview()
    await nextTick()
  }
  previewVideoList = videoUrls
  previewIndex = 0
  previewDialogVisible.value = true
  isPreviewing = true
  // 等待 DOM 更新，确保播放器元素存在
  await nextTick()
  playPreviewVideo()
}

// 下载所有视频
const downloadAllVideos = async () => {
  const videoItems = localStoryboards.value
    .map((s, idx) => ({ url: s.videoUrl, idx }))
    .filter(item => item.url)
  if (!videoItems.length) return ElMessage.warning('没有可下载的视频')

  const zip = new JSZip()
  let successCount = 0
  for (const item of videoItems) {
    try {
      const res = await fetch(item.url)
      if (!res.ok) throw new Error('下载失败')
      const blob = await res.blob()
      zip.file(`分镜${item.idx+1}_视频.mp4`, blob)
      successCount++
    } catch (err) {
      console.error(`下载分镜${item.idx+1}视频失败:`, err)
      ElMessage.warning(`分镜${item.idx+1}视频下载失败，已跳过`)
    }
  }
  if (successCount === 0) return ElMessage.warning('没有成功下载任何视频')
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `漫剧分镜视频_${Date.now()}.zip`)
  ElMessage.success(`已打包 ${successCount} 个视频文件`)
}

watch(() => props.storyboards, initFromProps, { immediate: true, deep: true })
initFromProps()
</script>

<style scoped>
.storyboard-workspace {
  width: 100%;
}
.storyboard-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.storyboard-card {
  width: 100%;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-content {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
}
.block {
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.block-title {
  font-weight: 500;
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}
.image-box {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.block-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-placeholder {
  color: #999;
  font-size: 12px;
}
.prompt-input {
  margin-bottom: 4px;
}
.hint {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 4px;
}
.add-button-container {
  margin-top: 20px;
  text-align: center;
}
.add-storyboard-btn{
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.button-group .upload-btn,
.button-group .el-button {
  flex: 1;
  min-width: 0;
}
</style>