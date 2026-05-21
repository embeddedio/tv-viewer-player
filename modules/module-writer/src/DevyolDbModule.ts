import { requireNativeModule } from 'expo-modules-core'
import { MediaEntry } from './DevyolDb.types'

export interface DevyolDbModuleType {
  init(folderName: string): Promise<void>
  getAll(): Promise<MediaEntry[]>
  add(entry: MediaEntry): Promise<void>
  remove(name: string): Promise<void>
  sync(filesOnDisk: string[]): Promise<void>
}

export default requireNativeModule<DevyolDbModuleType>('DevyolDb')
