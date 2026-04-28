<template>
  <div class="character-workspace">
    <div class="character-grid">
      <el-card
        v-for="(char, idx) in props.characters"
        :key="char.id || idx"
        class="character-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <el-input
              :value="char.name"
              @input="updateCharacter(idx, 'name', $event)"
              placeholder="角色名"
              size="small"
              style="width: 120px"
            />
            <el-button
              type="danger"
              size="small"
              icon="Delete"
              circle
              @click="removeCharacter(idx)"
            />
          </div>
        </template>

        <div class="card-content">
          <!-- 图片展示区 -->
          <div class="image-area">
            <el-image
              v-if="props.characterImages[char.name]"
              :src="props.characterImages[char.name]"
              :preview-src-list="[props.characterImages[char.name]]"  
              fit="cover"
              class="character-image"
            />
            <div v-else class="image-placeholder">
              <el-icon><Picture /></el-icon>
              <span>未生成</span>
            </div>
          </div>

          <!-- 提示词输入框 -->
          <el-input
            :value="char.characterPrompt"
            @input="updateCharacter(idx, 'characterPrompt', $event)"
            type="textarea"
            :rows="4"
            placeholder="请输入角色提示词"
            class="prompt-input"
          />

          <!-- 按钮组 -->
          <div class="button-group">
            <!-- 上传角色图按钮 -->
            <el-upload
              class="upload-btn"
              :show-file-list="false"
              :http-request="(options) => handleCustomUpload(char, options)"
            >
              <el-button size="small" type="default">上传角色图</el-button>
            </el-upload>
            <!-- 生成角色图按钮 -->
            <el-button
              type="primary"
              @click="generateCharacterImage(char, idx)"
              :loading="loadingStates[char.name]"
              size="small"
            >
              生成角色图 10分
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 添加新角色卡片 -->
      <el-card class="character-card add-card" shadow="hover" @click="addCharacter">
        <div class="add-content">
          <el-icon :size="40"><Plus /></el-icon>
          <span>添加新角色</span>
        </div>
      </el-card>
    </div>
    <!-- 失败提示弹窗（必须手动关闭） -->
     <el-dialog
      v-model="showErrorModal"
      title="操作失败"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div style="font-size: 14px; padding: 10px 0;">
        {{ errorMessage }}
      </div>
      <template #footer>
        <el-button type="primary" @click="showErrorModal = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, inject,onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { generateCharacter } from '@/api/character'

const props = defineProps({
  characters: Array,    // 从父组件接收角色列表
  characterImages: Object,
})
const emit = defineEmits(['character-generated','update-characters'])

// ========== 确保至少有一个有效角色卡片 ==========
const ensureAtLeastOneCharacter = () => {
  if (!props.characters || props.characters.length === 0) {
    emit('update-characters', [{ name: '', characterPrompt: '' }])
  } else {
    const hasInvalid = props.characters.some(c => c.name === undefined || c.characterPrompt === undefined)
    if (hasInvalid) {
      const valid = props.characters.filter(c => c.name !== undefined && c.characterPrompt !== undefined)
      if (valid.length === 0) {
        emit('update-characters', [{ name: '', characterPrompt: '' }])
      } else {
        emit('update-characters', valid)
      }
    }
  }
}
watch(() => props.characters, ensureAtLeastOneCharacter, { immediate: true, deep: true })
onMounted(ensureAtLeastOneCharacter)

const refreshPoints = inject('refreshPoints')
// 加载状态
const loadingStates = ref({})
// 失败弹窗相关变量
const showErrorModal = ref(false)
const errorMessage = ref('')

// 更新角色字段
const updateCharacter = (index, field, value) => {
  const newList = [...props.characters]
  newList[index] = { ...newList[index], [field]: value }
  emit('update-characters', newList)
}

// 添加新角色
const addCharacter = () => {
  const newName = `新角色${props.characters.length + 1}`
  const newCharacter = { name: newName, characterPrompt: '' }
  const newList = [...props.characters, newCharacter]
  emit('update-characters', newList)
}

// 删除角色
const removeCharacter = (index) => {
  const newList = [...props.characters]
  newList.splice(index, 1)
  if (newList.length === 0) {
    // 保持至少一个空白角色卡片
    newList.push({ name: '', characterPrompt: '' })
  }
  emit('update-characters', newList)
}

/**
 * 生成角色形象图片
 * 作用：根据角色名称 + 角色描述提示词，调用后端AI绘图接口生成角色图
 * 生成成功后通知父组件更新页面，并刷新用户积分
 *
 * @param char - 当前角色对象（包含 name 角色名、characterPrompt 角色提示词）
 */
const generateCharacterImage = async (char, index) => {
  // 前端校验1：角色名称不能为空
  if (!char.name.trim()) {
    errorMessage.value = '请输入角色名'
    showErrorModal.value = true
    return
  }

  // 前端校验2：角色提示词不能为空（AI绘图必须有描述）
  if (!char.characterPrompt.trim()) {
    errorMessage.value = '请输入角色提示词'
    showErrorModal.value = true
    return
  }

  // 开启当前角色的加载状态（防止重复点击生成按钮）
  // 使用 char.name 作为 key，保证每个角色独立 loading
  loadingStates.value[char.name] = true

  try {
    // 调用后端接口：传入角色名 + 角色提示词，请求AI生成图片
    const res = await generateCharacter(char.name, char.characterPrompt)

    // 判断后端返回状态：200 表示生成成功
    if (res.data.code === 200) {
      // 获取返回的图片地址
      let imageUrl = res.data.data

      // 兼容返回格式：
      // 如果返回的是对象 { imageUrl: "xxx" }，则取出 imageUrl
      // 如果直接返回字符串，则直接使用
      if (typeof imageUrl === 'object' && imageUrl.imageUrl !== undefined) {
        imageUrl = imageUrl.imageUrl
      }

      // 向父组件抛出事件：传递角色名 + 生成好的图片地址
      emit('character-generated', { name: char.name, imageUrl })

      // 提示用户生成成功
      ElMessage.success(`角色 ${char.name} 角色图生成成功`)

      // 刷新用户积分（生成图片消耗积分）
      refreshPoints()
    } else {
      // 后端返回失败：提示错误信息
      errorMessage.value = res.data.msg || '生成失败，请稍后重试'
      showErrorModal.value = true
    }
  } catch (err) {
    // 网络异常 / 请求失败：弹出强制弹窗
    errorMessage.value = '生成失败，请检查网络后重试'
    showErrorModal.value = true
  } finally {
    // 无论成功/失败，最终都会关闭当前角色的加载状态
    loadingStates.value[char.name] = false
  }
}

// 临时上传处理（生成 blob URL，仅用于演示）
const handleCustomUpload = (char, options) => {
  const file = options.file
  if (!file) return
  if (!char.name.trim()) {
    ElMessage.warning('请先填写角色名')
    return
  }
  const blobUrl = URL.createObjectURL(file)
  emit('character-generated', { name: char.name, imageUrl: blobUrl })
  ElMessage.success(`角色 ${char.name} 图片已临时加载，刷新后失效`)
  refreshPoints()
}
//  后端真实接口
// const handleCustomUpload = async (char, options) => {
//   const file = options.file
//   const formData = new FormData()
//   formData.append('file', file)
//   // 假设后端接口为 /api/upload/image
//   const res = await fetch('/api/upload/image', {
//     method: 'POST',
//     body: formData,
//     headers: { Authorization: 'Bearer ...' }
//   })
//   const data = await res.json()
//   if (data.code === 200) {
//     emit('character-generated', { name: char.name, imageUrl: data.data.url })
//     ElMessage.success(`角色 ${char.name} 图片上传成功`)
//   } else {
//     ElMessage.error('上传失败')
//   }
// }

</script>

<style scoped>
.character-workspace {
  padding: 10px 0;
}
.character-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.character-card {
  width: 250px;
  margin-bottom: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.image-area {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.character-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #999;
}
.prompt-input {
  width: 100%;
}
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.upload-btn {
  display: inline-block;
}
.button-group .upload-btn,
.button-group .el-button {
  flex: 1;
  min-width: 0; /* 防止溢出 */
}
.add-card {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}
.add-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #409eff;
}
</style>