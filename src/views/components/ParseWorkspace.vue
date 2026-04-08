<template>
  <div class="parse-workspace">
    <div class="input-area">
      <el-input
        v-model="script"
        type="textarea"
        :rows="6"
        placeholder="请粘贴你的单集剧本正文..."
        @keydown.ctrl.enter="parse"
      />
      <el-button type="primary" @click="parse" :loading="loading" style="margin-top: 10px">
        拆解剧本 5分
      </el-button>
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
        <div style="text-align: right;">
          <el-button type="primary" @click="showErrorModal = false">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { parseScript } from '@/api/script'
import { ElMessage } from 'element-plus'

const script = ref('')
const loading = ref(false)
const emit = defineEmits(['parsed'])
const refreshPoints = inject('refreshPoints')

// 失败弹窗相关变量
const showErrorModal = ref(false)
const errorMessage = ref('')

const parse = async () => {
  if (!script.value.trim()) return
  loading.value = true
  try {
    const res = await parseScript(script.value)
    if (res.data.code === 200) {
      emit('parsed', res.data.data)
      ElMessage.success('拆解成功')
      refreshPoints()
    } else {
      errorMessage.value = res.data.msg || '拆解失败，请稍后重试'
      showErrorModal.value = true
    }
  } catch (err) {
    errorMessage.value = '拆解失败，请检查网络后重试'
    showErrorModal.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.parse-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.input-area {
  width: 100%;
}
</style>