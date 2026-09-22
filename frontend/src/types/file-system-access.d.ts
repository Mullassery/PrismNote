// Ambient types for the File System Access API entry points
// (`window.showDirectoryPicker` / `showOpenFilePicker` / `showSaveFilePicker`).
//
// TypeScript's bundled `lib.dom.d.ts` already ships `FileSystemDirectoryHandle`,
// `FileSystemFileHandle`, and `FileSystemWritableFileStream`, but not yet these
// three global entry-point functions (still marked experimental / not part of
// the stable DOM spec snapshot TS vendors). This is the minimal surface
// `hooks/useWorkspace.ts` actually calls — not a full re-implementation of the
// spec (e.g. `FileSystemHandlePermissionDescriptor` and the `id`/`startIn`
// picker options are intentionally omitted since nothing here uses them).

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite'
}

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[]
  multiple?: boolean
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface Window {
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>
}
