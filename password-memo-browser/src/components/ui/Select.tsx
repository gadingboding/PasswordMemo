import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Select...', className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 text-slate-400" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-slate-600 bg-slate-800 shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-white outline-none hover:bg-slate-700"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}