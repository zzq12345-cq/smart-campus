import '@/polyfills/appwrite-uni'

import restClient, {
  account as accountRest,
  config as configRest,
  functions as functionsRest,
  storage as storageRest,
  tablesDB as tablesDBRest
} from '@/utils/appwrite-rest'
import sdkClient, {
  account as accountSdk,
  config as configSdk,
  functions as functionsSdk,
  storage as storageSdk,
  tablesDB as tablesDBSdk
} from '@/utils/appwrite-sdk'

export const isMpWeixinRuntime = (() => {
  try {
    const info = uni.getSystemInfoSync?.()
    if (info?.uniPlatform === 'mp-weixin') {
      return true
    }
  } catch {
    // ignore
  }
  return false
})()

const runtimeClient = isMpWeixinRuntime ? restClient : sdkClient
const runtimeAccount = isMpWeixinRuntime ? accountRest : accountSdk
const runtimeTablesDB = isMpWeixinRuntime ? tablesDBRest : tablesDBSdk
const runtimeStorage = isMpWeixinRuntime ? storageRest : storageSdk
const runtimeFunctions = isMpWeixinRuntime ? functionsRest : functionsSdk
const runtimeConfig = isMpWeixinRuntime ? configRest : configSdk

export const client = runtimeClient
export const account = runtimeAccount
export const tablesDB = runtimeTablesDB
export const storage = runtimeStorage
export const functions = runtimeFunctions
export const config = runtimeConfig

export default runtimeClient
