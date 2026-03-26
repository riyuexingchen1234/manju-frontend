<template>
  <div class="script-workspace">
    <!-- 历史消息列表（目前仅展示最近一次对话） -->
    <div v-if="messages.length" class="messages">
      <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
        <div class="content">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <el-input
        v-model="prompt"
        type="textarea"
        :rows="4"
        placeholder="请输入你的创意想法..."
        @keydown.ctrl.enter="send"
      />
      <el-button type="primary" @click="send" :loading="loading" style="margin-top: 10px">
        发送 5分
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref,inject } from 'vue'
import { generateScript } from '@/api/script'
import { ElMessage } from 'element-plus'

const prompt = ref('')
const loading = ref(false)
const messages = ref([])

const emit = defineEmits(['script-generated'])
const refreshPoints = inject('refreshPoints')

const send = async () => {
  if (!prompt.value.trim()) return

  // 添加用户消息到历史
  const userMessage = { role: 'user', content: prompt.value }
  messages.value.push(userMessage)
  const currentPrompt = prompt.value
  prompt.value = '' // 清空输入框

  loading.value = true
  try {
    // 发送历史消息数组（不含系统指令）
    const res = await generateScript(messages.value)
    // 兼容不同返回格式：登录时返回对象 { content: "..." }，未登录返回字符串
    if (res.data.code === 200) {
      let aiContent = res.data.data;
      if (typeof aiContent === 'object' && aiContent.content !== undefined) {
        aiContent = aiContent.content;
      }
      const assistantMessage = { role: 'assistant', content: aiContent }
      messages.value.push(assistantMessage)
      emit('script-generated', aiContent)
      refreshPoints() // 刷新积分
    } else {
      ElMessage.error(res.data.msg)
      // 移除刚才添加的用户消息
      messages.value.pop()
    }
  } catch (err) {
    ElMessage.error('生成失败')
    messages.value.pop()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.script-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.messages {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.message {
  margin-bottom: 16px;
}

.message.user {
  text-align: right;
}

.message.assistant {
  text-align: left;
}

.message .content {
  display: inline-block;
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  background: #e9ecef;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message.user .content {
  background: #409eff;
  color: white;
}

.input-area {
  width: 100%;
}
</style>