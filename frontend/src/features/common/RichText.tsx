import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-react'
import type { ComponentType } from 'react'
import s from './richtext.module.css'

/**
 * Editor de texto rico (TipTap) com barra de ferramentas.
 * O conteúdo é HTML. O pai deve dar `key` (ex.: id do registro) para remontar
 * quando trocar o registro editado.
 */
export function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, Icon: ComponentType<{ size?: number }>, title: string) => (
    <button
      type="button"
      className={`${s.tbBtn} ${active ? s.tbActive : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      <Icon size={15} />
    </button>
  )

  const e: Editor = editor
  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {btn(e.isActive('bold'), () => e.chain().focus().toggleBold().run(), Bold, 'Negrito')}
        {btn(e.isActive('italic'), () => e.chain().focus().toggleItalic().run(), Italic, 'Itálico')}
        {btn(e.isActive('bulletList'), () => e.chain().focus().toggleBulletList().run(), List, 'Lista')}
        {btn(e.isActive('orderedList'), () => e.chain().focus().toggleOrderedList().run(), ListOrdered, 'Lista numerada')}
        <span className={s.tbSep} />
        {btn(false, () => e.chain().focus().undo().run(), Undo, 'Desfazer')}
        {btn(false, () => e.chain().focus().redo().run(), Redo, 'Refazer')}
      </div>
      <EditorContent editor={editor} className={s.editor} />
    </div>
  )
}
