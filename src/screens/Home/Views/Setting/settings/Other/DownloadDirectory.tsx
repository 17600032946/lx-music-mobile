import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { selectManagedFolder } from '@/utils/fs'
import { toast } from '@/utils/tools'

const getDirectoryName = (path: string) => {
  const lastSegment = path.split('/').at(-1) ?? path
  try {
    const decoded = decodeURIComponent(lastSegment)
    return decoded.split(':').at(-1) ?? decoded
  } catch {
    return lastSegment
  }
}

export default memo(() => {
  const t = useI18n()
  const savePath = useSettingValue('download.savePath')

  const handleSelect = async() => {
    try {
      const directory = await selectManagedFolder(true)
      if (!directory?.isDirectory) return
      updateSetting({ 'download.savePath': directory.path })
    } catch (error) {
      toast(t('setting_download_directory_select_failed', { msg: (error as Error).message }), 'long')
    }
  }

  return (
    <SubTitle title={t('setting_download_directory')}>
      <Text style={styles.current} numberOfLines={2}>
        {t('setting_download_directory_current', {
          path: savePath ? getDirectoryName(savePath) : t('setting_download_directory_default'),
        })}
      </Text>
      <View style={styles.buttons}>
        <Button onPress={() => { void handleSelect() }}>{t('setting_download_directory_choose')}</Button>
        {savePath ? <Button onPress={() => { updateSetting({ 'download.savePath': '' }) }}>{t('setting_download_directory_reset')}</Button> : null}
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  current: {
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
  },
})
