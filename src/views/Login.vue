<template>
  <div class="login-page">
    <div class="logo-section">
      <div class="logo">
        <span class="logo-text">DiviPool</span>
        <span class="logo-sub">聚息</span>
      </div>
      <p class="tagline">让分红一目了然</p>
    </div>

    <div class="form-section">
      <van-field
        v-model="phone"
        type="tel"
        maxlength="11"
        placeholder="请输入手机号"
        :border="false"
        class="gold-input"
      >
        <template #left-icon>
          <span class="prefix">+86</span>
        </template>
      </van-field>

      <van-field
        v-model="code"
        type="digit"
        maxlength="6"
        placeholder="请输入验证码"
        :border="false"
        class="gold-input"
      >
        <template #button>
          <van-button
            size="small"
            type="primary"
            :disabled="countdown > 0"
            @click="handleSendCode"
            class="code-btn"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </van-button>
        </template>
      </van-field>

      <van-button
        type="primary"
        block
        :loading="loading"
        @click="handleLogin"
        class="login-btn"
      >
        登录 / 注册
      </van-button>
    </div>

    <div class="tips">
      <p>登录即表示同意<span class="gold-text">《用户协议》</span></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const phone = ref('')
const code = ref('')
const loading = ref(false)
const countdown = ref(0)
let countdownTimer: number | null = null

async function handleSendCode() {
  if (!phone.value || phone.value.length !== 11) {
    showToast('请输入正确的手机号')
    return
  }
  
  try {
    await userStore.sendCode(phone.value)
    showToast('验证码已发送')
    countdown.value = 60
    countdownTimer = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (e: any) {
    showToast(e.message || '发送失败')
  }
}

async function handleLogin() {
  if (!phone.value || phone.value.length !== 11) {
    showToast('请输入正确的手机号')
    return
  }
  if (!code.value || code.value.length !== 6) {
    showToast('请输入6位验证码')
    return
  }

  loading.value = true
  try {
    await userStore.login(phone.value, code.value)
    showToast('登录成功')
    router.replace('/home')
  } catch (e: any) {
    showToast(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--bg-primary) 0%, #1a1a1a 100%);
  padding: 80px 32px 40px;
  display: flex;
  flex-direction: column;
}

.logo-section {
  text-align: center;
  margin-bottom: 60px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.logo-text {
  font-size: 36px;
  font-weight: bold;
  background: linear-gradient(135deg, var(--gold-light), var(--gold-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-sub {
  font-size: 24px;
  color: var(--gold-primary);
  font-weight: 500;
}

.tagline {
  color: var(--text-secondary);
  font-size: 14px;
}

.form-section {
  flex: 1;
}

.gold-input {
  background: var(--bg-card) !important;
  border: 1px solid var(--border-color) !important;
  border-radius: 12px !important;
  margin-bottom: 16px;
  --van-field__input-text-color: var(--text-primary);
  --van-field__placeholder-text-color: var(--text-muted);
}

.prefix {
  color: var(--gold-primary);
  font-weight: 500;
  margin-right: 8px;
}

.code-btn {
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
  font-weight: 600;
  border-radius: 6px;
}

.login-btn {
  margin-top: 32px;
  background: linear-gradient(135deg, var(--gold-light), var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
  font-size: 16px;
  font-weight: 600;
  height: 48px;
  border-radius: 24px;
}

.tips {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 24px;
}
</style>
