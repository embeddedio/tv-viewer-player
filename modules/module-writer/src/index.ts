import DevyolDbNative from './DevyolDbModule'
import { MediaEntry } from './DevyolDb.types'

export type { MediaEntry }

/**
 * Initialise le module avec le nom du dossier (ex: "Devyol").
 * Le chemin est résolu via Environment.DIRECTORY_DOCUMENTS côté Android.
 * Crée le dossier et db.json s'ils n'existent pas encore.
 * Doit être appelé avant toute autre méthode.
 */
export async function init(folderName: string): Promise<void> {
  return DevyolDbNative.init(folderName)
}

/**
 * Retourne la liste complète des médias enregistrés dans db.json.
 */
export async function getAll(): Promise<MediaEntry[]> {
  return DevyolDbNative.getAll()
}

/**
 * Ajoute un média dans db.json.
 * Ignoré silencieusement si un média avec le même nom existe déjà.
 */
export async function add(entry: MediaEntry): Promise<void> {
  return DevyolDbNative.add(entry)
}

/**
 * Supprime un média de db.json par son nom de fichier.
 */
export async function remove(name: string): Promise<void> {
  return DevyolDbNative.remove(name)
}

/**
 * Synchronise db.json avec la liste réelle des fichiers sur le disque :
 * - supprime les entrées dont le fichier n'existe plus
 * - ajoute les fichiers présents sur disque mais absents du JSON
 */
export async function sync(filesOnDisk: string[]): Promise<void> {
  return DevyolDbNative.sync(filesOnDisk)
}
