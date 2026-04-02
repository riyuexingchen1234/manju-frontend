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

/**
 * 生成场景图
 * 作用：根据分镜中的场景描述提示词，调用AI绘图接口生成场景图片
 * 生成成功后直接赋值给当前分镜，并刷新用户积分
 * 
 * @param index - 当前分镜在数组中的下标（定位哪一个分镜）
 */
const generateScene = async (index) => {
  // 1. 根据下标获取当前要生成场景的分镜数据
  const story = localStoryboards.value[index]

  // 2. 前端校验：场景提示词不能为空，为空则提示并终止执行
  if (!story.scenePrompt.trim()) return ElMessage.warning('请输入场景提示词')

  // 3. 开启当前分镜的loading状态，防止用户重复点击
  sceneLoading.value[index] = true

  try {
    // 4. 调用后端API，传入场景提示词，请求生成场景图
    const res = await generateSceneApi(story.scenePrompt)

    // 5. 判断接口返回状态：200 表示生成成功
    if (res.data.code === 200) {
      // 6. 取出返回的图片地址（兼容对象/字符串两种格式）
      let imageUrl = res.data.data
      if (typeof imageUrl === 'object' && imageUrl.imageUrl !== undefined) {
        imageUrl = imageUrl.imageUrl
      }

      // 7. 将生成好的图片URL赋值给当前分镜，页面自动渲染
      story.sceneImageUrl = imageUrl

      // 8. 提示用户生成成功
      ElMessage.success('场景图生成成功')

      // 9. 调用注入的方法，刷新用户积分（生成图片消耗积分）
      refreshPoints()
    } else {
      // 10. 后端返回失败，提示错误信息
      ElMessage.error(res.data.msg)
    }
  } catch (err) {
    // 11. 网络异常或请求失败
    ElMessage.error('生成失败')
  } finally {
    // 12. 无论成功失败，最终都会关闭当前分镜的loading状态
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

/**
 * 生成视频函数
 * 作用：根据分镜的关键帧图片和视频提示词，调用后端API发起视频生成任务，并轮询查询任务状态直到完成
 * 流程：
 * 1. 校验前置条件（是否有关键帧、提示词是否为空）
 * 2. 开启加载状态（防止重复点击）
 * 3. 调用后端API创建视频生成任务，获取任务ID
 * 4. 开启定时器轮询查询任务状态（每15秒查一次）
 * 5. 任务成功：赋值视频URL、关闭轮询、提示成功、刷新积分
 * 6. 任务失败：关闭轮询、提示错误
 * @param index 分镜在数组中的索引（用于定位当前是哪个分镜在生成视频）
 */
const generateVideo = async (index) => {
  // 1. 从响应式数组中获取当前分镜的数据
  const story = localStoryboards.value[index]
  // 2. 前置校验1：检查当前分镜是否已生成关键帧图片
  if (!story.keyframeImageUrl) {
    ElMessage.warning('请先生成关键帧') // Element Plus提示组件：警告提示
    return  // 直接返回，不执行后续逻辑
  }
  // 3. 前置校验2：检查视频提示词是否为空（trim()去除首尾空格）
  if (!story.videoPrompt.trim()) {
    ElMessage.warning('请输入视频提示词')
    return
  }
  // 4. 开启当前分镜的加载状态（用于控制按钮loading效果，防止重复点击）
  videoLoading.value[index] = true

   try {
    // 5. 调用后端API：创建视频生成任务
    // 传入参数：关键帧图片URL、视频提示词
    const res = await createVideoTask(story.keyframeImageUrl, story.videoPrompt)
    // 6. 判断任务创建是否成功（后端统一返回code=200表示成功）
    if (res.data.code === 200) {
      // 7. 从返回结果中获取任务ID（后续轮询需要用这个ID查询状态）
      const taskId = res.data.data.taskId
      // 8. 提示用户：视频已开始生成，需要等待
      ElMessage.info('视频生成中，请稍候...')
      // 9. 开启定时器轮询：每15秒（15000毫秒）查询一次任务状态
      const poll = setInterval(async () => {
        try {
          // 10. 调用后端API：根据任务ID查询生成状态
          const result = await queryVideoTask(taskId)
          if (result.data.code === 200) {
            // 11. 获取任务当前状态
            // PENDING（排队中）→ RUNNING（处理中）→ SUCCEEDED（成功）/ FAILED（失败）
            const status = result.data.data.status
            // 12. 状态判断1：任务生成成功
            if (status === 'SUCCEEDED') {
              // 12.1 将生成的视频URL赋值给当前分镜（前端页面会自动显示视频）
              story.videoUrl = result.data.data.videoUrl
              // 12.2 清除定时器（停止轮询，避免无限查询）
              clearInterval(poll)
              // 12.3 提示用户生成成功
              ElMessage.success('视频生成成功')
              // 12.4 关闭当前分镜的加载状态
              videoLoading.value[index] = false
              // 12.5 刷新用户积分（因为生成视频消耗了积分）
              refreshPoints()
              // 13. 状态判断2：任务生成失败
            } else if (status === 'FAILED') {
              // 13.1 清除定时器
              clearInterval(poll)
              // 13.2 提示用户失败原因（从后端返回的error字段获取）
              ElMessage.error('视频生成失败：' + result.data.data.error)
              // 13.3 关闭当前分镜的加载状态
              videoLoading.value[index] = false
            }
            // 14. 其他状态（如PENDING）：不做处理，继续下一次轮询
          }
        } catch (err) {
          // 15. 轮询过程中出错：打印错误日志（不中断轮询，继续尝试）
          console.error('轮询出错', err)
        }
      }, 15000) // 15000毫秒 = 15秒
    } else {
      // 16. 任务创建失败：提示后端返回的错误信息
      ElMessage.error(res.data.msg)
      // 17. 关闭当前分镜的加载状态
      videoLoading.value[index] = false
    }
  } catch (err) {
    // 18. 发起视频生成请求时出错（如网络错误）：提示用户
    ElMessage.error('发起视频生成失败')
    // 19. 关闭当前分镜的加载状态
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