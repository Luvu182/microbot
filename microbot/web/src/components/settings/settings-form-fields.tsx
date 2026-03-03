// Shared form field components for settings tabs — TextInput, SecretInput, Toggle
// TagListInput and SelectInput live in settings-form-fields-composite.tsx
import { useState } from 'react'
export { TagListInput, SelectInput } from './settings-form-fields-composite'

// ---- TextInput ----

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'number'
  helpText?: string
}

export function TextInput({ label, value, onChange, placeholder, disabled, type = 'text', helpText }: TextInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
          px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {helpText && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{helpText}</p>}
    </div>
  )
}

// ---- SecretInput — password field with show/hide + masked value detection ----

interface SecretInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SecretInput({ label, value, onChange, placeholder }: SecretInputProps) {
  const [visible, setVisible] = useState(false)
  const masked = value === '***'

  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={masked ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={masked ? '••• (saved on server)' : placeholder}
          className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            px-3 py-1.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
            dark:hover:text-gray-300 focus:outline-none"
          aria-label={visible ? 'Hide' : 'Show'}
        >
          {visible ? (
            // Eye-off icon
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            // Eye icon
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
      {masked && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          A value is saved. Enter a new value to replace it, or leave empty to keep current.
        </p>
      )}
    </div>
  )
}

// ---- Toggle — on/off switch ----

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
          ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}

