import settingState from '@/store/setting/state'
import { formatPlayTime2 } from '@/utils'
import { privateStorageDirectoryPath, readDir, type FileType } from '@/utils/fs'
import { readMetadata, type MusicMetadataFull } from '@/utils/localMediaMetadata'

export interface DownloadedMusic {
  file: FileType
  musicInfo: LX.Music.MusicInfoLocal
}

const privateDownloadDirectoryPath = `${privateStorageDirectoryPath}/downloads`
const audioExtensions = new Set(['mp3', 'flac', 'wav', 'ape', 'ogg', 'm4a', 'aac', 'opus'])
let downloadList: DownloadedMusic[] = []

const buildMusicInfo = (file: FileType, metadata: MusicMetadataFull | null): LX.Music.MusicInfoLocal => {
  const dotIndex = file.name.lastIndexOf('.')
  const extension = dotIndex > -1 ? file.name.substring(dotIndex + 1) : ''
  return {
    id: file.path,
    name: metadata?.name || (dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name),
    singer: metadata?.singer || '',
    source: 'local',
    interval: metadata?.interval ? formatPlayTime2(metadata.interval as number) : null,
    meta: {
      albumName: metadata?.albumName || '',
      filePath: file.path,
      songId: file.path,
      picUrl: '',
      ext: metadata?.ext || extension,
    },
  }
}

export const getDownloadList = (): LX.Music.MusicInfoLocal[] => downloadList.map(({ musicInfo }) => musicInfo)

export const getDownloadedMusic = () => downloadList

export const refreshDownloadList = async(): Promise<DownloadedMusic[]> => {
  const selectedDirectory = settingState.setting['download.savePath']
  const directories = [...new Set([selectedDirectory || privateDownloadDirectoryPath, privateDownloadDirectoryPath])]
  const files = new Map<string, FileType>()
  let selectedDirectoryError: unknown
  for (const directory of directories) {
    try {
      const items = await readDir(directory)
      for (const item of items) {
        const extension = item.name.substring(item.name.lastIndexOf('.') + 1).toLowerCase()
        if (item.isFile && (item.mimeType?.startsWith('audio/') || audioExtensions.has(extension))) files.set(item.path, item)
      }
    } catch (error) {
      if (directory == selectedDirectory) selectedDirectoryError = error
    }
  }
  if (!files.size && selectedDirectoryError) {
    if (selectedDirectoryError instanceof Error) throw selectedDirectoryError
    throw new Error(String(selectedDirectoryError))
  }

  const result = await Promise.all([...files.values()]
    .sort((a, b) => b.lastModified - a.lastModified)
    .map(async(file) => {
      const metadata = await readMetadata(file.path).catch(() => null)
      return { file, musicInfo: buildMusicInfo(file, metadata) }
    }))
  downloadList = result
  return result
}
