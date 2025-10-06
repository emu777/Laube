import React from 'react';

type SelectInputProps = {
  id: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: (string | number)[];
  required?: boolean;
  autoComplete?: string;
};

const SelectInput = ({ id, label, value, onChange, options, required, autoComplete }: SelectInputProps) => {
  return (
    <div className="space-y-2 relative">
      <label htmlFor={id} className="text-sm font-medium text-gray-400">
        {label}
      </label>
      <select
        id={id}
        value={value || ''}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
        required={required}
      >
        <option value="">選択してください</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};

export default SelectInput;
