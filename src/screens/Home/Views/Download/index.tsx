import { useCallback, useEffect, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { playList } from '@/core/player/player'
import { getDownloadedMusic, refreshDownloadList, type DownloadedMusic } from '@/core/music/downloadList'
import { LIST_IDS } from '@/config/constant'
import { useI18n } from '@/lang'
import { sizeFormate } from '@/utils'
import { confirmDialog, toast } from '@/utils/tools'
import { unlink } from '@/utils/fs'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo } from '@/store/player/hook'

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const playMusicInfo = usePlayMusicInfo()
  const [list, setList] = useState<DownloadedMusic[]>(getDownloadedMusic())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async() => {
    setRefreshing(true)
    try {
      setList(await refreshDownloadList())
    } catch (error) {
      toast(t('download_list_load_failed', { msg: (error as Error).message }), 'long')
    } finally {
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    void refresh()
    const handleDownloadListUpdate = () => {
      setList(getDownloadedMusic())
    }
    const handleConfigUpdated: typeof global.state_event.configUpdated = (keys) => {
      if (keys.includes('download.savePath')) void refresh()
    }
    global.app_event.on('downloadListUpdate', handleDownloadListUpdate)
    global.state_event.on('configUpdated', handleConfigUpdated)
    return () => {
      global.app_event.off('downloadListUpdate', handleDownloadListUpdate)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [refresh])

  const handleRemove = async(item: DownloadedMusic) => {
    const confirmed = await confirmDialog({
      message: t('download_remove_confirm_tip', { name: item.musicInfo.name }),
      confirmButtonText: t('delete'),
    })
    if (!confirmed) return
    try {
      await unlink(item.file.path)
      const updatedList = await refreshDownloadList()
      setList(updatedList)
      global.app_event.downloadListUpdate()
      toast(t('download_remove_success_tip'))
    } catch (error) {
      toast(t('download_remove_failed_tip', { msg: (error as Error).message }), 'long')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size={18}>{t('download_list_title')}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => { void refresh() }} accessibilityLabel={t('download_refresh')}>
          <Text size={13} color={theme['c-primary-font-active']}>{t('download_refresh')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={list}
        keyExtractor={item => item.file.path}
        renderItem={({ item, index }) => {
          const isActive = playMusicInfo.listId == LIST_IDS.DOWNLOAD && playMusicInfo.musicInfo?.id == item.musicInfo.id
          return (
            <View style={[styles.row, { borderBottomColor: theme['c-border-background'] }]}>
              <TouchableOpacity style={styles.song} onPress={() => { void playList(LIST_IDS.DOWNLOAD, index) }}>
                <Text numberOfLines={1} color={isActive ? theme['c-primary-font-active'] : theme['c-font']}>{item.musicInfo.name}</Text>
                <Text numberOfLines={1} size={12} color={theme['c-500']}>
                  {[item.musicInfo.singer, sizeFormate(item.file.size)].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => { void handleRemove(item) }} accessibilityLabel={t('download_remove')}>
                <Text size={13} color={theme['c-500']}>{t('download_remove')}</Text>
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text color={theme['c-500']}>{t('download_list_empty')}</Text>
          </View>
        )}
        refreshing={refreshing}
        onRefresh={() => { void refresh() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    minHeight: 44,
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  song: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingRight: 10,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
