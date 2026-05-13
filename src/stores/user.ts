import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { d1Api } from '@/api/d1'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userInfo = ref<{
    id: string
    phone: string
    nickname: string
    createdAt: string
  } | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(phone: string, code: string) {
    const res = await d1Api.login(phone, code)
    token.value = res.token
    userInfo.value = res.user
    localStorage.setItem('token', res.token)
    return res
  }

  async function sendCode(phone: string) {
    return await d1Api.sendCode(phone)
  }

  async function register(phone: string, code: string) {
    const res = await d1Api.register(phone, code)
    token.value = res.token
    userInfo.value = res.user
    localStorage.setItem('token', res.token)
    return res
  }

  function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
  }

  async function fetchUserInfo() {
    if (!token.value) return
    const res = await d1Api.getUserInfo(token.value)
    userInfo.value = res
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    sendCode,
    register,
    logout,
    fetchUserInfo
  }
})
