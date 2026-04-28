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
// 导入Vue3组合式API
// ref: 定义响应式数据
// inject: 注入父组件提供的方法（这里用来刷新积分）
import { ref, inject, watch } from 'vue'
// 导入后端剧本生成接口
import { generateScript } from '@/api/script'
// 导入Element Plus消息提示组件
import { ElMessage } from 'element-plus'
import { loadScriptMessages, saveScriptMessages } from '@/utils/storage'

// 从 localStorage 加载历史消息 对话消息历史：保存用户 + AI的对话记录
const messages = ref(loadScriptMessages())

// 监听消息变化自动保存
watch(messages, (newVal) => saveScriptMessages(newVal), { deep: true })

// 输入框中的提示词（用户输入的内容）
const prompt = ref('')

// 加载状态：控制按钮loading，防止重复提交
const loading = ref(false)


// 定义事件抛出：告诉父组件剧本生成完成了
// 父组件可以监听 script-generated 事件拿到生成的剧本
const emit = defineEmits(['script-generated'])

// 注入父组件提供的 刷新积分 方法
// 来自 Home.vue 里的 provide('refreshPoints', refreshPoints)
const refreshPoints = inject('refreshPoints')

// 失败弹窗相关变量
const showErrorModal = ref(false)
const errorMessage = ref('')

/**
 * 发送请求 → 生成剧本
 * 流程：
 * 1. 校验输入是否为空
 * 2. 把用户消息加入历史记录
 * 3. 调用AI接口生成剧本
 * 4. 把AI返回的剧本加入消息历史
 * 5. 通知父组件、刷新积分
 */
const send = async () => {
  // 校验：输入内容不能为空（去掉空格后判断）
  if (!prompt.value.trim()) return

  // 构造用户消息对象
  const userMessage = { role: 'user', content: prompt.value }
  
  // 将用户消息存入对话历史
  messages.value.push(userMessage)

  // 暂存当前提示词，然后清空输入框
  const currentPrompt = prompt.value
  prompt.value = ''

  // 开启加载状态
  loading.value = true

  try {
    // 调用后端API，发送【完整对话历史】给AI
    const res = await generateScript(messages.value)

    // 请求成功（code=200）
    if (res.data.code === 200) {
      // 获取AI返回内容
      let aiContent = res.data.data

      // 兼容格式：
      // 登录时返回对象 { content: "..." }
      // 未登录试用可能直接返回字符串
      if (typeof aiContent === 'object' && aiContent.content !== undefined) {
        aiContent = aiContent.content
      }

      // 构造AI回复消息
      const assistantMessage = { role: 'assistant', content: aiContent }
      
      // 加入对话历史列表
      messages.value.push(assistantMessage)

      // 向父组件抛出事件：剧本生成完成
      emit('script-generated', aiContent)
      // 成功轻提示
      ElMessage.success('剧本生成成功')

      // 调用刷新积分（生成剧本消耗了积分）
      refreshPoints()
    } 
    // 后端返回失败
    else {
      errorMessage.value = res.data.msg || '生成失败，请稍后重试'
      showErrorModal.value = true
      // 失败了 → 把刚才加进去的用户消息删掉
      messages.value.pop()
    }
  } 
  // 网络异常 / 请求失败
  catch (err) {
    errorMessage.value = '生成失败，请检查网络后重试'
    showErrorModal.value = true
    // 同样回退用户消息
    messages.value.pop()
  } 
  // 无论成功失败，最后都会执行
  finally {
    // 关闭加载状态
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