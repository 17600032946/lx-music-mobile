import settingState from '@/store/setting/state'
import { downloadFile, existsFile, mkdir, privateStorageDirectoryPath, unlink } from '@/utils/fs'
import { formatMusicName, toast } from '@/utils/tools'
import { getMusicUrl } from './online'
import { getPlayQuality } from './utils'

const downloadDirectoryPath = `${privateStorageDirectoryPath}/downloads`
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

  let filePath = ''
  try {
    const quality = getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
    const url = await getMusicUrl({ musicInfo, quality, isRefresh: false })
    if (!(await existsFile(downloadDirectoryPath))) await mkdir(downloadDirectoryPath)

    filePath = `${downloadDirectoryPath}/${getFileName(musicInfo, quality, url)}`
    if (await existsFile(filePath)) {
      toast(global.i18n.t('download_already_exists_tip'))
      return
    }

    const { promise } = downloadFile(url, filePath, {
      connectionTimeout: 20000,
      readTimeout: 30000,
    })
    const result = await promise
    if (result.statusCode < 200 || result.statusCode >= 300) throw new Error(`HTTP ${result.statusCode}`)
    toast(global.i18n.t('download_success_tip', { name: musicInfo.name }))
  } catch (error) {
    if (filePath) {
      try {
        if (await existsFile(filePath)) await unlink(filePath)
      } catch (cleanupError) {
        console.warn('Failed to remove incomplete download', cleanupError)
      }
    }
    toast(global.i18n.t('download_failed_tip', { msg: (error as Error).message }), 'long')
  } finally {
    activeDownloads.delete(downloadId)
  }
}
