import { useState, useRef, useEffect } from 'react';

export default function Autocomplete({ options, value, onChange, placeholder, name, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange({ target: { name, value: e.target.value } });
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-40 w-full bg-white border border-slate-200 shadow-lg max-h-60 rounded-lg py-1 mt-1 overflow-auto">
          {filteredOptions.map((opt, idx) => (
            <li
              key={idx}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
              onClick={() => {
                setQuery(opt);
                onChange({ target: { name, value: opt } });
                setIsOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
