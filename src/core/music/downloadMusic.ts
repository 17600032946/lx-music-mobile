import settingState from '@/store/setting/state'
import { downloadFile, existsFile, mkdir, moveFile, privateStorageDirectoryPath, readDir, temporaryDirectoryPath, unlink } from '@/utils/fs'
import { formatMusicName, toast } from '@/utils/tools'
import { getMusicUrl } from './online'
import { getPlayQuality } from './utils'
import { refreshDownloadList } from './downloadList'

const privateDownloadDirectoryPath = `${privateStorageDirectoryPath}/downloads`
const temporaryDownloadDirectoryPath = `${temporaryDirectoryPath}/downloads`
const activeDownloads = new Set<string>()

const getFileExtension = (url: string, quality: LX.Quality) => {
  const extension = url.match(/\.(mp3|flac|wav|ape)(?:[?#]|$)/i)?.[1]
  if (extension) return extension.toLowerCase()
  return ['flac', 'flac24bit', 'ape', 'wav'].includes(quality) ? quality.replace('flac24bit', 'flac') : 'mp3'
}

const getFileName = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality, url: string) => {
  const title = formatMusicName(settingState.setting['download.fileName'], musicInfo.name, musicInfo.singer)
    .split('').map(char => /[\\/:*?"<>|]/.test(char) || char.charCodeAt(0) < 32 ? '_' : char).join('')
    .replace(/[. ]+$/g, '')
  return `${title || musicInfo.id}.${getFileExtension(url, quality)}`
}

export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const downloadId = `${musicInfo.source}_${musicInfo.id}`
  if (activeDownloads.has(downloadId)) {
    toast(global.i18n.t('download_in_progress_tip'))
    return
  }
  activeDownloads.add(downloadId)

  let tempFilePath = ''
  try {
    const quality = getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
    const url = await getMusicUrl({ musicInfo, quality, isRefresh: false })
    const downloadDirectoryPath = settingState.setting['download.savePath'] || privateDownloadDirectoryPath
    if (downloadDirectoryPath == privateDownloadDirectoryPath && !(await existsFile(downloadDirectoryPath))) await mkdir(downloadDirectoryPath)

    const fileName = getFileName(musicInfo, quality, url)
    if ((await readDir(downloadDirectoryPath)).some(file => file.isFile && file.name == fileName)) {
      toast(global.i18n.t('download_already_exists_tip'))
      return
    }

    if (!(await existsFile(temporaryDownloadDirectoryPath))) await mkdir(temporaryDownloadDirectoryPath)
    tempFilePath = `${temporaryDownloadDirectoryPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${getFileExtension(url, quality)}`

    const { promise } = downloadFile(url, tempFilePath, {
      connectionTimeout: 20000,
      readTimeout: 30000,
    })
    const result = await promise
    if (result.statusCode < 200 || result.statusCode >= 300) throw new Error(`HTTP ${result.statusCode}`)
    await moveFile(tempFilePath, `${downloadDirectoryPath}/${fileName}`)
    tempFilePath = ''
    await refreshDownloadList().catch((error) => {
      console.warn('Failed to refresh download list', error)
    })
    global.app_event.downloadListUpdate()
    toast(global.i18n.t('download_success_tip', { name: musicInfo.name }))
  } catch (error) {
    if (tempFilePath) {
      try {
        if (await existsFile(tempFilePath)) await unlink(tempFilePath)
      } catch (cleanupError) {
        console.warn('Failed to remove incomplete download', cleanupError)
      }
    }
    toast(global.i18n.t('download_failed_tip', { msg: (error as Error).message }), 'long')
  } finally {
    activeDownloads.delete(downloadId)
  }
}
