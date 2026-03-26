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
      ElMessage.error(res.data.msg)
    }
  } catch (err) {
    ElMessage.error('拆解失败')
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