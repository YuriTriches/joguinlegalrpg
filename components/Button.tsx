
import React from 'react';
import { audio } from '../services/audioService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'system';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  disabled,
  onClick,
  onMouseEnter,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 font-rajdhani font-bold uppercase tracking-wider border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-slate-900 border-slate-600 text-slate-200 hover:border-blue-500 hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    danger: "bg-red-950/30 border-red-800 text-red-400 hover:bg-red-900/50 hover:border-red-500 hover:text-red-200",
    success: "bg-emerald-950/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-500",
    system: "bg-blue-950/40 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(37,99,235,0.2)] hover:bg-blue-900/60 hover:shadow-[0_0_15px_rgba(37,99,235,0.6)]"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      audio.playClick();
      if (onClick) onClick(e);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      audio.playHover();
      if (onMouseEnter) onMouseEnter(e);
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </button>
  );
};
